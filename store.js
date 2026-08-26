'use strict';
/* Local-first vault, shared by both apps on the same origin.
 *
 * When NO GitHub token is connected, the Markdown files are read from and
 * written to on-device storage (IndexedDB). The starter files shipped with the
 * site are the base layer; anything the user creates or edits is layered on top.
 * Each write records a modification time so vaults can be merged across devices.
 *
 * Export/Import let you move the whole vault between phone/PC/laptop as one
 * file (over USB, Bluetooth, Nearby Share, AirDrop…) with no cloud or account. */
(function () {
  const DB = 'benchmarks-vault', FILES = 'files', META = 'meta', TOMB = ' deleted';
  let _db;
  const open = () => _db || (_db = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META); // path -> mtime (ms)
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const op = (store, mode, fn) => open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store), r = fn(s);
    t.oncomplete = () => res(r ? r.result : undefined);
    t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
  const now = () => Date.now();

  // On-device store, keyed by repo-relative path (e.g. "projects/X.md").
  const LV = {
    TOMB,
    get: (p) => op(FILES, 'readonly', (s) => s.get(p)),          // text | TOMB | undefined
    set: (p, v) => op(FILES, 'readwrite', (s) => s.put(v, p)).then(() => LV.metaSet(p, now())),
    setAt: (p, v, t) => op(FILES, 'readwrite', (s) => s.put(v, p)).then(() => LV.metaSet(p, t || now())),
    tomb: (p) => op(FILES, 'readwrite', (s) => s.put(TOMB, p)).then(() => LV.metaSet(p, now())),
    tombAt: (p, t) => op(FILES, 'readwrite', (s) => s.put(TOMB, p)).then(() => LV.metaSet(p, t || now())),
    drop: (p) => op(FILES, 'readwrite', (s) => s.delete(p)),
    keys: () => op(FILES, 'readonly', (s) => s.getAllKeys()),
    metaGet: (p) => op(META, 'readonly', (s) => s.get(p)).then((v) => v || 0),
    metaSet: (p, t) => op(META, 'readwrite', (s) => s.put(t, p)),
    metaDrop: (p) => op(META, 'readwrite', (s) => s.delete(p)),
    metaKeys: () => op(META, 'readonly', (s) => s.getAllKeys()),
  };

  // Base (served) files live relative to the repo root; each app sets its base.
  if (window.VAULT_BASE === undefined) window.VAULT_BASE = '';
  async function served(path) {
    try {
      const r = await fetch(window.VAULT_BASE + encodeURI(path) + '?t=' + now());
      return r.ok ? await r.text() : null;
    } catch { return null; }
  }
  window.isLocalMode = () => !localStorage.getItem('benchmarks:ghtoken:v1');
  // Effective read. Local overlay wins in local mode (tombstone = deleted);
  // when a token is connected the repo is the source of truth.
  async function vaultRead(path) {
    if (!window.isLocalMode()) return served(path);
    const v = await LV.get(path);
    if (v !== undefined) return v === TOMB ? null : v;
    return served(path);
  }

  const OVERLAY_KEYS = ['benchmarks:state:v1', 'benchmarks:counts:v1', 'benchmarks:captures:v1', 'benchmarks:history:v1'];

  // Every path that could hold vault content (base files + everything local).
  async function allPaths() {
    const set = new Set(['data/manifest.json', 'money/accounts.md', 'money/budget.md', 'money/index.json']);
    const man = await vaultRead('data/manifest.json');
    if (man) try { const m = JSON.parse(man); (m.projects || []).forEach((p) => set.add(p)); (m.inbox || []).forEach((p) => set.add(p)); } catch { /* */ }
    const idx = await vaultRead('money/index.json');
    if (idx) try { (JSON.parse(idx).months || []).forEach((mo) => set.add('money/' + mo + '.md')); } catch { /* */ }
    (await LV.keys()).forEach((k) => set.add(k));
    return [...set];
  }

  // Build a single-file snapshot of the whole vault (files + tap-state overlays).
  async function exportVault(appName) {
    const paths = await allPaths();
    const localKeys = new Set(await LV.keys());
    const files = {};
    for (const p of paths) {
      const raw = localKeys.has(p) ? await LV.get(p) : undefined;
      if (raw === TOMB) { files[p] = { deleted: true, mtime: await LV.metaGet(p) }; continue; }
      const text = await vaultRead(p);
      if (text == null) continue;
      files[p] = { text, mtime: await LV.metaGet(p) };
    }
    const overlays = {};
    for (const k of OVERLAY_KEYS) { const v = localStorage.getItem(k); if (v != null) overlays[k] = v; }
    return JSON.stringify({ format: 'mybenchmarks-vault', version: 1, app: appName || 'My Benchmarks', exportedAt: now(), files, overlays });
  }

  // Merge a snapshot into this device. mode 'merge' = per-file newest-wins;
  // mode 'replace' = wipe local and restore the snapshot exactly.
  async function importVault(bundle, mode) {
    if (!bundle || bundle.format !== 'mybenchmarks-vault') throw new Error('That file is not a My Benchmarks vault export.');
    const replace = mode === 'replace';
    let added = 0, updated = 0, kept = 0, deleted = 0;
    if (replace) {
      for (const k of await LV.keys()) await LV.drop(k);
      for (const k of await LV.metaKeys()) await LV.metaDrop(k);
      OVERLAY_KEYS.forEach((k) => localStorage.removeItem(k));
    }
    const files = bundle.files || {};
    for (const p of Object.keys(files)) {
      const inc = files[p];
      const localMtime = await LV.metaGet(p);
      if (inc.deleted) {
        if (replace || (inc.mtime || 0) > localMtime) { await LV.tombAt(p, inc.mtime); deleted++; } else kept++;
        continue;
      }
      const localText = await vaultRead(p);
      if (localText === inc.text) { kept++; continue; }
      if (replace || (inc.mtime || 0) >= localMtime) {
        await LV.setAt(p, inc.text, inc.mtime);
        if (localText == null) added++; else updated++;
      } else kept++;
    }
    const ov = bundle.overlays || {};
    const mergeMap = (key) => {
      if (ov[key] == null) return;
      if (replace) { localStorage.setItem(key, ov[key]); return; }
      let inc = {}, loc = {};
      try { inc = JSON.parse(ov[key]) || {}; } catch { return; }
      try { loc = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { /* */ }
      localStorage.setItem(key, JSON.stringify(Object.assign({}, loc, inc)));
    };
    mergeMap('benchmarks:state:v1');
    mergeMap('benchmarks:counts:v1');
    // Weekly/period history: deep-union (proj → item → period), never lose a recorded period.
    if (ov['benchmarks:history:v1'] != null) {
      if (replace) localStorage.setItem('benchmarks:history:v1', ov['benchmarks:history:v1']);
      else {
        let inc = {}, loc = {};
        try { inc = JSON.parse(ov['benchmarks:history:v1']) || {}; } catch { inc = {}; }
        try { loc = JSON.parse(localStorage.getItem('benchmarks:history:v1') || '{}') || {}; } catch { /* */ }
        for (const proj in inc) {
          loc[proj] = loc[proj] || {};
          for (const item in inc[proj]) {
            loc[proj][item] = loc[proj][item] || {};
            for (const per in inc[proj][item]) if (!(per in loc[proj][item])) loc[proj][item][per] = inc[proj][item][per];
          }
        }
        localStorage.setItem('benchmarks:history:v1', JSON.stringify(loc));
      }
    }
    if (ov['benchmarks:captures:v1'] != null) {
      if (replace) localStorage.setItem('benchmarks:captures:v1', ov['benchmarks:captures:v1']);
      else {
        let inc = [], loc = [];
        try { inc = JSON.parse(ov['benchmarks:captures:v1']) || []; } catch { /* */ }
        try { loc = JSON.parse(localStorage.getItem('benchmarks:captures:v1') || '[]') || []; } catch { /* */ }
        const byId = {}; [...loc, ...inc].forEach((c) => { if (c && c.id) byId[c.id] = c; });
        localStorage.setItem('benchmarks:captures:v1', JSON.stringify(Object.values(byId)));
      }
    }
    return { added, updated, kept, deleted };
  }

  window.LV = LV;
  window.vaultRead = vaultRead;
  window.vaultServed = served;
  window.exportVault = exportVault;
  window.importVault = importVault;
})();
