// =============================================
// STORAGE.JS - IndexedDB per Presenze MUNAF
// =============================================

const DB_NAME = 'presenze_munaf';
const DB_VERSION = 1;
let db = null;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('entries')) {
        const store = database.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: true });
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror = (e) => reject(e.target.error);
  });
}

// ---- SETTINGS ----

async function saveSetting(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getSetting(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllSettings() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').getAll();
    req.onsuccess = () => {
      const obj = {};
      req.result.forEach(r => obj[r.key] = r.value);
      resolve(obj);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ---- ENTRIES ----

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function saveEntry(entry) {
  return new Promise((resolve, reject) => {
    if (!entry.id) entry.id = generateId();
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getEntry(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getEntryByDate(date) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').index('date').get(date);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllEntries() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.date.localeCompare(b.date)));
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getEntriesByMonth(year, month) {
  const all = await getAllEntries();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return all.filter(e => e.date.startsWith(prefix));
}

async function deleteEntry(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ---- BACKUP ----

async function exportBackup() {
  const entries = await getAllEntries();
  const settings = await getAllSettings();
  const backup = { version: 1, exportDate: new Date().toISOString(), settings, entries };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_presenze_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.entries || !backup.settings) throw new Error('File backup non valido');
        // Restore settings
        for (const [key, value] of Object.entries(backup.settings)) {
          await saveSetting(key, value);
        }
        // Restore entries
        for (const entry of backup.entries) {
          await saveEntry(entry);
        }
        resolve(backup);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsText(file);
  });
}

// =============================================
// SNAPSHOT AUTOMATICI SETTIMANALI
// =============================================

async function saveSnapshot() {
  const entries = await getAllEntries();
  const settings = await getAllSettings();
  const snapshot = {
    date: new Date().toISOString(),
    dateLabel: formatSnapshotDate(new Date()),
    entries: entries,
    settings: settings
  };
  // Salva snapshot con chiave data settimana
  const weekKey = getWeekKey();
  await saveSetting('snapshot_' + weekKey, JSON.stringify(snapshot));
  await saveSetting('snapshot_last', new Date().toISOString());
  // Mantieni solo ultimi 4 snapshot (4 settimane)
  await cleanOldSnapshots();
  return snapshot;
}

function formatSnapshotDate(d) {
  return d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
}

function getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '_W' + String(week).padStart(2,'0');
}

async function cleanOldSnapshots() {
  const all = await getAllSettings();
  const snapKeys = Object.keys(all).filter(k => k.startsWith('snapshot_') && k !== 'snapshot_last').sort();
  // Tieni solo gli ultimi 4
  if (snapKeys.length > 4) {
    const toDelete = snapKeys.slice(0, snapKeys.length - 4);
    for (const k of toDelete) {
      await saveSetting(k, null);
    }
  }
}

async function getSnapshots() {
  const all = await getAllSettings();
  const snapKeys = Object.keys(all).filter(k => k.startsWith('snapshot_') && k !== 'snapshot_last').sort().reverse();
  const snapshots = [];
  for (const k of snapKeys) {
    if (all[k]) {
      try {
        const snap = JSON.parse(all[k]);
        snapshots.push({ key: k, date: snap.dateLabel, entries: snap.entries.length });
      } catch(e) {}
    }
  }
  return snapshots;
}

async function restoreSnapshot(key) {
  const all = await getAllSettings();
  if (!all[key]) throw new Error('Snapshot non trovato');
  const snap = JSON.parse(all[key]);
  for (const entry of snap.entries) {
    await saveEntry(entry);
  }
  return snap;
}

async function checkAndAutoSnapshot() {
  // Controlla se e' passata una settimana dall'ultimo snapshot
  const lastStr = await getSetting('snapshot_last');
  const weekKey = getWeekKey();
  const existingKey = await getSetting('snapshot_' + weekKey);
  
  if (!existingKey) {
    // Non c'e' snapshot questa settimana — fallo
    await saveSnapshot();
    return true;
  }
  return false;
}
