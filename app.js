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
let INBOX = [];      // captured ideas (data/inbox.json)
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
  // Idea inbox is optional — absence just hides the feature.
  const inbox = await fetch(`data/inbox.json${bust}`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  INBOX = (inbox && Array.isArray(inbox.ideas)) ? inbox.ideas : [];
  el('appTitle').textContent = manifest.app || 'My Benchmarks';
  el('appTagline').textContent = manifest.tagline || '';
}

function updateInboxBadge() {
  const n = INBOX.filter((i) => i.status !== 'promoted').length;
  const b = el('inboxCount');
  if (n > 0) { b.textContent = n; b.hidden = false; } else { b.hidden = true; }
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
  const raw = location.hash.replace(/^#\/?/, ''); // '', 'inbox', 'idea/<id>', or a project id
  const back = el('backBtn');
  let backTarget = '';           // where the ‹ button goes from this view
  let showBack = true;

  if (raw === 'inbox') {
    renderInbox();
  } else if (raw.startsWith('idea/')) {
    const idea = INBOX.find((i) => i.id === raw.slice(5));
    if (idea) { renderIdea(idea); backTarget = '#/inbox'; }
    else { renderInbox(); }
  } else if (raw && PROJECTS.some((p) => p.id === raw)) {
    renderDetail(PROJECTS.find((p) => p.id === raw));
  } else {
    renderHome();
    showBack = false;
  }

  back.hidden = !showBack;
  back.dataset.target = backTarget;
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
  const openIdeas = INBOX.filter((i) => i.status !== 'promoted').length;
  const banner = INBOX.length
    ? `<div class="inbox-banner" data-go-inbox>💡 Idea Inbox
         <span>${openIdeas} ${openIdeas === 1 ? 'idea' : 'ideas'} waiting →</span></div>`
    : '';
  view.innerHTML = `${banner}<div class="section-label">Projects</div><div class="cards">${cards}</div>`;
  view.querySelectorAll('[data-go]').forEach((c) =>
    c.addEventListener('click', () => { location.hash = `#/${c.dataset.go}`; }));
  view.querySelector('[data-go-inbox]')?.addEventListener('click', () => { location.hash = '#/inbox'; });
}

/* ---------- idea inbox ---------- */
function renderInbox() {
  const cards = INBOX.map((i) => `
    <div class="pcard idea" data-idea="${esc(i.id)}">
      <span class="accent-bar" style="background:#eab308"></span>
      <div class="pcard-head">
        <div class="emoji">💡</div>
        <div class="titles">
          <h3>${esc(i.title)}</h3>
          <p class="desc">${esc(i.summary || '')}</p>
        </div>
      </div>
      <div class="pcard-foot">
        ${i.captured ? `<span class="chip">📥 ${esc(fmtDate(i.captured))}</span>` : ''}
        <span class="status-pill ${i.status === 'promoted' ? 'promoted' : ''}">${esc(i.status || 'idea')}</span>
      </div>
    </div>`).join('');
  view.innerHTML = `
    <div class="section-label">Idea Inbox</div>
    <p class="muted" style="margin:0 4px 12px">Rough ideas captured from your AI chats. Promote one when it's ready to become a project.</p>
    <div class="cards">${cards || '<div class="empty"><p class="muted">No ideas yet. Tap “Capture a new idea” to get a prompt you can paste at the end of any AI chat.</p></div>'}</div>
    <button class="btn ghost" id="captureBtn" style="margin-top:16px">＋ Capture a new idea</button>
  `;
  view.querySelectorAll('[data-idea]').forEach((c) =>
    c.addEventListener('click', () => { location.hash = `#/idea/${c.dataset.idea}`; }));
  el('captureBtn').addEventListener('click', openCapture);
}

function renderIdea(i) {
  const steps = (i.nextSteps || []).map((s) => `<li>${esc(s)}</li>`).join('');
  view.innerHTML = `
    <div class="detail-hero">
      <div class="emoji">💡</div>
      <div><h2>${esc(i.title)}</h2><p class="desc">${esc(i.summary || '')}</p></div>
    </div>
    <div class="pcard-foot" style="margin:12px 0 4px">
      ${i.captured ? `<span class="chip">📥 Captured ${esc(fmtDate(i.captured))}</span>` : ''}
      <span class="status-pill ${i.status === 'promoted' ? 'promoted' : ''}">${esc(i.status || 'idea')}</span>
      ${i.source ? `<span class="chip">${esc(i.source)}</span>` : ''}
    </div>
    ${i.notes ? `<div class="section-label">Notes</div><pre class="notes">${esc(i.notes)}</pre>` : ''}
    ${steps ? `<div class="section-label">Next steps</div><ul class="steps">${steps}</ul>` : ''}
    <div class="section-label">Turn into a project</div>
    <button class="btn primary" id="promoteBtn">Copy “promote” prompt</button>
    <button class="btn ghost" id="copyIdeaBtn" style="margin-top:10px">Copy idea JSON</button>
    <p class="muted small" style="text-align:left;margin-top:12px">Paste the promote prompt to Claude or ChatGPT working on this repo — it will generate a full project with metrics and milestones from this idea, and mark it promoted.</p>
  `;
  el('promoteBtn').addEventListener('click', () => openSheet(
    'Promote to project',
    'Paste this to Claude/ChatGPT working on your repo. It creates the project file with milestones and marks this idea promoted.',
    buildPromotePrompt(i)));
  el('copyIdeaBtn').addEventListener('click', () => openSheet(
    'Idea JSON', 'The raw captured idea.', JSON.stringify(i, null, 2)));
}

function buildPromotePrompt(i) {
  return 'Promote this idea from data/inbox.json into a real project in my Benchmarks app:\n' +
    '- Create data/<slug>.json following the project schema (metrics with start/current/target, dated milestones, a checklist).\n' +
    '- Add the new file to data/manifest.json.\n' +
    '- Set this inbox idea\'s "status" to "promoted" in data/inbox.json.\n' +
    'Pick sensible metrics and milestones from the idea below; ask me only if something essential is missing.\n\n' +
    JSON.stringify(i, null, 2);
}

const CAPTURE_PROMPT =
  'Summarize the key project/idea from our conversation as ONE JSON object for my "Benchmarks" idea inbox. ' +
  'Output only the JSON, using exactly this shape:\n' +
  '{\n' +
  '  "id": "idea_<short-slug>",\n' +
  '  "title": "...",\n' +
  `  "captured": "${new Date().toISOString().slice(0, 10)}",\n` +
  '  "summary": "one sentence on what this is",\n' +
  '  "notes": "the important distilled points, as short lines separated by \\n",\n' +
  '  "nextSteps": ["...", "..."],\n' +
  '  "source": "where this came from",\n' +
  '  "status": "idea"\n' +
  '}';

function openCapture() {
  openSheet(
    'Capture an idea',
    'Paste this at the END of any Claude/ChatGPT conversation. It returns a JSON idea block — hand that to Claude on your repo (or add it to data/inbox.json) to file it.',
    CAPTURE_PROMPT);
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
// Generic bottom sheet: a title, an intro line, and a copyable text blob.
function openSheet(title, intro, text) {
  el('sheetTitle').textContent = title;
  el('sheetIntro').textContent = intro;
  el('syncOut').value = text;
  el('copyHint').textContent = '';
  el('sheet').hidden = false;
}
function closeSheet() { el('sheet').hidden = true; }

function openSync() {
  openSheet(
    'Sync progress',
    'Your checkmarks are saved on this device. To save them permanently (and share across devices), copy the snapshot below and paste it to Claude or ChatGPT, asking it to update the project files in your repo.',
    buildSnapshot());
}

/* ---------- boot ---------- */
async function boot() {
  view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading your benchmarks…</div>`;
  try {
    await loadData();
    updateInboxBadge();
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
el('backBtn').addEventListener('click', () => { location.hash = el('backBtn').dataset.target || ''; });
el('inboxBtn').addEventListener('click', () => { location.hash = '#/inbox'; });
el('syncBtn').addEventListener('click', openSync);
el('closeSheet').addEventListener('click', closeSheet);
el('sheet').addEventListener('click', (e) => { if (e.target === el('sheet')) closeSheet(); });
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
