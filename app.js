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

/* ---------- locally captured ideas (this device, not yet in the repo) ---------- */
const CAPTURE_KEY = 'benchmarks:captures:v1';
let CAPTURES = loadCaptures();
function loadCaptures() {
  try { return JSON.parse(localStorage.getItem(CAPTURE_KEY)) || []; }
  catch { return []; }
}
function saveCaptures() { localStorage.setItem(CAPTURE_KEY, JSON.stringify(CAPTURES)); }

// File-backed ideas plus locally captured ones, newest local first.
function allIdeas() { return [...CAPTURES, ...INBOX]; }
function findIdea(id) { return allIdeas().find((i) => i.id === id); }

// Turn arbitrary pasted/shared text into an idea. Accepts our JSON shape or
// plain prose (first line = title, the rest = notes).
function captureText(raw, source) {
  const text = (raw || '').trim();
  if (!text) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (text.startsWith('{')) {
    try {
      const o = JSON.parse(text);
      if (o && o.title) {
        return {
          id: o.id || `local_${Date.now().toString(36)}`,
          title: o.title,
          captured: o.captured || today,
          summary: o.summary || '',
          notes: o.notes || '',
          nextSteps: Array.isArray(o.nextSteps) ? o.nextSteps : [],
          source: o.source || source,
          status: o.status || 'idea',
          local: true,
        };
      }
    } catch { /* fall through to prose */ }
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || 'Untitled idea').slice(0, 90);
  return {
    id: `local_${Date.now().toString(36)}`,
    title,
    captured: today,
    summary: lines[0] ? lines[0].slice(0, 140) : '',
    notes: lines.slice(1).join('\n'),
    nextSteps: [],
    source: source || 'Captured',
    status: 'idea',
    local: true,
  };
}
function addCapture(raw, source) {
  const idea = captureText(raw, source);
  if (!idea) return null;
  CAPTURES.unshift(idea);
  saveCaptures();
  updateInboxBadge();
  return idea;
}
function deleteCapture(id) {
  CAPTURES = CAPTURES.filter((i) => i.id !== id);
  saveCaptures();
  updateInboxBadge();
}

/* ---------- Markdown vault parsing (Obsidian-compatible) ----------
 * Each project / idea is a .md note: YAML-ish frontmatter between --- lines,
 * a description, then "## Progress / ## Milestones / ## Checklist" sections.
 * Milestones & checklist are task lines ( - [ ] / - [x] ) with 📅 due dates. */
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function hashId(prefix, s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return prefix + h.toString(36);
}
function parseFrontmatter(text) {
  const props = {};
  let body = text.replace(/^﻿/, '');
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    body = body.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (kv) props[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { props, body };
}
function splitSections(body) {
  const parts = body.split(/^##\s+/m);
  const intro = parts.shift().trim();
  const sections = {};
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const name = (nl === -1 ? p : p.slice(0, nl)).trim().toLowerCase();
    sections[name] = nl === -1 ? '' : p.slice(nl + 1);
  }
  return { intro, sections };
}
function parseTasks(sectionText) {
  const items = [];
  for (const line of (sectionText || '').split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
    if (!m) continue;
    let title = m[2].trim();
    let target = null, cadence = null;
    const dm = title.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (dm) { target = dm[1]; title = title.replace(dm[0], '').trim(); }
    const cm = title.match(/\(([^)]+)\)\s*$/);
    if (cm) { cadence = cm[1].trim(); title = title.slice(0, cm.index).trim(); }
    items.push({ title, done: m[1].toLowerCase() === 'x', target, cadence });
  }
  return items;
}
function parseMetrics(sectionText) {
  const metrics = [];
  for (const line of (sectionText || '').split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*(.+?):\s*(-?[\d.]+)\s*\/\s*(-?[\d.]+)\s*\/\s*(-?[\d.]+)\s*(.*)$/);
    if (!m) continue;
    metrics.push({
      id: hashId('mt', m[1].trim()), label: m[1].trim(),
      start: parseFloat(m[2]), current: parseFloat(m[3]), target: parseFloat(m[4]),
      unit: m[5].trim(),
    });
  }
  return metrics;
}
function fileTitle(path) {
  return path ? path.split('/').pop().replace(/\.md$/i, '') : '';
}
function parseProjectMd(text, path) {
  const { props, body } = parseFrontmatter(text);
  const { intro, sections } = splitSections(body);
  const title = props.title || fileTitle(path) || 'Untitled';
  return {
    id: props.id || slugify(title),
    title, emoji: props.emoji || '📌', color: props.color || '#7c3aed',
    description: intro, targetDate: props.target || '',
    metrics: parseMetrics(sections.progress),
    milestones: parseTasks(sections.milestones).map((t) =>
      ({ id: hashId('m', t.title), title: t.title, target: t.target, done: t.done })),
    checklist: parseTasks(sections.checklist).map((t) =>
      ({ id: hashId('c', t.title), title: t.title, cadence: t.cadence, done: t.done })),
  };
}
function parseIdeaMd(text, path) {
  const { props, body } = parseFrontmatter(text);
  const { intro, sections } = splitSections(body);
  let title = props.title;
  let rest = intro;
  const hm = intro.match(/^#\s+(.+)$/m);
  if (hm) { title = title || hm[1].trim(); rest = intro.slice(intro.indexOf(hm[0]) + hm[0].length).trim(); }
  title = title || fileTitle(path) || 'Idea';
  const steps = (sections['next steps'] || '').split(/\r?\n/)
    .map((l) => l.match(/^\s*-\s*(?:\[[ xX]\]\s*)?(.+)$/)).filter(Boolean).map((m) => m[1].trim());
  return {
    id: props.id || slugify(title),
    title,
    summary: props.summary || (rest.split('\n').find((l) => l.trim()) || '').trim(),
    notes: (sections.notes || '').trim(),
    nextSteps: steps,
    captured: props.captured || '',
    source: props.source || '',
    status: props.status || 'idea',
  };
}

/* ---------- data loading ---------- */
async function loadData() {
  const bust = `?t=${Date.now()}`;
  const manifest = await fetch(`data/manifest.json${bust}`).then((r) => {
    if (!r.ok) throw new Error('manifest');
    return r.json();
  });
  META = manifest;
  const getText = (path) =>
    fetch(encodeURI(path) + bust).then((r) => (r.ok ? r.text() : null)).catch(() => null);

  const projTexts = await Promise.all((manifest.projects || []).map(getText));
  PROJECTS = projTexts.map((t, i) => (t ? parseProjectMd(t, manifest.projects[i]) : null)).filter(Boolean);

  const ideaTexts = await Promise.all((manifest.inbox || []).map(getText));
  INBOX = ideaTexts.map((t, i) => (t ? parseIdeaMd(t, manifest.inbox[i]) : null)).filter(Boolean);

  el('appTitle').textContent = manifest.app || 'My Benchmarks';
  el('appTagline').textContent = manifest.tagline || '';
}

function updateInboxBadge() {
  const n = allIdeas().filter((i) => i.status !== 'promoted').length;
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
    const idea = findIdea(raw.slice(5));
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
  const openIdeas = allIdeas().filter((i) => i.status !== 'promoted').length;
  const banner = allIdeas().length
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
  const ideas = allIdeas();
  const cards = ideas.map((i) => `
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
        ${i.local ? '<span class="status-pill local">on this phone</span>' : ''}
      </div>
    </div>`).join('');
  const localCount = CAPTURES.length;
  const saveRow = localCount
    ? `<button class="btn ghost" id="saveIdeasBtn" style="margin-top:10px">⬆︎ Save ${localCount} phone idea${localCount === 1 ? '' : 's'} to repo</button>`
    : '';
  view.innerHTML = `
    <div class="section-label">Idea Inbox</div>
    <p class="muted" style="margin:0 4px 12px">Capture rough ideas from any AI chat. Copy the text, then tap Paste — or on Android, Share it straight to this app. Promote one when it's ready to become a project.</p>
    <div class="cards">${cards || '<div class="empty"><p class="muted">No ideas yet. Copy something from an AI chat and tap “Paste idea”.</p></div>'}</div>
    <button class="btn primary" id="pasteBtn" style="margin-top:16px">📋 Paste idea from clipboard</button>
    <button class="btn ghost" id="typeBtn" style="margin-top:10px">✎ Type or paste manually</button>
    ${saveRow}
    <button class="btn ghost" id="captureBtn" style="margin-top:10px">Get a capture prompt for AI</button>
  `;
  view.querySelectorAll('[data-idea]').forEach((c) =>
    c.addEventListener('click', () => { location.hash = `#/idea/${c.dataset.idea}`; }));
  el('pasteBtn').addEventListener('click', pasteIdea);
  el('typeBtn').addEventListener('click', openCaptureInput);
  el('captureBtn').addEventListener('click', openCapture);
  el('saveIdeasBtn')?.addEventListener('click', saveIdeasToRepo);
}

// One-tap capture: read the clipboard and file it. Falls back to the manual
// sheet if the browser blocks clipboard reads (e.g. no permission).
async function pasteIdea() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) { openCaptureInput('Clipboard was empty — paste your idea here.'); return; }
    const idea = addCapture(text, 'Pasted from clipboard');
    if (idea) location.hash = `#/idea/${idea.id}`;
  } catch {
    openCaptureInput('Paste your idea here (clipboard access was blocked).');
  }
}

function openCaptureInput(hint) {
  el('captureIn').value = '';
  el('captureHint').textContent = hint || '';
  el('captureSheet').hidden = false;
  el('captureIn').focus();
}

function saveIdeasToRepo() {
  const payload = CAPTURES.map(({ local, ...rest }) => rest);
  openSheet(
    'Save ideas to repo',
    'Paste this to Claude/ChatGPT on your repo: “Create an inbox/<name>.md note for each of these ideas (frontmatter id/status/captured/source, a # title, ## Notes, ## Next steps) and add each path to data/manifest.json.” Once committed they sync to all devices; you can then clear them from this phone.',
    JSON.stringify({ add_to_inbox: payload }, null, 2));
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
    ${i.local ? '<button class="btn ghost danger" id="deleteIdeaBtn" style="margin-top:10px">Delete from this phone</button>' : ''}
    <p class="muted small" style="text-align:left;margin-top:12px">Paste the promote prompt to Claude or ChatGPT working on this repo — it will generate a full project with metrics and milestones from this idea, and mark it promoted.</p>
  `;
  el('promoteBtn').addEventListener('click', () => openSheet(
    'Promote to project',
    'Paste this to Claude/ChatGPT working on your repo. It creates the project file with milestones and marks this idea promoted.',
    buildPromotePrompt(i)));
  el('copyIdeaBtn').addEventListener('click', () => openSheet(
    'Idea JSON', 'The raw captured idea.', JSON.stringify(i, null, 2)));
  el('deleteIdeaBtn')?.addEventListener('click', () => {
    deleteCapture(i.id);
    location.hash = '#/inbox';
  });
}

function buildPromotePrompt(i) {
  return 'Promote this idea into a real project in my Benchmarks Obsidian vault:\n' +
    '- Create "projects/<Project Name>.md" with frontmatter (id, title, emoji, color, target: YYYY-MM-DD), ' +
    'a one-line description, a "## Progress" list of `- Label: start / current / target unit` lines, ' +
    'and "## Milestones" + "## Checklist" task lists using `- [ ]` and `📅 YYYY-MM-DD` due dates.\n' +
    '- Add the new file path to the "projects" list in data/manifest.json.\n' +
    '- Set this idea note\'s frontmatter status to "promoted" in its inbox/*.md file.\n' +
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

// When text is shared into the app (Android "Share → My Benchmarks"), it
// arrives as ?title=&text=&url= on the start URL. Capture it, then clean up.
function handleShareTarget() {
  const p = new URLSearchParams(location.search);
  const shared = [p.get('title'), p.get('text'), p.get('url')].filter(Boolean).join('\n');
  if (!shared.trim()) return;
  addCapture(shared, 'Shared to app');
  const idea = CAPTURES[0];
  history.replaceState(null, '', location.pathname + (idea ? `#/idea/${idea.id}` : '#/inbox'));
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
    const entry = { milestones: {}, checklist: {} };
    for (const m of p.milestones || []) entry.milestones[m.title] = isDone(p.id, m.id, m.done);
    for (const c of p.checklist || []) entry.checklist[c.title] = isDone(p.id, c.id, c.done);
    out.projects[p.title] = entry;
  }
  const header =
    '# Benchmarks progress snapshot\n' +
    '# Ask Claude/ChatGPT: "Tick the checkboxes in my projects/*.md files to match this (- [x] = done)."\n';
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
    handleShareTarget();
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

// Capture-input sheet
function closeCaptureSheet() { el('captureSheet').hidden = true; }
el('captureClose').addEventListener('click', closeCaptureSheet);
el('captureSheet').addEventListener('click', (e) => { if (e.target === el('captureSheet')) closeCaptureSheet(); });
el('captureSave').addEventListener('click', () => {
  const idea = addCapture(el('captureIn').value, 'Captured on phone');
  if (!idea) { el('captureHint').textContent = 'Nothing to save yet — paste some text first.'; return; }
  closeCaptureSheet();
  location.hash = `#/idea/${idea.id}`;
});

boot();

/* ---------- service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
