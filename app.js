'use strict';

/* ---------------------------------------------------------------------------
 * My Benchmarks — a dependency-free PWA.
 * Project structure lives in /data/*.json (edit those with Claude/ChatGPT).
 * Your checkmark toggles are stored locally and overlaid on top of the files.
 * ------------------------------------------------------------------------- */

const STATE_KEY = 'benchmarks:state:v1';
const el = (id) => document.getElementById(id);
const view = el('view');

let PROJECTS = [];   // loaded project objects
let META = {};       // manifest meta
let overlay = loadOverlay();

/* ---------- local overlay (per-device checkmark state) ---------- */
function loadOverlay() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; }
  catch { return {}; }
}
function saveOverlay() {
  localStorage.setItem(STATE_KEY, JSON.stringify(overlay));
}
// effective done-state: local override wins, else the value from the file.
function isDone(projId, itemId, fileDefault) {
  const p = overlay[projId];
  if (p && Object.prototype.hasOwnProperty.call(p, itemId)) return p[itemId];
  return !!fileDefault;
}
function setDone(projId, itemId, val) {
  (overlay[projId] ||= {})[itemId] = val;
  saveOverlay();
}

/* ---------- data loading ---------- */
async function loadData() {
  const bust = `?t=${Date.now()}`;
  const manifest = await fetch(`data/manifest.json${bust}`).then((r) => {
    if (!r.ok) throw new Error('manifest');
    return r.json();
  });
  META = manifest;
  const files = manifest.projects || [];
  const results = await Promise.all(
    files.map((f) =>
      fetch(`data/${f}${bust}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    )
  );
  PROJECTS = results.filter(Boolean);
  el('appTitle').textContent = manifest.app || 'My Benchmarks';
  el('appTagline').textContent = manifest.tagline || '';
}

/* ---------- progress math ---------- */
function metricPct(m) {
  const span = m.target - m.start;
  if (span === 0) return m.current >= m.target ? 1 : 0;
  return clamp((m.current - m.start) / span, 0, 1);
}
function projectProgress(p) {
  const parts = [];
  if (p.milestones?.length) {
    const d = p.milestones.filter((m) => isDone(p.id, m.id, m.done)).length;
    parts.push(d / p.milestones.length);
  }
  if (p.checklist?.length) {
    const d = p.checklist.filter((c) => isDone(p.id, c.id, c.done)).length;
    parts.push(d / p.checklist.length);
  }
  if (p.metrics?.length) {
    parts.push(p.metrics.reduce((s, m) => s + metricPct(m), 0) / p.metrics.length);
  }
  if (!parts.length) return 0;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- formatting ---------- */
function fmtNum(n) {
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return `${n}`;
}
function fmtValue(m, key) {
  const v = m[key];
  if (m.unit === '$') return `$${fmtNum(v)}`;
  if (m.unit) return `${fmtNum(v)} ${m.unit}`;
  return fmtNum(v);
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function isOverdue(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  return !isNaN(d) && d < new Date(new Date().toDateString());
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- SVG helpers ---------- */
function ring(pct, size = 54, stroke = 6, color = '#7c3aed') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  const pctTxt = Math.round(pct * 100);
  return `<span class="ring"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}"
      stroke-width="${stroke}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    <text class="label" x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
      transform="rotate(90 ${size / 2} ${size / 2})">${pctTxt}%</text>
  </svg></span>`;
}
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

/* ---------- routing ---------- */
function router() {
  const id = location.hash.replace('#/', '');
  const back = el('backBtn');
  if (id && PROJECTS.some((p) => p.id === id)) {
    back.hidden = false;
    renderDetail(PROJECTS.find((p) => p.id === id));
  } else {
    back.hidden = true;
    renderHome();
  }
  window.scrollTo(0, 0);
}

/* ---------- home ---------- */
function renderHome() {
  if (!PROJECTS.length) {
    view.innerHTML = `<div class="empty"><h3>No projects yet</h3>
      <p class="muted">Add a JSON file in <code>/data</code> and list it in
      <code>manifest.json</code>. Ask Claude or ChatGPT to do it for you.</p></div>`;
    return;
  }
  const cards = PROJECTS.map((p) => {
    const pct = projectProgress(p);
    const msDone = (p.milestones || []).filter((m) => isDone(p.id, m.id, m.done)).length;
    const msTot = (p.milestones || []).length;
    const chDone = (p.checklist || []).filter((c) => isDone(p.id, c.id, c.done)).length;
    const chTot = (p.checklist || []).length;
    return `<div class="pcard" data-go="${esc(p.id)}">
      <span class="accent-bar" style="background:${esc(p.color || '#7c3aed')}"></span>
      <div class="pcard-head">
        <div class="emoji">${esc(p.emoji || '📌')}</div>
        <div class="titles">
          <h3>${esc(p.title)}</h3>
          <p class="desc">${esc(p.description || '')}</p>
        </div>
        ${ring(pct, 54, 6, p.color || '#7c3aed')}
      </div>
      <div class="pcard-foot">
        ${msTot ? `<span class="chip"><span class="dot" style="background:${esc(p.color)}"></span>${msDone}/${msTot} milestones</span>` : ''}
        ${chTot ? `<span class="chip">✓ ${chDone}/${chTot} tasks</span>` : ''}
        ${p.targetDate ? `<span class="chip">🎯 ${esc(fmtDate(p.targetDate))}</span>` : ''}
      </div>
    </div>`;
  }).join('');
  view.innerHTML = `<div class="section-label">Projects</div><div class="cards">${cards}</div>`;
  view.querySelectorAll('[data-go]').forEach((c) =>
    c.addEventListener('click', () => { location.hash = `#/${c.dataset.go}`; }));
}

/* ---------- detail ---------- */
function renderDetail(p) {
  const color = p.color || '#7c3aed';
  const metrics = (p.metrics || []).map((m) => {
    const pct = metricPct(m);
    return `<div class="metric">
      <div class="metric-top">
        <span class="name">${esc(m.label)}</span>
        <span class="nums"><b>${esc(fmtValue(m, 'current'))}</b> / ${esc(fmtValue(m, 'target'))}</span>
      </div>
      <div class="bar"><span style="width:${(pct * 100).toFixed(0)}%;background:${esc(color)}"></span></div>
    </div>`;
  }).join('');

  const milestones = (p.milestones || []).map((m) => {
    const done = isDone(p.id, m.id, m.done);
    const overdue = !done && isOverdue(m.target);
    return `<div class="ms ${done ? 'done' : ''}" data-ms="${esc(m.id)}">
      <div class="rail"><div class="node" style="${done ? `background:${esc(color)}` : ''}">${done ? '✓' : ''}</div></div>
      <div class="m-body">
        <div class="m-title">${esc(m.title)}</div>
        <div class="m-date ${overdue ? 'overdue' : ''}">${m.target ? esc(fmtDate(m.target)) : ''}${overdue ? ' · overdue' : ''}</div>
      </div>
    </div>`;
  }).join('');

  const checklist = (p.checklist || []).map((c) => {
    const done = isDone(p.id, c.id, c.done);
    return `<div class="check ${done ? 'on' : ''}" data-check="${esc(c.id)}">
      <div class="box" style="${done ? `background:${esc(color)};border-color:${esc(color)}` : ''}">${CHECK_SVG}</div>
      <span class="c-title">${esc(c.title)}</span>
      ${c.cadence ? `<span class="cadence">${esc(c.cadence)}</span>` : ''}
    </div>`;
  }).join('');

  view.innerHTML = `
    <div class="detail-hero">
      <div class="emoji">${esc(p.emoji || '📌')}</div>
      <div>
        <h2>${esc(p.title)}</h2>
        <p class="desc">${esc(p.description || '')}</p>
      </div>
    </div>
    ${p.targetDate ? `<span class="target-pill">🎯 Target · ${esc(fmtDate(p.targetDate))}</span>` : ''}
    ${metrics ? `<div class="section-label">Progress</div>${metrics}` : ''}
    ${milestones ? `<div class="section-label">Milestones</div><div class="timeline">${milestones}</div>` : ''}
    ${checklist ? `<div class="section-label">Checklist</div>${checklist}` : ''}
  `;

  // wire up toggles
  view.querySelectorAll('[data-check]').forEach((node) => {
    node.addEventListener('click', () => {
      const id = node.dataset.check;
      const item = p.checklist.find((c) => c.id === id);
      const next = !isDone(p.id, id, item.done);
      setDone(p.id, id, next);
      node.classList.toggle('on', next);
      const box = node.querySelector('.box');
      box.style.background = next ? color : '';
      box.style.borderColor = next ? color : '';
    });
  });
  view.querySelectorAll('[data-ms]').forEach((node) => {
    node.addEventListener('click', () => {
      const id = node.dataset.ms;
      const item = p.milestones.find((m) => m.id === id);
      const next = !isDone(p.id, id, item.done);
      setDone(p.id, id, next);
      node.classList.toggle('done', next);
      const dot = node.querySelector('.node');
      dot.style.background = next ? color : '';
      dot.textContent = next ? '✓' : '';
    });
  });
}

/* ---------- sync snapshot ---------- */
function buildSnapshot() {
  const out = { generated: new Date().toISOString(), projects: {} };
  for (const p of PROJECTS) {
    const entry = {};
    for (const m of p.milestones || []) entry[m.id] = isDone(p.id, m.id, m.done);
    for (const c of p.checklist || []) entry[c.id] = isDone(p.id, c.id, c.done);
    out.projects[p.id] = entry;
  }
  const header =
    '# Benchmarks progress snapshot\n' +
    '# Ask Claude/ChatGPT: "Update the `done` fields in my data/*.json files to match this."\n';
  return header + JSON.stringify(out, null, 2);
}
function openSync() {
  el('syncOut').value = buildSnapshot();
  el('copyHint').textContent = '';
  el('sheet').hidden = false;
}
function closeSync() { el('sheet').hidden = true; }

/* ---------- boot ---------- */
async function boot() {
  view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading your benchmarks…</div>`;
  try {
    await loadData();
    router();
  } catch (e) {
    view.innerHTML = `<div class="empty"><h3>Couldn't load data</h3>
      <p class="muted">Make sure <code>data/manifest.json</code> exists and is valid JSON.
      If you just opened this file directly, run it through a web server instead
      (GitHub Pages handles this automatically).</p>
      <span class="reset-link" id="retry">Retry</span></div>`;
    el('retry')?.addEventListener('click', boot);
  }
}

window.addEventListener('hashchange', router);
el('backBtn').addEventListener('click', () => { location.hash = ''; });
el('syncBtn').addEventListener('click', openSync);
el('closeSheet').addEventListener('click', closeSync);
el('sheet').addEventListener('click', (e) => { if (e.target === el('sheet')) closeSync(); });
el('copyBtn').addEventListener('click', async () => {
  const text = el('syncOut').value;
  try {
    await navigator.clipboard.writeText(text);
    el('copyHint').textContent = 'Copied ✓ — now paste it to Claude or ChatGPT.';
  } catch {
    const ta = el('syncOut'); ta.focus(); ta.select();
    el('copyHint').textContent = 'Select all and copy manually.';
  }
});

boot();

/* ---------- service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
