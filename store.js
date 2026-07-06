/* ============================================================
   BRUNCH AREA — Stockage durable (commandes + réservations)
   ------------------------------------------------------------
   Implémentation par fichier JSON, interchangeable.
   - En local         : ./data.json
   - Sur Render (disque persistant) : définir DATA_DIR=/data
     (le fichier survit alors aux redéploiements / redémarrages)
   Volume attendu très faible (un petit resto) -> écriture simple.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const MAX_RECORDS = 2000; // garde-fou mémoire/fichier

let records = []; // { kind:'order'|'resa', id, at, ...payload }

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) records = parsed;
    else if (parsed && Array.isArray(parsed.records)) records = parsed.records;
  } catch (e) {
    records = []; // fichier absent au premier lancement : normal
  }
}

let writeTimer = null;
function persist() {
  // écriture différée (regroupe les rafales) + atomique (tmp -> rename)
  if (writeTimer) return;
  writeTimer = setTimeout(function () {
    writeTimer = null;
    try {
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ records: records }));
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error('[STORE] écriture impossible :', e.message);
    }
  }, 400);
}

function add(kind, id, payload) {
  const rec = Object.assign({ kind: kind, id: id, at: new Date().toISOString() }, payload);
  records.unshift(rec);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  persist();
  return rec;
}

/* API publique */
function addOrder(order) { return add('order', order.number, { order: order }); }
function addReservation(resa) {
  if (!resa.status) resa.status = 'pending';
  return add('resa', resa.ref, { resa: resa });
}

function getById(id) {
  return records.find(function (r) { return r.id === id; }) || null;
}

// Met à jour le statut d'une réservation ('pending' | 'confirmed' | 'refused')
function setStatus(id, status) {
  const r = records.find(function (x) { return x.id === id; });
  if (!r || !r.resa) return null;
  r.resa.status = status;
  r.status = status;
  persist();
  return r;
}

// Renvoie les enregistrements depuis `sinceIso` (par défaut : 7 jours glissants),
// les plus récents d'abord.
function list(sinceIso) {
  const since = sinceIso || new Date(Date.now() - 7 * 864e5).toISOString();
  return records.filter(function (r) { return r.at >= since; });
}

load();

module.exports = { addOrder: addOrder, addReservation: addReservation, getById: getById, setStatus: setStatus, list: list, DATA_FILE: DATA_FILE };
