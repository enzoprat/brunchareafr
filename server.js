/* ============================================================
   BRUNCH AREA — Backend Click & Collect
   ------------------------------------------------------------
   - Sert le site statique (index.html, styles.css, script.js, images)
   - Reçoit les commandes du site         : POST /api/orders
   - Imprime sur l'Epson TM-m30III via     : POST /print
     (Server Direct Print : c'est l'imprimante qui vient
      chercher les commandes, elle "sort" vers ce serveur,
      donc pas besoin d'ouvrir de port sur la box du resto)
   - Page de suivi des commandes           : GET  /admin?key=...
   ============================================================ */

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 4399;

/* --- Réglages (surchargables par variables d'environnement) --- */
const SHOP = {
  name: 'BRUNCH AREA',
  addr1: '20 Avenue Jean Cordier',
  addr2: '33600 Pessac',
  phone: '06 71 57 32 72'
};
const DEV_ID    = process.env.DEV_ID || 'local_printer'; // device de l'imprimante (défaut Epson)
const ADMIN_KEY = process.env.ADMIN_KEY || '';            // protège /admin (vide = ouvert)
const ASCII_ONLY = process.env.ASCII_ONLY === '1';        // 1 = retire les accents du ticket (sécurité thermique)
const LINE_WIDTH = 42;                                     // colonnes 80 mm (police A)

/* ============================================================
   File d'impression (en mémoire)
   ============================================================ */
let jobSeq = 0;
const queue = [];          // jobs en attente d'impression : {id, xml, order}
const printing = {};       // jobs envoyés à l'imprimante, en attente de confirmation : id -> job
const recent = [];         // historique récent (pour /admin), max 50

function pushRecent(order, status) {
  recent.unshift({ order: order, status: status, at: new Date().toISOString() });
  if (recent.length > 50) recent.pop();
}

/* ============================================================
   Outils texte / ticket
   ============================================================ */
function xmlEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function deburr(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function clean(s) {
  s = String(s == null ? '' : s);
  return ASCII_ONLY ? deburr(s) : s;
}
function money(n) {
  // '€' n'est pas fiable sur toutes les imprimantes thermiques -> 'EUR'
  return Number(n || 0).toFixed(2).replace('.', ',') + ' EUR';
}
function twoCols(left, right) {
  left = String(left); right = String(right);
  let gap = LINE_WIDTH - left.length - right.length;
  if (gap < 1) { left = left.slice(0, LINE_WIDTH - right.length - 1); gap = 1; }
  return left + ' '.repeat(gap) + right;
}
function divider() { return '-'.repeat(LINE_WIDTH); }

/* Construit le document ePOS-Print (ce que l'imprimante sait lire) */
function buildEpos(order) {
  const created = new Date(order.createdAt || Date.now())
    .toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  let b = '';
  b += '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">';

  // En-tête
  b += '<text align="center"/>';
  b += '<text dw="true" dh="true" em="true">' + xmlEsc(clean(SHOP.name)) + '\n</text>';
  b += '<text dw="false" dh="false" em="false"/>';
  b += '<text>' + xmlEsc(clean(SHOP.addr1)) + '\n' + xmlEsc(clean(SHOP.addr2)) + '\nTel ' + xmlEsc(SHOP.phone) + '\n</text>';
  b += '<feed line="1"/>';

  // Bandeau
  b += '<text reverse="true" em="true"> CLICK &amp; COLLECT \n</text>';
  b += '<text reverse="false" em="false"/>';
  b += '<feed line="1"/>';

  // Numéro + retrait (gros)
  b += '<text dw="true" dh="true" em="true">' + xmlEsc(clean(order.number)) + '\n</text>';
  b += '<text dw="false" dh="false" em="false"/>';
  b += '<text em="true">RETRAIT\n' + xmlEsc(clean((order.pickupLabel || '').toUpperCase())) + '\n</text>';
  b += '<text em="false"/>';
  b += '<feed line="1"/>';

  // Détails client
  b += '<text align="left"/>';
  const cust = order.customer || {};
  b += '<text>Client : ' + xmlEsc(clean(cust.first)) + '\nTel : ' + xmlEsc(clean(cust.phone)) +
       '\nCommande le ' + xmlEsc(created) + '\n</text>';
  b += '<text>' + divider() + '\n</text>';

  // Articles
  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach(function (it) {
    const left = (it.qty || 1) + ' x ' + clean(it.name);
    const right = money((it.qty || 1) * (it.price || 0));
    b += '<text>' + xmlEsc(twoCols(left, right)) + '\n</text>';
  });

  b += '<text>' + divider() + '\n</text>';
  b += '<text dw="true" em="true">' + xmlEsc(twoCols('TOTAL', money(order.total))) + '\n</text>';
  b += '<text dw="false" em="false">Paiement : SUR PLACE\n</text>';

  // Note éventuelle
  if (order.note) {
    b += '<feed line="1"/>';
    b += '<text em="true">** NOTE **\n</text>';
    b += '<text em="false">' + xmlEsc(clean(order.note)) + '\n</text>';
  }

  // Pied + coupe
  b += '<feed line="1"/>';
  b += '<text align="center">Merci et a tout de suite !\n</text>';
  b += '<feed line="2"/>';
  b += '<cut type="feed"/>';
  b += '</epos-print>';
  return b;
}

/* Réponse Server Direct Print : avec un job à imprimer */
function sdpWithJob(job) {
  return '<?xml version="1.0" encoding="utf-8"?>' +
    '<PrintRequestInfo>' +
      '<ePOSPrint>' +
        '<Parameter>' +
          '<devid>' + DEV_ID + '</devid>' +
          '<timeout>60000</timeout>' +
          '<printjobid>' + job.id + '</printjobid>' +
        '</Parameter>' +
        '<PrintData>' + job.xml + '</PrintData>' +
      '</ePOSPrint>' +
    '</PrintRequestInfo>';
}
/* Réponse Server Direct Print : rien à imprimer */
function sdpNoJob() {
  return '<?xml version="1.0" encoding="utf-8"?>' +
    '<PrintRequestInfo>' +
      '<ePOSPrint>' +
        '<Parameter>' +
          '<devid>' + DEV_ID + '</devid>' +
          '<timeout>60000</timeout>' +
          '<printjobid></printjobid>' +
        '</Parameter>' +
      '</ePOSPrint>' +
    '</PrintRequestInfo>';
}

/* ============================================================
   API : le site envoie une commande
   ============================================================ */
app.post('/api/orders', express.json({ limit: '256kb' }), function (req, res) {
  const order = req.body || {};
  if (!order.number || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ ok: false, error: 'Commande invalide' });
  }
  if (!order.createdAt) order.createdAt = new Date().toISOString();

  const job = { id: 'JOB_' + (++jobSeq), xml: buildEpos(order), order: order, at: Date.now() };
  queue.push(job);
  pushRecent(order, 'en file');
  console.log('[ORDER] %s — %s — %d article(s) — file: %d',
    order.number, (order.customer && order.customer.first) || '?', order.items.length, queue.length);

  res.json({ ok: true, number: order.number, queued: queue.length });
});

/* ============================================================
   Server Direct Print : l'imprimante interroge ce point
   ============================================================ */
app.post('/print', express.text({ type: function () { return true; }, limit: '1mb' }), function (req, res) {
  const body = req.body || '';

  // L'imprimante confirme le job précédent (printjobid + success)
  const idMatch = /<printjobid>\s*([^<\s]+)\s*<\/printjobid>/i.exec(body);
  const okMatch = /success="(true|false)"/i.exec(body);
  if (idMatch && printing[idMatch[1]]) {
    const done = printing[idMatch[1]];
    delete printing[idMatch[1]];
    const success = !okMatch || okMatch[1] === 'true';
    if (success) {
      pushRecent(done.order, 'imprimé');
      console.log('[PRINT] OK   %s (%s)', done.order.number, done.id);
    } else {
      queue.unshift(done); // échec -> on remet en tête de file
      pushRecent(done.order, 'échec, ré-essai');
      console.log('[PRINT] FAIL %s (%s) -> remis en file', done.order.number, done.id);
    }
  }

  // Filet de sécurité : un job "en cours" depuis trop longtemps (>2 min) = on le remet en file
  const now = Date.now();
  Object.keys(printing).forEach(function (k) {
    if (now - printing[k].sentAt > 120000) {
      const stuck = printing[k]; delete printing[k];
      queue.unshift(stuck);
      console.log('[PRINT] timeout %s -> remis en file', stuck.order.number);
    }
  });

  res.set('Content-Type', 'text/xml; charset=utf-8');

  // Prochain job à imprimer ?
  const next = queue.shift();
  if (!next) return res.send(sdpNoJob());

  next.sentAt = Date.now();
  printing[next.id] = next;
  console.log('[PRINT] ->   %s (%s) envoyé à l\'imprimante', next.order.number, next.id);
  res.send(sdpWithJob(next));
});

/* ============================================================
   Admin : suivi + ticket de test
   ============================================================ */
function adminAuth(req, res) {
  if (ADMIN_KEY && req.query.key !== ADMIN_KEY) {
    res.status(401).send('Clé invalide. Ajoutez ?key=VOTRE_CLE');
    return false;
  }
  return true;
}

app.get('/admin', function (req, res) {
  if (!adminAuth(req, res)) return;
  const rows = recent.map(function (r) {
    const o = r.order;
    return '<tr><td>' + r.at.slice(11, 16) + '</td><td><b>' + xmlEsc(o.number) + '</b></td>' +
      '<td>' + xmlEsc((o.customer && o.customer.first) || '') + '</td>' +
      '<td>' + xmlEsc(o.pickupLabel || '') + '</td>' +
      '<td>' + xmlEsc(money(o.total)) + '</td>' +
      '<td>' + xmlEsc(r.status) + '</td></tr>';
  }).join('');
  res.send('<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Brunch Area — Commandes</title><style>' +
    'body{font-family:system-ui,sans-serif;margin:20px;color:#1a1a2e}' +
    'h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:14px}' +
    'th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f0fa}' +
    'button{font-size:15px;padding:10px 16px;border:0;border-radius:8px;background:#6c4ad6;color:#fff;cursor:pointer}' +
    '.muted{color:#888}</style></head><body>' +
    '<h1>Commandes — ' + xmlEsc(SHOP.name) + '</h1>' +
    '<p><button onclick="t()">Imprimer un ticket de test</button> ' +
    '<span class="muted">File en attente : ' + queue.length + '</span></p>' +
    '<table><tr><th>Heure</th><th>N°</th><th>Client</th><th>Retrait</th><th>Total</th><th>Statut</th></tr>' +
    (rows || '<tr><td colspan="6" class="muted">Aucune commande pour le moment.</td></tr>') +
    '</table>' +
    '<script>function t(){var k=new URLSearchParams(location.search).get("key")||"";' +
    'fetch("/api/test-print"+(k?"?key="+encodeURIComponent(k):""),{method:"POST"})' +
    '.then(r=>r.json()).then(()=>{alert("Ticket de test envoye. Il sortira de votre imprimante dans quelques secondes.");})' +
    '.catch(()=>alert("Erreur."));}</script>' +
    '</body></html>');
});

app.post('/api/test-print', function (req, res) {
  if (!adminAuth(req, res)) return;
  const order = {
    number: 'TEST-' + Date.now().toString().slice(-4),
    createdAt: new Date().toISOString(),
    pickupLabel: 'ticket de test',
    customer: { first: 'Test', phone: '—' },
    items: [{ name: 'Pancakes test', qty: 1, price: 0 }],
    total: 0,
    note: 'Ceci est un ticket de test.'
  };
  const job = { id: 'JOB_' + (++jobSeq), xml: buildEpos(order), order: order, at: Date.now() };
  queue.push(job);
  pushRecent(order, 'test en file');
  res.json({ ok: true });
});

/* ============================================================
   Site statique (index.html, styles.css, script.js, images…)
   ============================================================ */
app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, function () {
  console.log('Brunch Area en ligne sur le port ' + PORT);
  console.log(' - Site          : /');
  console.log(' - Commandes     : POST /api/orders');
  console.log(' - Imprimante    : POST /print   (URL Server Direct Print)');
  console.log(' - Suivi         : GET  /admin' + (ADMIN_KEY ? '?key=…' : ''));
});
