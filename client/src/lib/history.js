// Local practice history — persisted in IndexedDB (holds the video/audio blob plus
// the full report), entirely on-device. Survives refreshes; nothing leaves the browser.
const DB_NAME = 'speakcoach';
const STORE = 'sessions';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function saveSession(session) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(session);
    t.oncomplete = () => { db.close(); resolve(session.id); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function listSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => { db.close(); resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt)); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteSession(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

// Build a session record from a finished report. Strips the live blob URL (recreated
// on open) and the bulky raw volume samples (not shown in the report).
export function toSession({ results, blob, mediaType }) {
  const { mediaUrl, volumeLevels, ...keep } = results;
  return {
    id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    mediaType,
    blob,
    results: keep,
  };
}

// Local "YYYY-MM-DD" key for grouping sessions by calendar day.
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
