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
const webpush = require('web-push');
const store = require('./store');

const app = express();
const PORT = process.env.PORT || 4399;

/* --- CORS : autorise le site (bruncharea.fr / Vercel) à appeler ce backend --- */
const ALLOWED_ORIGINS = [
  'https://bruncharea.fr',
  'https://www.bruncharea.fr'
];
app.use(function (req, res, next) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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
const MAX_ATTEMPTS = 2;                                     // nb max d'impressions d'un même job (anti-boucle)

/* --- Email de réservation (via Brevo — gratuit 300 mails/jour) --- */
const MAIL = {
  apiKey:    process.env.BREVO_API_KEY || '',   // clé API Brevo (sinon email désactivé)
  fromEmail: process.env.MAIL_FROM || '',        // expéditeur vérifié dans Brevo
  fromName:  process.env.MAIL_FROM_NAME || SHOP.name,
  bcc:       process.env.MAIL_BCC || ''          // copie au resto (optionnel)
};

/* --- Notifications Web Push (badge sur l'icône, gratuit) --- */
const VAPID = {
  publicKey:  process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject:    process.env.VAPID_SUBJECT || 'mailto:' + (process.env.MAIL_FROM || 'contact@bruncharea.fr')
};
const PUSH_ENABLED = !!(VAPID.publicKey && VAPID.privateKey);
if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID.subject, VAPID.publicKey, VAPID.privateKey);
} else {
  console.warn('[PUSH] non configuré (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absents) — notifications désactivées');
}

/* Envoie une notification push à tous les appareils abonnés.
   Incrémente le compteur "non vus" pour la pastille de l'icône. */
async function pushNotify(title, body) {
  if (!PUSH_ENABLED) return;
  const badge = store.bumpBadge(1);
  const subs = store.listPushSubs();
  if (!subs.length) return;
  const payload = JSON.stringify({ title: title, body: body, badge: badge, url: '/admin' });
  await Promise.all(subs.map(function (sub) {
    return webpush.sendNotification(sub, payload).catch(function (err) {
      // 404/410 = abonnement expiré -> on le retire
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        store.removePushSub(sub.endpoint);
        console.log('[PUSH] abonnement expiré retiré');
      } else {
        console.error('[PUSH] échec envoi : %s', (err && err.message) || err);
      }
    });
  }));
}

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
    .toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

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

/* Construit le ticket de RÉSERVATION de table */
function buildEposReservation(resa) {
  const created = new Date(resa.createdAt || Date.now())
    .toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cust = resa.customer || {};

  let b = '';
  b += '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">';

  // En-tête
  b += '<text align="center"/>';
  b += '<text dw="true" dh="true" em="true">' + xmlEsc(clean(SHOP.name)) + '\n</text>';
  b += '<text dw="false" dh="false" em="false"/>';
  b += '<text>' + xmlEsc(clean(SHOP.addr1)) + '\n' + xmlEsc(clean(SHOP.addr2)) + '\nTel ' + xmlEsc(SHOP.phone) + '\n</text>';
  b += '<feed line="1"/>';

  // Bandeau
  b += '<text reverse="true" em="true"> DEMANDE A CONFIRMER \n</text>';
  b += '<text reverse="false" em="false"/>';
  b += '<feed line="1"/>';

  // Couverts + horaire (gros)
  b += '<text dw="true" dh="true" em="true">' + xmlEsc(clean((resa.people || 1) + ' COUV.')) + '\n</text>';
  b += '<text dw="false" dh="false" em="false"/>';
  b += '<text em="true">' + xmlEsc(clean((resa.whenLabel || '').toUpperCase())) + '\n</text>';
  b += '<text em="false"/>';
  b += '<feed line="1"/>';

  // Détails client
  b += '<text align="left"/>';
  b += '<text>Client : ' + xmlEsc(clean(cust.first)) + '\nTel : ' + xmlEsc(clean(cust.phone)) +
       (cust.email ? '\nEmail : ' + xmlEsc(clean(cust.email)) : '') +
       '\nDemande le ' + xmlEsc(created) + '\nRef : ' + xmlEsc(clean(resa.ref)) + '\n</text>';

  // Note éventuelle
  if (resa.note) {
    b += '<text>' + divider() + '\n</text>';
    b += '<text em="true">** NOTE **\n</text>';
    b += '<text em="false">' + xmlEsc(clean(resa.note)) + '\n</text>';
  }

  // Pied + coupe
  b += '<feed line="1"/>';
  b += '<text align="center" em="true">A confirmer ou refuser\ndepuis le tableau de bord\n</text>';
  b += '<text em="false"/>';
  b += '<feed line="2"/>';
  b += '<cut type="feed"/>';
  b += '</epos-print>';
  return b;
}

/* ============================================================
   Email de réservation au client (confirmation / refus)
   ============================================================ */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function reservationEmailContent(resa, decision) {
  const confirmed = decision === 'confirm';
  const first = resa.customer && resa.customer.first ? resa.customer.first : '';
  const people = (resa.people || 1) + ' couvert' + ((resa.people || 1) > 1 ? 's' : '');
  const when = resa.whenLabel || '';
  const subject = confirmed
    ? 'Votre réservation chez ' + SHOP.name + ' est confirmée'
    : 'Votre demande de réservation chez ' + SHOP.name;

  const intro = confirmed
    ? 'Bonne nouvelle ! Nous avons le plaisir de <strong>confirmer votre réservation</strong>.'
    : 'Nous vous remercions pour votre demande, mais nous ne pouvons malheureusement <strong>pas y donner suite</strong> pour ce créneau (complet). N\'hésitez pas à retenter un autre horaire ou à nous appeler.';
  const introTxt = confirmed
    ? 'Bonne nouvelle ! Nous confirmons votre reservation.'
    : 'Nous ne pouvons malheureusement pas donner suite a votre demande pour ce creneau (complet). N\'hesitez pas a retenter un autre horaire ou a nous appeler.';

  const html =
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e">' +
      '<div style="background:#6c4ad6;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0">' +
        '<h1 style="margin:0;font-size:20px;letter-spacing:.5px">' + escHtml(SHOP.name) + '</h1></div>' +
      '<div style="background:#f6f4fb;padding:24px;border-radius:0 0 14px 14px">' +
        '<p>Bonjour ' + escHtml(first) + ',</p>' +
        '<p>' + intro + '</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border-radius:10px;overflow:hidden">' +
          '<tr><td style="padding:10px 14px;color:#666">Personnes</td><td style="padding:10px 14px;text-align:right;font-weight:700">' + escHtml(people) + '</td></tr>' +
          '<tr><td style="padding:10px 14px;color:#666;border-top:1px solid #eee">Créneau</td><td style="padding:10px 14px;text-align:right;font-weight:700;border-top:1px solid #eee">' + escHtml(when) + '</td></tr>' +
          '<tr><td style="padding:10px 14px;color:#666;border-top:1px solid #eee">Référence</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #eee">' + escHtml(resa.ref) + '</td></tr>' +
        '</table>' +
        (confirmed ? '<p>Nous vous attendons au ' + escHtml(SHOP.addr1) + ', ' + escHtml(SHOP.addr2) + '. À très vite !</p>' : '') +
        '<p style="color:#666;font-size:13px;margin-top:20px">' + escHtml(SHOP.name) + ' · ' + escHtml(SHOP.addr1) + ', ' + escHtml(SHOP.addr2) + ' · ' + escHtml(SHOP.phone) + '</p>' +
      '</div></div>';

  const text =
    'Bonjour ' + first + ',\n\n' + introTxt + '\n\n' +
    'Personnes : ' + people + '\nCreneau : ' + when + '\nReference : ' + resa.ref + '\n\n' +
    SHOP.name + ' - ' + SHOP.addr1 + ', ' + SHOP.addr2 + ' - ' + SHOP.phone + '\n';

  return { subject: subject, html: html, text: text };
}

async function sendReservationEmail(resa, decision) {
  const to = resa.customer && resa.customer.email;
  if (!to) return { ok: false, error: 'pas d\'email client' };
  if (!MAIL.apiKey || !MAIL.fromEmail) {
    console.warn('[MAIL] non configuré (BREVO_API_KEY / MAIL_FROM absents) — email non envoyé');
    return { ok: false, skipped: true };
  }
  const c = reservationEmailContent(resa, decision);
  const payload = {
    sender: { name: MAIL.fromName, email: MAIL.fromEmail },
    to: [{ email: to, name: (resa.customer && resa.customer.first) || '' }],
    subject: c.subject, htmlContent: c.html, textContent: c.text
  };
  if (MAIL.bcc) payload.bcc = [{ email: MAIL.bcc }];

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': MAIL.apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('[MAIL] échec %d — %s', r.status, t.slice(0, 300));
      return { ok: false, error: 'HTTP ' + r.status };
    }
    console.log('[MAIL] %s envoyé à %s (%s)', decision, to, resa.ref);
    return { ok: true };
  } catch (e) {
    console.error('[MAIL] erreur réseau —', e.message);
    return { ok: false, error: e.message };
  }
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
  store.addOrder(order);
  console.log('[ORDER] %s — %s — %d article(s) — file: %d',
    order.number, (order.customer && order.customer.first) || '?', order.items.length, queue.length);

  const who = (order.customer && order.customer.first) || 'Client';
  pushNotify('Nouvelle commande', who + ' · ' + order.items.length + ' article' + (order.items.length > 1 ? 's' : '') + ' · ' + money(order.total));

  res.json({ ok: true, number: order.number, queued: queue.length });
});

/* ============================================================
   API : le site envoie une réservation de table
   ============================================================ */
app.post('/api/reservations', express.json({ limit: '64kb' }), function (req, res) {
  const r = req.body || {};
  const people = parseInt(r.people, 10);
  const email = (r.customer && r.customer.email || '').toString().trim();
  if (!r.ref || !r.when || !r.customer || !r.customer.first || !r.customer.phone ||
      !email || !/.+@.+\..+/.test(email) || !(people >= 1 && people <= 30)) {
    return res.status(400).json({ ok: false, error: 'Réservation invalide' });
  }
  const resa = {
    ref: String(r.ref),
    createdAt: r.createdAt || new Date().toISOString(),
    when: String(r.when),
    whenLabel: String(r.whenLabel || ''),
    people: people,
    customer: { first: String(r.customer.first).trim(), phone: String(r.customer.phone).trim(), email: email },
    note: (r.note || '').toString().trim(),
    status: 'pending'
  };

  const job = { id: 'JOB_' + (++jobSeq), xml: buildEposReservation(resa), order: resaAsRecent(resa), at: Date.now() };
  queue.push(job);
  pushRecent(resaAsRecent(resa), 'résa en file');
  store.addReservation(resa);
  console.log('[RESA] %s — %s — %d couv. — %s', resa.ref, resa.customer.first, resa.people, resa.whenLabel);

  pushNotify('Demande de réservation', resa.customer.first + ' · ' + resa.people + ' couv. · ' + (resa.whenLabel || ''));

  res.json({ ok: true, ref: resa.ref, queued: queue.length });
});

/* Adapte une résa au format utilisé par pushRecent/affichage */
function resaAsRecent(resa) {
  return {
    number: resa.ref,
    customer: resa.customer,
    pickupLabel: resa.people + ' couv. · ' + resa.whenLabel,
    total: 0
  };
}

/* ============================================================
   Server Direct Print : l'imprimante interroge ce point
   ============================================================ */
app.post('/print', express.text({ type: function () { return true; }, limit: '1mb' }), function (req, res) {
  const body = req.body || '';

  // L'imprimante confirme le job précédent.
  // Le printjobid peut arriver en BALISE <printjobid>X</printjobid>
  // OU en ATTRIBUT printjobid="X" selon le firmware -> on lit les deux.
  let jobId = null;
  let m = /<printjobid>\s*([^<\s]+)\s*<\/printjobid>/i.exec(body);
  if (m) jobId = m[1];
  else { m = /printjobid\s*=\s*"([^"]+)"/i.exec(body); if (m) jobId = m[1]; }

  // Échec réel seulement si l'imprimante le dit EXPLICITEMENT (success="false").
  const explicitFail = /success\s*=\s*"false"/i.test(body);

  if (jobId && printing[jobId]) {
    const done = printing[jobId];
    delete printing[jobId];
    if (explicitFail && (done.attempts || 1) < MAX_ATTEMPTS) {
      queue.unshift(done); // échec déclaré -> un seul ré-essai
      pushRecent(done.order, 'échec, ré-essai');
      console.log('[PRINT] FAIL %s (%s) -> ré-essai %d', done.order.number, done.id, (done.attempts || 1) + 1);
    } else if (explicitFail) {
      pushRecent(done.order, 'échec (abandon)');
      console.log('[PRINT] FAIL définitif %s (%s) -> abandon', done.order.number, done.id);
    } else {
      pushRecent(done.order, 'imprimé');
      console.log('[PRINT] OK   %s (%s)', done.order.number, done.id);
    }
  }

  // Filet de sécurité : un job "en cours" sans confirmation depuis >90 s
  // est considéré comme imprimé (on N'en refait PAS sortir un autre,
  // pour éviter toute boucle d'impression).
  const now = Date.now();
  Object.keys(printing).forEach(function (k) {
    if (now - printing[k].sentAt > 90000) {
      const stuck = printing[k]; delete printing[k];
      pushRecent(stuck.order, 'envoyé (sans confirmation)');
      console.log('[PRINT] timeout %s -> considéré imprimé (pas de ré-essai)', stuck.order.number);
    }
  });

  res.set('Content-Type', 'text/xml; charset=utf-8');

  // Prochain job à imprimer ?
  const next = queue.shift();
  if (!next) return res.send(sdpNoJob());

  next.attempts = (next.attempts || 0) + 1;
  next.sentAt = Date.now();
  printing[next.id] = next;
  console.log('[PRINT] ->   %s (%s) envoyé à l\'imprimante (tentative %d)', next.order.number, next.id, next.attempts);
  res.send(sdpWithJob(next));
});

/* ============================================================
   Admin : suivi + ticket de test
   ============================================================ */
function adminAuth(req, res) {
  if (!ADMIN_KEY) return true;                 // pas de clé configurée -> ouvert (dev local)
  if (req.query.key === ADMIN_KEY) return true; // secours : ?key=… (liens existants)

  // Authentification par fenêtre de connexion native du navigateur (HTTP Basic).
  // Le mot de passe = ADMIN_KEY ; l'identifiant est libre (ex. "brunch").
  const header = req.headers.authorization || '';
  if (header.indexOf('Basic ') === 0) {
    let decoded = '';
    try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch (e) { decoded = ''; }
    const pass = decoded.slice(decoded.indexOf(':') + 1);
    if (pass === ADMIN_KEY) return true;
  }

  res.set('WWW-Authenticate', 'Basic realm="Brunch Area admin", charset="UTF-8"');
  res.status(401).send('Accès réservé. Identifiez-vous.');
  return false;
}

// Les heures de service (pickupAt / when) sont des heures "murales" Paris
// au format "AAAA-MM-JJTHH:MM" (sans fuseau). On les lit telles quelles pour
// éviter tout décalage quand le serveur tourne en UTC (Render). Le fallback
// r.at est un vrai ISO UTC -> converti vers Paris.
function isWall(iso) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso); }

/* Formate en heure (ex. "12h30") */
function frTime(iso) {
  if (isWall(iso)) return iso.slice(11, 16).replace(':', 'h');
  return new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}
/* Clé de jour (AAAA-MM-JJ) */
function dayKey(iso) {
  if (isWall(iso)) return iso.slice(0, 10);
  return new Date(iso).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}
/* Titre de jour lisible (ex. "Dimanche 21 juin") */
function dayTitle(iso) {
  const wall = isWall(iso);
  const d = wall ? new Date(iso.slice(0, 10) + 'T12:00:00Z') : new Date(iso);
  const t = d.toLocaleDateString('fr-FR', { timeZone: wall ? 'UTC' : 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* Transforme un enregistrement du store en ligne d'affichage */
function toEntry(r) {
  if (r.kind === 'order' && r.order) {
    const o = r.order;
    const items = (o.items || []).map(function (it) { return (it.qty || 1) + '× ' + it.name; }).join(', ');
    return {
      kind: 'order', id: r.id, whenIso: o.pickupAt || r.at,
      first: (o.customer && o.customer.first) || '', phone: (o.customer && o.customer.phone) || '',
      summary: items, extra: money(o.total), note: o.note || ''
    };
  }
  if (r.kind === 'resa' && r.resa) {
    const v = r.resa;
    return {
      kind: 'resa', id: r.id, whenIso: v.when || r.at,
      first: (v.customer && v.customer.first) || '', phone: (v.customer && v.customer.phone) || '',
      email: (v.customer && v.customer.email) || '', status: v.status || 'pending',
      summary: v.people + ' couvert' + (v.people > 1 ? 's' : ''), extra: '', note: v.note || ''
    };
  }
  return null;
}

app.get('/admin', function (req, res) {
  if (!adminAuth(req, res)) return;
  const qkey = req.query.key || ''; // clé à propager au manifest (app installée)
  const days = Math.min(31, Math.max(1, parseInt(req.query.days, 10) || 7));
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const entries = store.list(since).map(toEntry).filter(Boolean);
  entries.sort(function (a, b) { return a.whenIso < b.whenIso ? -1 : a.whenIso > b.whenIso ? 1 : 0; });

  // Regroupe par jour de service
  const groups = [];
  const byKey = {};
  entries.forEach(function (e) {
    const k = dayKey(e.whenIso);
    if (!byKey[k]) { byKey[k] = { key: k, iso: e.whenIso, items: [] }; groups.push(byKey[k]); }
    byKey[k].items.push(e);
  });

  const nbOrders = entries.filter(function (e) { return e.kind === 'order'; }).length;
  const nbResa = entries.filter(function (e) { return e.kind === 'resa'; }).length;
  const couverts = entries.filter(function (e) { return e.kind === 'resa'; })
    .reduce(function (s, e) { return s + (parseInt(e.summary, 10) || 0); }, 0);

  const cards = groups.map(function (g) {
    const STATUS = {
      pending:   ['⏳ En attente', 'st--pending'],
      confirmed: ['✓ Confirmée', 'st--ok'],
      refused:   ['✕ Refusée', 'st--no']
    };
    const rows = g.items.map(function (e) {
      const badge = e.kind === 'resa'
        ? '<span class="tag tag--resa">Résa</span>'
        : '<span class="tag tag--cmd">Commande</span>';
      const tel = e.phone ? '<a href="tel:' + xmlEsc(e.phone.replace(/\s/g, '')) + '">' + xmlEsc(e.phone) + '</a>' : '<span class="muted">—</span>';
      const mail = e.email ? ' · <a href="mailto:' + xmlEsc(e.email) + '">✉ ' + xmlEsc(e.email) + '</a>' : '';

      let statusPill = '', actions = '';
      if (e.kind === 'resa') {
        const s = STATUS[e.status] || STATUS.pending;
        statusPill = '<span class="st ' + s[1] + '">' + s[0] + '</span>';
        if (e.status === 'pending') {
          actions = '<div class="acts">' +
            '<button class="decide ok" data-id="' + xmlEsc(e.id) + '" data-decision="confirm">Confirmer</button>' +
            '<button class="decide no" data-id="' + xmlEsc(e.id) + '" data-decision="refuse">Refuser</button>' +
          '</div>';
        }
      }

      return '<div class="row">' +
        '<div class="row__time">' + xmlEsc(frTime(e.whenIso)) + '</div>' +
        '<div class="row__main">' +
          '<div class="row__top">' + badge + '<b>' + xmlEsc(e.first || '—') + '</b>' + statusPill +
            (e.extra ? '<span class="amount">' + xmlEsc(e.extra) + '</span>' : '') + '</div>' +
          '<div class="row__sum">' + xmlEsc(e.summary || '') + '</div>' +
          (e.note ? '<div class="row__note">⚠ ' + xmlEsc(e.note) + '</div>' : '') +
          '<div class="row__tel">📞 ' + tel + mail + ' · <span class="muted">' + xmlEsc(e.id) + '</span></div>' +
          actions +
        '</div>' +
        '<button class="reprint" data-id="' + xmlEsc(e.id) + '" title="Réimprimer">⎙</button>' +
      '</div>';
    }).join('');
    return '<section class="day"><h2>' + xmlEsc(dayTitle(g.iso)) + ' <span class="muted">(' + g.items.length + ')</span></h2>' + rows + '</section>';
  }).join('');

  res.send('<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="manifest" href="/manifest.webmanifest' + (qkey ? '?key=' + encodeURIComponent(qkey) : '') + '">' +
    '<meta name="theme-color" content="#6c4ad6">' +
    '<link rel="apple-touch-icon" href="/icons/icon-192.png">' +
    '<title>Brunch Area — Tableau de bord</title><style>' +
    ':root{--violet:#6c4ad6;--ink:#1a1a2e}' +
    '*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f6f4fb;color:var(--ink)}' +
    'header{background:#fff;padding:16px 18px;position:sticky;top:0;box-shadow:0 1px 0 #e7e2f3;z-index:5}' +
    'h1{font-size:18px;margin:0 0 10px}.stats{display:flex;gap:8px;flex-wrap:wrap;font-size:13px}' +
    '.stat{background:#f0ecfb;border-radius:10px;padding:6px 10px}.stat b{color:var(--violet)}' +
    '.bar{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}' +
    'button{font-size:14px;padding:9px 14px;border:0;border-radius:10px;background:var(--violet);color:#fff;cursor:pointer}' +
    'button.sec{background:#eee;color:#333}' +
    'main{padding:14px 14px 60px;max-width:680px;margin:0 auto}' +
    '.day{margin:0 0 18px}.day h2{font-size:15px;margin:14px 4px 8px}' +
    '.row{display:flex;gap:10px;align-items:flex-start;background:#fff;border-radius:14px;padding:12px;margin-bottom:8px;box-shadow:0 1px 4px rgba(40,20,80,.06)}' +
    '.row__time{font-weight:800;font-size:16px;min-width:52px;color:var(--violet)}' +
    '.row__main{flex:1;min-width:0}.row__top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.amount{margin-left:auto;font-weight:700}' +
    '.row__sum{font-size:14px;color:#444;margin-top:2px}' +
    '.row__note{font-size:13px;color:#9a5; color:#a05a00;background:#fff4e0;border-radius:8px;padding:3px 7px;margin-top:4px;display:inline-block}' +
    '.row__tel{font-size:13px;margin-top:5px}.row__tel a{color:var(--violet);font-weight:600;text-decoration:none}' +
    '.tag{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}' +
    '.tag--resa{background:#e3f0ff;color:#1668c4}.tag--cmd{background:#e9f7ec;color:#1f8a44}' +
    '.st{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}' +
    '.st--pending{background:#fff4e0;color:#a05a00}.st--ok{background:#e9f7ec;color:#1f8a44}.st--no{background:#fdeaea;color:#c22}' +
    '.acts{display:flex;gap:8px;margin-top:8px}' +
    '.decide{font-size:13px;padding:7px 14px}.decide.ok{background:#1f8a44}.decide.no{background:#c22}' +
    '.reprint{background:#f0ecfb;color:var(--violet);font-size:18px;padding:8px 12px;line-height:1}' +
    '.muted{color:#999}.empty{text-align:center;color:#999;margin-top:40px}' +
    '.row__tel a{color:var(--violet);font-weight:600;text-decoration:none}' +
    '</style></head><body>' +
    '<header><h1>Tableau de bord — ' + xmlEsc(SHOP.name) + '</h1>' +
      '<div class="stats"><span class="stat"><b>' + nbOrders + '</b> commande' + (nbOrders > 1 ? 's' : '') + '</span>' +
      '<span class="stat"><b>' + nbResa + '</b> réservation' + (nbResa > 1 ? 's' : '') + '</span>' +
      '<span class="stat"><b>' + couverts + '</b> couverts</span>' +
      '<span class="stat">file : <b>' + queue.length + '</b></span></div>' +
      '<div class="bar"><button onclick="testPrint()">Ticket de test</button>' +
      '<button class="sec" onclick="location.reload()">Actualiser</button>' +
      '<button class="sec" onclick="setDays(7)">7 j</button>' +
      '<button class="sec" onclick="setDays(31)">31 j</button>' +
      '<button id="notifBtn" class="sec" onclick="enableNotifs()" style="display:none">🔔 Activer les notifications</button></div>' +
    '</header><main>' +
    (cards || '<p class="empty">Aucune commande ni réservation sur la période.</p>') +
    '</main><script>' +
    'var K=new URLSearchParams(location.search).get("key")||"";' +
    'function q(p){return p+(K?(p.indexOf("?")<0?"?":"&")+"key="+encodeURIComponent(K):"");}' +
    'function setDays(d){location.search="?days="+d+(K?"&key="+encodeURIComponent(K):"");}' +
    'function testPrint(){fetch(q("/api/test-print"),{method:"POST"}).then(r=>r.json()).then(()=>alert("Ticket de test envoye.")).catch(()=>alert("Erreur."));}' +
    'document.addEventListener("click",function(e){var b=e.target.closest(".reprint");if(!b)return;' +
    'b.disabled=true;fetch(q("/api/reprint"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:b.dataset.id})})' +
    '.then(r=>r.json()).then(function(j){alert(j.ok?"Ticket renvoye a l\\u2019imprimante.":"Introuvable.");b.disabled=false;}).catch(function(){alert("Erreur.");b.disabled=false;});});' +
    'document.addEventListener("click",function(e){var b=e.target.closest(".decide");if(!b)return;' +
    'var d=b.dataset.decision;' +
    'if(!confirm(d==="confirm"?"Confirmer cette reservation ? Un email de confirmation sera envoye au client.":"Refuser cette reservation ? Un email sera envoye au client.")) return;' +
    'b.disabled=true;fetch(q("/api/reservations/decision"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:b.dataset.id,decision:d})})' +
    '.then(r=>r.json()).then(function(j){' +
    'if(!j.ok){alert("Erreur : "+(j.error||"inconnue"));b.disabled=false;return;}' +
    'if(j.mail&&j.mail.skipped)alert("Statut mis a jour, mais l\\u2019email n\\u2019est pas configure (BREVO_API_KEY / MAIL_FROM).");' +
    'else if(j.mail&&!j.mail.ok)alert("Statut mis a jour, mais l\\u2019email n\\u2019a pas pu etre envoye ("+(j.mail.error||"?")+").");' +
    'else alert(d==="confirm"?"Reservation confirmee, email envoye au client.":"Reservation refusee, email envoye au client.");' +
    'location.reload();}).catch(function(){alert("Erreur.");b.disabled=false;});});' +
    'setTimeout(function(){location.reload();},30000);' +
    '</script><script src="/admin-push.js"></script></body></html>');
});

/* Réimpression d'une commande/réservation déjà enregistrée */
app.post('/api/reprint', express.json({ limit: '16kb' }), function (req, res) {
  if (!adminAuth(req, res)) return;
  const rec = store.getById((req.body && req.body.id) || '');
  if (!rec) return res.status(404).json({ ok: false, error: 'Introuvable' });

  let xml, label;
  if (rec.kind === 'resa' && rec.resa) { xml = buildEposReservation(rec.resa); label = resaAsRecent(rec.resa); }
  else if (rec.kind === 'order' && rec.order) { xml = buildEpos(rec.order); label = rec.order; }
  else return res.status(400).json({ ok: false, error: 'Type inconnu' });

  const job = { id: 'JOB_' + (++jobSeq), xml: xml, order: label, at: Date.now() };
  queue.push(job);
  pushRecent(label, 'réimpression');
  console.log('[REPRINT] %s -> file: %d', rec.id, queue.length);
  res.json({ ok: true });
});

/* Le resto confirme ou refuse une réservation -> maj statut + email au client */
app.post('/api/reservations/decision', express.json({ limit: '16kb' }), async function (req, res) {
  if (!adminAuth(req, res)) return;
  const id = (req.body && req.body.id) || '';
  const decision = (req.body && req.body.decision) || '';
  if (decision !== 'confirm' && decision !== 'refuse') {
    return res.status(400).json({ ok: false, error: 'Décision invalide' });
  }
  const rec = store.getById(id);
  if (!rec || rec.kind !== 'resa' || !rec.resa) {
    return res.status(404).json({ ok: false, error: 'Réservation introuvable' });
  }
  const status = decision === 'confirm' ? 'confirmed' : 'refused';
  store.setStatus(id, status);
  const mail = await sendReservationEmail(rec.resa, decision);
  console.log('[RESA] %s -> %s (email: %s)', id, status, mail.ok ? 'ok' : (mail.skipped ? 'non configuré' : 'échec'));
  res.json({ ok: true, status: status, mail: mail });
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
   Notifications push (badge sur l'icône de l'app installée)
   ============================================================ */
/* Clé publique VAPID (nécessaire au navigateur pour s'abonner) */
app.get('/api/push/key', function (req, res) {
  res.json({ enabled: PUSH_ENABLED, key: VAPID.publicKey });
});

/* Le dashboard enregistre l'abonnement push de l'appareil */
app.post('/api/push/subscribe', express.json({ limit: '16kb' }), function (req, res) {
  if (!adminAuth(req, res)) return;
  const sub = req.body || {};
  if (!sub.endpoint || !sub.keys) return res.status(400).json({ ok: false, error: 'Abonnement invalide' });
  store.addPushSub(sub);
  console.log('[PUSH] appareil abonné (%d au total)', store.listPushSubs().length);
  res.json({ ok: true });
});

/* Le resto a ouvert le dashboard -> on remet la pastille à zéro */
app.post('/api/push/seen', function (req, res) {
  if (!adminAuth(req, res)) return;
  store.resetBadge();
  res.json({ ok: true, badge: 0 });
});

/* Manifest généré à la volée : le start_url embarque la clé admin pour que
   l'app installée sur l'écran d'accueil s'ouvre déjà authentifiée
   (sinon elle lance /admin sans clé -> page "Accès réservé"). */
app.get('/manifest.webmanifest', function (req, res) {
  const key = req.query.key || '';
  const start = '/admin' + (key ? '?key=' + encodeURIComponent(key) : '');
  res.type('application/manifest+json');
  res.json({
    name: 'Brunch Area — Commandes',
    short_name: 'Brunch Area',
    description: 'Tableau de bord des commandes et réservations Brunch Area',
    start_url: start,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f4fb',
    theme_color: '#6c4ad6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  });
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
