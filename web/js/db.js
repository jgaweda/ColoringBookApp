// IndexedDB layer for the gallery and autosave, plus a tiny localStorage-backed
// settings object that mirrors AppSettings on iOS.

const DB_NAME = "greedycookie";
const DB_VERSION = 1;
const STORE_GALLERY = "gallery";
const STORE_AUTOSAVE = "autosave";

let _dbPromise = null;
function db() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE_GALLERY)) {
        const s = d.createObjectStore(STORE_GALLERY, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
      if (!d.objectStoreNames.contains(STORE_AUTOSAVE)) {
        d.createObjectStore(STORE_AUTOSAVE, { keyPath: "pageId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(store, mode = "readonly") {
  return db().then((d) => d.transaction(store, mode).objectStore(store));
}

// ---------------- Gallery ----------------

export const Gallery = {
  async add({ blob, pageId, pageTitle, categoryId, categoryTitle }) {
    const id = crypto.randomUUID();
    const record = { id, blob, pageId, pageTitle, categoryId, categoryTitle, createdAt: Date.now() };
    const store = await tx(STORE_GALLERY, "readwrite");
    return new Promise((resolve, reject) => {
      const r = store.add(record);
      r.onsuccess = () => resolve(record);
      r.onerror = () => reject(r.error);
    });
  },
  async list() {
    const store = await tx(STORE_GALLERY, "readonly");
    return new Promise((resolve, reject) => {
      const out = [];
      const req = store.index("createdAt").openCursor(null, "prev");
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(out); return; }
        out.push(cur.value);
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  },
  async remove(id) {
    const store = await tx(STORE_GALLERY, "readwrite");
    return new Promise((resolve, reject) => {
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  },
  async clearAll() {
    const store = await tx(STORE_GALLERY, "readwrite");
    return new Promise((resolve, reject) => {
      const r = store.clear();
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }
};

// ---------------- Autosave ----------------

export const Autosave = {
  async put(snapshot) {
    if (!settings.autosaveEnabled) return;
    const store = await tx(STORE_AUTOSAVE, "readwrite");
    return new Promise((resolve, reject) => {
      const r = store.put(snapshot);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  },
  async get(pageId) {
    const store = await tx(STORE_AUTOSAVE, "readonly");
    return new Promise((resolve, reject) => {
      const r = store.get(pageId);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  },
  async remove(pageId) {
    const store = await tx(STORE_AUTOSAVE, "readwrite");
    return new Promise((resolve, reject) => {
      const r = store.delete(pageId);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }
};

// ---------------- Settings (localStorage-backed reactive object) ----------------

const DEFAULTS = {
  musicEnabled: true,
  sfxEnabled: true,
  voiceoverEnabled: true,
  autosaveEnabled: true,
  colorBlindPalette: false,
};
const KEY = "gc.settings";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
}

const _state = load();
const _listeners = new Set();

export const settings = new Proxy(_state, {
  set(target, prop, value) {
    target[prop] = value;
    save(target);
    for (const cb of _listeners) cb(prop, value);
    return true;
  }
});

export function onSettingsChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}
