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
// Parse a "## History" Markdown table into { headers, rows:[{date, values:{label:num}}] }.
function parseHistoryTable(sectionText) {
  const lines = (sectionText || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|'));
  if (lines.length < 2) return { headers: [], rows: [] };
  const cells = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = cells(lines[0]);
  const rows = [];
  for (const l of lines.slice(1)) {
    if (/^[\s|:\-]+$/.test(l)) continue; // separator row (---)
    const c = cells(l);
    const values = {};
    for (let i = 1; i < headers.length; i++) {
      const n = parseFloat(c[i]);
      if (c[i] !== undefined && c[i] !== '' && !isNaN(n)) values[headers[i]] = n;
    }
    rows.push({ date: c[0], values });
  }
  return { headers, rows };
}
function parseRules(sectionText) {
  const rules = [];
  for (const line of (sectionText || '').split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*(.+?):\s*(.+)$/);
    if (m) rules.push({ category: m[1].trim(), keywords: m[2].split(',').map((k) => k.trim().toLowerCase()).filter(Boolean) });
  }
  return rules;
}
function parseProjectMd(text, path) {
  const { props, body } = parseFrontmatter(text);
  const { intro, sections } = splitSections(body);
  const title = props.title || fileTitle(path) || 'Untitled';
  const hist = parseHistoryTable(sections.history);
  const metrics = parseMetrics(sections.progress).map((m) => {
    const pts = hist.rows.filter((r) => m.label in r.values).map((r) => ({ date: r.date, value: r.values[m.label] }));
    // reflect the live "current" as the latest point if the table doesn't already
    if (pts.length && pts[pts.length - 1].value !== m.current) pts.push({ date: 'now', value: m.current });
    m.history = pts;
    return m;
  });
  return {
    id: props.id || slugify(title),
    title, emoji: props.emoji || '📌', color: props.color || '#7c3aed',
    description: intro, targetDate: props.target || '',
    budget: /^(true|yes)$/i.test(props.budget || ''),
    rules: parseRules(sections.rules),
    metrics,
    milestones: parseTasks(sections.milestones).map((t) =>
      ({ id: hashId('m', t.title), title: t.title, target: t.target, done: t.done })),
    checklist: parseTasks(sections.checklist).map((t) =>
      ({ id: hashId('c', t.title), title: t.title, cadence: t.cadence, done: t.done })),
  };
}
// Match a transaction description to a category using the project's rules.
function categorizeDesc(desc, rules) {
  const d = String(desc || '').toLowerCase();
  for (const r of rules) if (r.keywords.some((k) => k && d.includes(k))) return r.category;
  return null;
}
// Sum spending per category from CSV rows using amount + description columns.
function summarizeByCategory(rows, amountCol, descCol, rules) {
  const vals = rows.slice(1).map((r) => csvNum(r[amountCol]));
  const signed = vals.some((n) => !isNaN(n) && n < 0); // signed column vs debit-only
  const totals = {}; let other = 0;
  rows.slice(1).forEach((r, i) => {
    const n = vals[i]; if (isNaN(n)) return;
    const spend = signed ? (n < 0 ? -n : 0) : (n > 0 ? n : 0);
    if (spend <= 0) return;
    const cat = categorizeDesc(r[descCol], rules);
    if (cat) totals[cat] = round2((totals[cat] || 0) + spend); else other = round2(other + spend);
  });
  return { totals, other };
}
// Insert or update a row (keyed by its first cell) in a note's ## History table.
function upsertHistoryRow(raw, rowKey, values) {
  const lines = raw.split('\n');
  const h = lines.findIndex((l) => l.trim().toLowerCase() === '## history');
  if (h === -1) return raw;
  const tbl = [];
  for (let i = h + 1; i < lines.length; i++) {
    const s = lines[i].trim();
    if (s.startsWith('|')) tbl.push(i);
    else if (s.startsWith('## ') || (s === '' && tbl.length)) break;
  }
  if (tbl.length < 2) return raw;
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = cells(lines[tbl[0]]);
  const dataIdx = tbl.slice(1).filter((i) => !/^[\s|:\-]+$/.test(lines[i].trim()));
  const fmt = (v) => String(round2(v));
  const existing = dataIdx.find((i) => cells(lines[i])[0] === rowKey);
  if (existing != null) {
    const c = cells(lines[existing]); while (c.length < headers.length) c.push('');
    headers.forEach((hd, j) => { if (j && hd in values) c[j] = fmt(values[hd]); });
    lines[existing] = '| ' + c.join(' | ') + ' |';
  } else {
    const row = [rowKey, ...headers.slice(1).map((hd) => (hd in values ? fmt(values[hd]) : ''))];
    const at = (dataIdx.length ? dataIdx[dataIdx.length - 1] : tbl[tbl.length - 1]) + 1;
    lines.splice(at, 0, '| ' + row.join(' | ') + ' |');
  }
  return lines.join('\n');
}
// Most common YYYY-MM among a date-like column, else the current month.
function detectMonth(rows) {
  let dateCol = -1;
  for (let c = 0; c < rows[0].length; c++) if (isDateLikeCol(rows, c)) { dateCol = c; break; }
  const counts = {};
  if (dateCol >= 0) for (const r of rows.slice(1)) {
    const m = String(r[dateCol] || '').match(/(\d{4})[-/.](\d{1,2})/);
    if (m) { const k = `${m[1]}-${String(+m[2]).padStart(2, '0')}`; counts[k] = (counts[k] || 0) + 1; }
  }
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  return top || new Date().toISOString().slice(0, 7);
}
function autoDetectDescCol(rows) {
  // the non-date, non-numeric column with the longest average text
  let best = 0, score = -1;
  for (let c = 0; c < rows[0].length; c++) {
    if (isDateLikeCol(rows, c)) continue;
    const cells = rows.slice(1).map((r) => (r[c] || '').trim());
    const numeric = cells.filter((x) => !isNaN(csvNum(x)) && x !== '').length;
    if (numeric > cells.length / 2) continue; // mostly numbers → not description
    const avg = cells.reduce((a, b) => a + b.length, 0) / (cells.length || 1);
    if (avg > score) { score = avg; best = c; }
  }
  return best;
}

// Sparkline of a metric's history. Thin line, emphasized endpoint, no axes.
function sparkline(points, color) {
  if (!points || points.length < 2) return '';
  const w = 120, h = 30, pad = 3;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const pts = points.map((p, i) => [
    pad + i * ((w - pad * 2) / (points.length - 1)),
    pad + (h - pad * 2) * (1 - (p.value - min) / span),
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="${color}"/></svg>`;
}
// Direction of the latest change relative to the target: 'up' (improving),
// 'down' (slipping), 'flat', or null when there isn't enough history.
function metricMomentum(m) {
  const p = m.history || [];
  if (p.length < 2) return null;
  const dl = Math.abs(p[p.length - 1].value - m.target);
  const dp = Math.abs(p[p.length - 2].value - m.target);
  return dl < dp ? 'up' : dl > dp ? 'down' : 'flat';
}
const MOM = { up: '▲', down: '▼', flat: '–' };
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
  PROJECTS = projTexts.map((t, i) => (t
    ? Object.assign(parseProjectMd(t, manifest.projects[i]), { path: manifest.projects[i], raw: t })
    : null)).filter(Boolean);

  const ideaTexts = await Promise.all((manifest.inbox || []).map(getText));
  INBOX = ideaTexts.map((t, i) => (t ? parseIdeaMd(t, manifest.inbox[i]) : null)).filter(Boolean);

  el('appTitle').textContent = manifest.app || 'My Benchmarks';
  el('appTagline').textContent = manifest.tagline || '';
  document.title = manifest.app || 'My Benchmarks';
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

/* ---------- overview dashboard ---------- */
function computeDashboard() {
  const today = new Date(new Date().toDateString());
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  let msDone = 0, msTot = 0, chDone = 0, chTot = 0;
  const overdue = [], upcoming = [], pcts = [];
  for (const p of PROJECTS) {
    pcts.push(projectProgress(p));
    for (const m of p.milestones || []) {
      msTot++;
      const done = isDone(p.id, m.id, m.done);
      if (done) { msDone++; continue; }
      if (m.target) {
        const d = new Date(m.target + 'T00:00:00');
        if (!isNaN(d)) {
          if (d < today) overdue.push({ p, m, d });
          else if (d <= in30) upcoming.push({ p, m, d });
        }
      }
    }
    for (const c of p.checklist || []) { chTot++; if (isDone(p.id, c.id, c.done)) chDone++; }
  }
  overdue.sort((a, b) => a.d - b.d);
  upcoming.sort((a, b) => a.d - b.d);
  const overall = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  let improving = 0, slipping = 0;
  for (const p of PROJECTS) for (const m of p.metrics || []) {
    const mm = metricMomentum(m);
    if (mm === 'up') improving++; else if (mm === 'down') slipping++;
  }
  return { overall, msDone, msTot, chDone, chTot, overdue, upcoming, improving, slipping };
}

function dashItem(p, m, kind) {
  return `<div class="dash-item" data-go="${esc(p.id)}">
    <span class="di-emoji">${esc(p.emoji || '📌')}</span>
    <span class="di-main">
      <span class="di-title">${esc(m.title)}</span>
      <span class="di-sub">${esc(p.title)}</span>
    </span>
    <span class="di-date ${kind}">${esc(fmtDate(m.target))}</span>
  </div>`;
}

function buildDashboard() {
  if (!PROJECTS.length) return '';
  const d = computeDashboard();
  const stat = (n, l, cls = '') => `<div class="stat ${cls}"><span class="n">${n}</span><span class="l">${l}</span></div>`;
  const overdueBlock = d.overdue.length
    ? `<div class="dash-block">
         <div class="block-head warn">⚠︎ Needs attention · ${d.overdue.length} overdue</div>
         ${d.overdue.slice(0, 4).map(({ p, m }) => dashItem(p, m, 'overdue')).join('')}
       </div>`
    : `<div class="dash-block"><div class="block-head good">✓ Nothing overdue — you're on track</div></div>`;
  const upcomingBlock = d.upcoming.length
    ? `<div class="dash-block">
         <div class="block-head">🎯 Coming up · next 30 days</div>
         ${d.upcoming.slice(0, 4).map(({ p, m }) => dashItem(p, m, 'soon')).join('')}
       </div>`
    : '';
  return `
    <div class="section-label">Overview</div>
    <div class="dash-hero">
      ${ring(d.overall, 92, 9, '#7c3aed')}
      <div class="hero-meta">
        <div class="hero-big">${Math.round(d.overall * 100)}%</div>
        <div class="hero-sub">overall progress across ${PROJECTS.length} project${PROJECTS.length === 1 ? '' : 's'}</div>
      </div>
    </div>
    <div class="stat-row">
      ${stat(`${d.msDone}<span class="of">/${d.msTot}</span>`, 'Milestones')}
      ${stat(`${d.chDone}<span class="of">/${d.chTot}</span>`, 'Tasks')}
      ${stat(`${d.overdue.length}`, 'Overdue', d.overdue.length ? 'warn' : '')}
    </div>
    ${(d.improving || d.slipping) ? `<div class="mom-row">
      <span class="mom up">▲ ${d.improving} improving</span>
      <span class="mom down">▼ ${d.slipping} slipping</span>
      <span class="mom-note">vs last recorded</span>
    </div>` : ''}
    ${overdueBlock}
    ${upcomingBlock}`;
}

/* ---------- home ---------- */
function renderHome() {
  if (!PROJECTS.length) {
    view.innerHTML = `<div class="empty">
      <h3>Welcome 👋</h3>
      <p class="muted">Track milestones and progress for any goal. Create your first project to begin —
        or capture an idea to shape later.</p>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:22px auto 0">
        <button class="btn primary" id="firstProjectBtn">＋ New project</button>
        <button class="btn ghost" id="firstInboxBtn">💡 Capture an idea</button>
        <button class="btn ghost" id="firstConnectBtn">Connect GitHub</button>
      </div></div>`;
    el('firstProjectBtn').addEventListener('click', openProjectForm);
    el('firstInboxBtn').addEventListener('click', () => { location.hash = '#/inbox'; });
    el('firstConnectBtn').addEventListener('click', () => openTokenSheet());
    return;
  }
  const cards = [...PROJECTS].sort((a, b) => projectProgress(b) - projectProgress(a)).map((p) => {
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
  view.innerHTML = `${banner}${buildDashboard()}<div class="section-label">Projects</div><div class="cards">${cards}</div>
    <button class="btn ghost" id="newProjectBtn" style="margin-top:14px">＋ New project</button>`;
  view.querySelectorAll('[data-go]').forEach((c) =>
    c.addEventListener('click', () => { location.hash = `#/${c.dataset.go}`; }));
  view.querySelector('[data-go-inbox]')?.addEventListener('click', () => { location.hash = '#/inbox'; });
  el('newProjectBtn').addEventListener('click', openProjectForm);
}

/* ---------- new-project form ---------- */
let pfColor = '#7c3aed';
function setPasteMode(on) {
  el('pfForm').hidden = on;
  el('pfPasteWrap').hidden = !on;
  el('pfToggle').textContent = on ? '← Use the form instead' : 'Paste an AI note instead →';
  el('projectSheetTitle').textContent = on ? 'New project from a note' : 'New project';
}
function openProjectForm() {
  ['pfTitle', 'pfEmoji', 'pfTarget', 'pfDesc', 'pfMetrics', 'pfMilestones', 'pfChecklist', 'pfPaste'].forEach((id) => { el(id).value = ''; });
  setPasteMode(false);
  pfColor = PROJECT_COLORS[0];
  el('pfSwatches').innerHTML = PROJECT_COLORS.map((c) =>
    `<button type="button" class="swatch${c === pfColor ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="color ${c}"></button>`).join('');
  el('pfSwatches').querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
    pfColor = b.dataset.c;
    el('pfSwatches').querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
  }));
  el('pfHint').textContent = GH.token ? '' : 'Tip: connect GitHub once (link below) to save projects.';
  el('projectSheet').hidden = false;
}
async function submitProject() {
  const pasteMode = !el('pfPasteWrap').hidden;
  const btn = el('pfCreate');
  if (!pasteMode && !el('pfTitle').value.trim()) { el('pfHint').textContent = 'Please give the project a title.'; return; }
  btn.disabled = true; el('pfHint').classList.remove('err'); el('pfHint').textContent = 'Creating…';
  try {
    if (pasteMode) {
      await createProjectFromMarkdown(el('pfPaste').value);
    } else {
      await createProjectOnGitHub({
        title: el('pfTitle').value.trim(), emoji: el('pfEmoji').value.trim(), color: pfColor,
        target: el('pfTarget').value.trim(), description: el('pfDesc').value.trim(),
        metrics: el('pfMetrics').value, milestones: el('pfMilestones').value, checklist: el('pfChecklist').value,
      });
    }
    el('pfHint').textContent = '✓ Created. It appears in the app after GitHub publishes (~1 min).';
    btn.textContent = 'Done';
    setTimeout(() => { el('projectSheet').hidden = true; btn.textContent = 'Create project'; }, 2600);
  } catch (e) {
    if (e.needToken) { el('projectSheet').hidden = true; openTokenSheet('Connect GitHub once, then create your project.'); }
    else { el('pfHint').textContent = '⚠︎ ' + e.message; el('pfHint').classList.add('err'); }
  } finally { btn.disabled = false; }
}
function openTokenSheet(hint) {
  el('tkInput').value = GH.token;
  el('tkHint').textContent = hint || (GH.token ? 'A token is saved on this device.' : '');
  el('tokenSheet').hidden = false;
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
    const over = p.budget && m.current > m.target;
    const barColor = over ? 'var(--crit)' : color;
    const mom = p.budget ? null : metricMomentum(m);
    const spark = (m.history && m.history.length > 1)
      ? `<div class="spark-row">${sparkline(m.history, over ? 'var(--crit)' : color)}
           ${mom ? `<span class="mom ${mom}">${MOM[mom]} ${mom === 'up' ? 'improving' : mom === 'down' ? 'slipping' : 'flat'}</span>` : ''}
         </div>`
      : '';
    let status = '';
    if (p.budget) {
      const left = round2(m.target - m.current);
      status = over
        ? `<span class="over-note">over by ${esc(fmtValue({ current: -left, unit: m.unit }, 'current'))}</span>`
        : `<span class="left-note">${esc(fmtValue({ current: left, unit: m.unit }, 'current'))} left</span>`;
    }
    return `<div class="metric">
      <div class="metric-top">
        <span class="name">${esc(m.label)} ${status}</span>
        <span class="nums"><b>${esc(fmtValue(m, 'current'))}</b> / ${esc(fmtValue(m, 'target'))}</span>
      </div>
      <div class="bar"><span style="width:${(pct * 100).toFixed(0)}%;background:${barColor}"></span></div>
      ${spark}
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
    ${metrics ? `<div class="section-label">${p.budget ? 'Budget · spent vs monthly limit' : 'Progress'}</div>${metrics}` : ''}
    ${milestones ? `<div class="section-label">Milestones</div><div class="timeline">${milestones}</div>` : ''}
    ${checklist ? `<div class="section-label">Checklist</div>${checklist}` : ''}
    ${p.path ? `<div class="detail-actions">
      <button class="btn ghost" id="importCsvBtn">⭳ Import CSV</button>
      <button class="btn ghost" id="editNoteBtn">✎ Edit note</button>
    </div>` : ''}
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
  el('editNoteBtn')?.addEventListener('click', () => openNoteEditor(p));
  el('importCsvBtn')?.addEventListener('click', () => openImportSheet(p));
}

/* ---------- edit / delete a project note ---------- */
let editingPath = null;
let editDeleteArmed = false;
function openNoteEditor(p) {
  editingPath = p.path;
  el('editArea').value = p.raw || '';
  el('editHint').textContent = ''; el('editHint').classList.remove('err');
  el('editDelete').textContent = 'Delete project'; editDeleteArmed = false;
  el('editSheet').hidden = false;
}

/* ---------- create projects from inside the app (writes to GitHub) ---------- */
const PROJECT_COLORS = ['#7c3aed', '#f97316', '#22c55e', '#38bdf8', '#14b8a6', '#eab308', '#ec4899', '#60a5fa'];
const GH = {
  get owner() {
    const h = location.hostname;
    return h.endsWith('github.io') ? h.split('.')[0] : 'okuyazu';
  },
  get repo() { return location.pathname.split('/').filter(Boolean)[0] || 'routine'; },
  branch: 'main',
  get token() { return localStorage.getItem('benchmarks:ghtoken:v1') || ''; },
  set token(v) {
    if (v) localStorage.setItem('benchmarks:ghtoken:v1', v);
    else localStorage.removeItem('benchmarks:ghtoken:v1');
  },
};
const b64encode = (s) => btoa(unescape(encodeURIComponent(s)));
const b64decode = (s) => decodeURIComponent(escape(atob(s.replace(/\s/g, ''))));
const ghHeaders = () => ({
  Authorization: `Bearer ${GH.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});
const ghUrl = (path) =>
  `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

async function ghError(res) {
  const map = { 401: 'Token invalid or expired.', 403: 'Token lacks “Contents: write” permission.', 404: 'Repo or file not found — check the token’s repository access.', 409: 'Conflict — try again.', 422: 'A project with that name may already exist.' };
  let extra = '';
  try { extra = (await res.json()).message || ''; } catch { /* ignore */ }
  return new Error(map[res.status] || `GitHub error ${res.status}. ${extra}`.trim());
}

// Turn the form fields into a Markdown project note (+ a seeded History table).
function buildProjectMd(f) {
  const clean = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);
  const out = ['---', `id: ${slugify(f.title)}`, `title: ${f.title}`];
  if (f.emoji) out.push(`emoji: ${f.emoji}`);
  if (f.color) out.push(`color: "${f.color}"`);
  if (f.target) out.push(`target: ${f.target}`);
  out.push('---', '');
  if (f.description) out.push(f.description, '');

  const metrics = clean(f.metrics).map((l) => l.replace(/^-\s*/, ''));
  if (metrics.length) { out.push('## Progress', ...metrics.map((m) => `- ${m}`), ''); }

  const ms = clean(f.milestones);
  if (ms.length) {
    out.push('## Milestones');
    for (const l of ms) {
      const [t, d] = l.replace(/^-\s*(\[[ x]\]\s*)?/, '').split('|').map((x) => (x || '').trim());
      out.push(`- [ ] ${t}${d ? ` 📅 ${d}` : ''}`);
    }
    out.push('');
  }
  const cl = clean(f.checklist);
  if (cl.length) { out.push('## Checklist', ...cl.map((l) => `- [ ] ${l.replace(/^-\s*(\[[ x]\]\s*)?/, '')}`), ''); }

  const parsed = parseMetrics(metrics.map((m) => `- ${m}`).join('\n'));
  if (parsed.length) {
    const today = new Date().toISOString().slice(0, 10);
    out.push('## History',
      `| date | ${parsed.map((p) => p.label).join(' | ')} |`,
      `|---|${parsed.map(() => '---').join('|')}|`,
      `| ${today} | ${parsed.map((p) => p.current).join(' | ')} |`, '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function ghGetFile(path) {
  const r = await fetch(ghUrl(path) + `?ref=${GH.branch}`, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw await ghError(r);
  const j = await r.json();
  return { sha: j.sha, text: b64decode(j.content) };
}
async function ghPutFile(path, text, message, sha) {
  const body = { message, content: b64encode(text), branch: GH.branch };
  if (sha) body.sha = sha;
  const r = await fetch(ghUrl(path), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw await ghError(r);
}
async function ghDeleteFile(path, message, sha) {
  const r = await fetch(ghUrl(path), { method: 'DELETE', headers: ghHeaders(), body: JSON.stringify({ message, sha, branch: GH.branch }) });
  if (!r.ok) throw await ghError(r);
}
function requireToken() { if (!GH.token) { const e = new Error('no-token'); e.needToken = true; throw e; } }

// Save an edited note (overwrites the file with the textarea contents).
async function saveNoteEdit(path, newText) {
  requireToken();
  const cur = await ghGetFile(path);
  await ghPutFile(path, newText.trim() + '\n', `Edit ${path.split('/').pop()}`, cur ? cur.sha : undefined);
}
// Delete a project note and remove it from the manifest.
async function deleteNoteAndUnlist(path) {
  requireToken();
  const cur = await ghGetFile(path);
  if (cur) await ghDeleteFile(path, `Delete ${path.split('/').pop()}`, cur.sha);
  const m = await ghGetFile('data/manifest.json');
  if (m) {
    const manifest = JSON.parse(m.text);
    manifest.projects = (manifest.projects || []).filter((p) => p !== path);
    await ghPutFile('data/manifest.json', JSON.stringify(manifest, null, 2) + '\n', `Unlist ${path.split('/').pop()}`, m.sha);
  }
}

// Commit projects/<Title>.md and add it to data/manifest.json.
async function commitNewProject(rawTitle, md) {
  if (!GH.token) { const e = new Error('no-token'); e.needToken = true; throw e; }
  const safeTitle = rawTitle.replace(/[\\/:*?"<>|#]/g, '').trim();
  if (!safeTitle) throw new Error('The note needs a title.');
  const path = `projects/${safeTitle}.md`;

  const head = await fetch(ghUrl(path) + `?ref=${GH.branch}`, { headers: ghHeaders() });
  if (head.ok) throw new Error('A project note with that name already exists.');
  if (head.status !== 404) throw await ghError(head);

  const put = await fetch(ghUrl(path), {
    method: 'PUT', headers: ghHeaders(),
    body: JSON.stringify({ message: `Add project: ${safeTitle}`, content: b64encode(md), branch: GH.branch }),
  });
  if (!put.ok) throw await ghError(put);

  const mres = await fetch(ghUrl('data/manifest.json') + `?ref=${GH.branch}`, { headers: ghHeaders() });
  if (!mres.ok) throw await ghError(mres);
  const mjson = await mres.json();
  const manifest = JSON.parse(b64decode(mjson.content));
  manifest.projects = manifest.projects || [];
  if (!manifest.projects.includes(path)) manifest.projects.push(path);
  const mput = await fetch(ghUrl('data/manifest.json'), {
    method: 'PUT', headers: ghHeaders(),
    body: JSON.stringify({ message: `List project: ${safeTitle}`, content: b64encode(JSON.stringify(manifest, null, 2) + '\n'), sha: mjson.sha, branch: GH.branch }),
  });
  if (!mput.ok) throw await ghError(mput);
  return safeTitle;
}
async function createProjectOnGitHub(form) {
  return commitNewProject(form.title, buildProjectMd(form));
}
// Leniently read a pasted note however an AI formatted it — missing --- fences,
// multiple keys on one line, a ``` code fence, etc. — into a project object.
function parseLoose(md) {
  let text = (md || '').replace(/^﻿/, '').trim();
  text = text.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```$/i, '').trim();
  // Read a frontmatter key's value whether keys are one-per-line OR several
  // crammed on one line — stop the value at the next known key or line end.
  const KEYS = 'id|title|emoji|color|target';
  const field = (key) => {
    const m = text.match(new RegExp('(?:^|[\\s>])' + key + ':\\s*(.+?)(?=\\s+(?:' + KEYS + '):|\\s*$)', 'im'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  const title = field('title') || ((text.match(/(?:^|\n)#\s+(.+)/) || [, ''])[1] || '').trim();
  const id = field('id');
  const emoji = field('emoji');
  const color = (field('color').match(/#[0-9a-fA-F]{3,8}/) || [''])[0];
  const target = (field('target').match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
  // Body = everything minus the frontmatter/key lines.
  let body = text.replace(/^---[\s\S]*?\n---\n?/, '');
  if (body === text) {
    body = text.split('\n')
      .filter((l) => !/^\s*(id|title|emoji|color|target)\s*:/i.test(l) && !/^\s*---\s*$/.test(l))
      .join('\n');
  }
  const { intro, sections } = splitSections(body.trim());
  return {
    id, title, emoji, color, target,
    description: intro.replace(/^#\s+.+\n?/, '').trim(),
    metrics: parseMetrics(sections.progress),
    milestones: parseTasks(sections.milestones).map((t) => ({ title: t.title, target: t.target, done: t.done })),
    checklist: parseTasks(sections.checklist).map((t) => ({ title: t.title, cadence: t.cadence, done: t.done })),
  };
}
// Re-serialize a project object into a clean, canonical note so the stored file
// is always valid regardless of how the AI formatted its reply.
function serializeNote(p) {
  const out = ['---', `id: ${p.id || slugify(p.title)}`, `title: ${p.title}`];
  if (p.emoji) out.push(`emoji: ${p.emoji}`);
  if (p.color) out.push(`color: "${p.color}"`);
  if (p.target) out.push(`target: ${p.target}`);
  out.push('---', '');
  if (p.description) out.push(p.description, '');
  if (p.metrics.length) out.push('## Progress',
    ...p.metrics.map((m) => `- ${m.label}: ${m.start} / ${m.current} / ${m.target}${m.unit ? ' ' + m.unit : ''}`), '');
  if (p.milestones.length) out.push('## Milestones',
    ...p.milestones.map((m) => `- [${m.done ? 'x' : ' '}] ${m.title}${m.target ? ` 📅 ${m.target}` : ''}`), '');
  if (p.checklist.length) out.push('## Checklist',
    ...p.checklist.map((c) => `- [${c.done ? 'x' : ' '}] ${c.title}${c.cadence ? ` (${c.cadence})` : ''}`), '');
  if (p.metrics.length) {
    const today = new Date().toISOString().slice(0, 10);
    out.push('## History', `| date | ${p.metrics.map((m) => m.label).join(' | ')} |`,
      `|---|${p.metrics.map(() => '---').join('|')}|`,
      `| ${today} | ${p.metrics.map((m) => m.current).join(' | ')} |`, '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
async function createProjectFromMarkdown(md) {
  const p = parseLoose(md);
  if (!p.title) throw new Error('Couldn’t find a title. The note needs a line like:  title: My Project');
  return commitNewProject(p.title, serializeNote(p));
}
// Prompt the user pastes at the end of any AI chat to get a ready-to-file note.
const CONVERT_PROMPT =
`Turn our conversation into ONE project for my "Benchmarks" app. Output only a Markdown note — no commentary — in exactly this format:

---
id: short-slug
title: <Project name>
emoji: <one emoji>
color: "#7c3aed"
target: <YYYY-MM-DD>
---
<one-line description>

## Progress
- <Metric>: <start> / <current> / <target> <unit>

## Milestones
- [ ] <Milestone> 📅 <YYYY-MM-DD>

## Checklist
- [ ] <Recurring task> (weekly)

Base the metrics, milestones, and dates on what we actually discussed.`;

/* ---------- CSV import (parsed on-device) ---------- */
function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const cand = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of line) if (ch in cand) cand[ch]++;
  return Object.keys(cand).sort((a, b) => cand[b] - cand[a])[0] || ',';
}
function parseCSV(text, delim) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
// Parse a money cell: handles "1,234.56", "-1,234", "(1,234)", "฿1,234", "1234-".
function csvNum(s) {
  if (s == null) return NaN;
  let t = String(s).trim(); if (!t) return NaN;
  const neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t);
  t = t.replace(/[^0-9.]/g, ''); if (t === '' || t === '.') return NaN;
  const n = parseFloat(t); return isNaN(n) ? NaN : (neg ? -n : n);
}
const round2 = (x) => Math.round(x * 100) / 100;
function analyzeColumn(rows, col) {
  const v = rows.slice(1).map((r) => csvNum(r[col])).filter((n) => !isNaN(n));
  return {
    count: v.length,
    sum: round2(v.reduce((a, b) => a + b, 0)),
    out: round2(v.filter((x) => x < 0).reduce((a, b) => a + Math.abs(b), 0)),
    in: round2(v.filter((x) => x > 0).reduce((a, b) => a + b, 0)),
  };
}
function isDateLikeCol(rows, col) {
  const cells = rows.slice(1).map((r) => (r[col] || '').trim()).filter(Boolean);
  if (!cells.length) return false;
  return cells.filter((c) => /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(c)).length / cells.length > 0.5;
}
function autoDetectAmountCol(rows) {
  const hdr = rows[0].map((h) => String(h).toLowerCase());
  let best = 0, score = -1;
  for (let c = 0; c < rows[0].length; c++) {
    if (isDateLikeCol(rows, c)) continue;
    if (/balance|running|bal\.|remaining/.test(hdr[c])) continue; // never a balance column
    const a = analyzeColumn(rows, c); if (a.count === 0) continue;
    // Trust column names first; fall back to numeric density + a small magnitude nudge.
    let s = a.count + Math.min(a.out + a.in, 1e5) / 1e5;
    if (/withdraw|debit|amount|expense|paid|spend|\bout\b|\bdr\b/.test(hdr[c])) s += 1e6;
    else if (/deposit|credit|income|\bin\b|\bcr\b/.test(hdr[c])) s += 5e5;
    if (s > score) { score = s; best = c; }
  }
  return best;
}
// Set a metric's "current" (middle number) in a note's ## Progress line.
function setMetricCurrentInNote(raw, label, value) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^(-\\s*' + esc(label) + ':\\s*-?[\\d.]+\\s*/\\s*)(-?[\\d.]+)(\\s*/\\s*-?[\\d.]+.*)$', 'm');
  if (!re.test(raw)) return null;
  return raw.replace(re, (m, a, cur, c) => a + round2(value) + c);
}
const fmtMoney = (n) => round2(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

let importProject = null, csvRows = [];
function openImportSheet(p) {
  importProject = p;
  el('csvFile').value = ''; el('csvResult').hidden = true;
  el('csvHint').textContent = ''; el('csvHint').classList.remove('err');
  el('importSheet').hidden = false;
}
function loadCsv(text) {
  const rows = parseCSV(text, detectDelimiter(text));
  if (rows.length < 2) { el('csvHint').textContent = '⚠︎ That CSV looks empty.'; el('csvHint').classList.add('err'); return; }
  csvRows = rows;
  const headers = rows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
  const opts = headers.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('');
  el('csvAmountCol').innerHTML = opts;
  el('csvAmountCol').value = String(autoDetectAmountCol(rows));
  const budget = !!importProject.budget;
  el('csvDescField').hidden = !budget;
  el('csvSingleBlock').hidden = budget;
  el('csvBudgetBlock').hidden = !budget;
  if (budget) {
    el('csvDescCol').innerHTML = opts;
    el('csvDescCol').value = String(autoDetectDescCol(rows));
    updateBudgetBreakdown();
  } else {
    el('csvMetric').innerHTML = (importProject.metrics || []).length
      ? importProject.metrics.map((m) => `<option value="${esc(m.label)}">${esc(m.label)}</option>`).join('')
      : '<option value="">(this project has no metrics)</option>';
    onAmountColChange();
  }
  el('csvResult').hidden = false;
}
function renderCsvSummary(col) {
  const a = analyzeColumn(csvRows, col);
  el('csvSummary').innerHTML =
    `<div class="csv-stat"><span>${a.count}</span><label>transactions</label></div>
     <div class="csv-stat"><span>${fmtMoney(a.out)}</span><label>money out</label></div>
     <div class="csv-stat"><span>${fmtMoney(a.in)}</span><label>money in</label></div>`;
  return a;
}
// Pick a sensible default figure for the chosen column: money-out when the
// column is signed (has negatives), otherwise the plain sum (debit-only column).
function onAmountColChange() {
  const a = analyzeColumn(csvRows, +el('csvAmountCol').value);
  el('csvFigure').value = a.out > 0 ? 'out' : 'sum';
  updateCsvSummary();
}
function updateCsvSummary() {
  const a = renderCsvSummary(+el('csvAmountCol').value);
  const fig = el('csvFigure').value;
  const val = fig === 'count' ? a.count : a[fig];
  const metric = (importProject.metrics || []).find((m) => m.label === el('csvMetric').value);
  el('csvPreview').textContent = metric ? `${metric.label}:  ${metric.current} → ${round2(val)}` : 'No metric to update in this project.';
}
// spent-per-category for the current column choices (routes unmatched into "Other")
function budgetSpend() {
  const { totals, other } = summarizeByCategory(csvRows, +el('csvAmountCol').value, +el('csvDescCol').value, importProject.rules || []);
  const perMetric = {};
  for (const m of importProject.metrics || []) {
    perMetric[m.label] = round2((totals[m.label] || 0) + (m.label.toLowerCase() === 'other' ? other : 0));
  }
  const hasOther = (importProject.metrics || []).some((m) => m.label.toLowerCase() === 'other');
  return { perMetric, unmatched: hasOther ? 0 : other };
}
function updateBudgetBreakdown() {
  renderCsvSummary(+el('csvAmountCol').value);
  const month = detectMonth(csvRows);
  el('csvMonth').textContent = `Month: ${month} · ${csvRows.length - 1} transactions → each category below`;
  const { perMetric, unmatched } = budgetSpend();
  const color = importProject.color || '#22c55e';
  let html = (importProject.metrics || []).map((m) => {
    const spent = perMetric[m.label] || 0;
    const over = spent > m.target;
    const pct = m.target > 0 ? Math.min(spent / m.target, 1) * 100 : (spent > 0 ? 100 : 0);
    return `<div class="bk-row">
      <div class="bk-top"><span>${esc(m.label)}</span><span class="bk-nums ${over ? 'over' : ''}">${fmtMoney(spent)} / ${fmtMoney(m.target)}${over ? ' ⚠' : ''}</span></div>
      <div class="bar"><span style="width:${pct.toFixed(0)}%;background:${over ? 'var(--crit)' : esc(color)}"></span></div>
    </div>`;
  }).join('');
  if (unmatched > 0) html += `<div class="bk-row"><div class="bk-top"><span>Uncategorized</span><span class="bk-nums">${fmtMoney(unmatched)}</span></div><p class="muted small" style="text-align:left;margin:4px 0 0">Add keywords in the note's ## Rules to sort these.</p></div>`;
  el('csvBreakdown').innerHTML = html || '<p class="muted small">This budget has no categories yet.</p>';
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
let lastLoad = 0;
async function boot() {
  view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading your benchmarks…</div>`;
  try {
    await loadData();
    handleShareTarget();
    updateInboxBadge();
    router();
    lastLoad = Date.now();
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

// New-project + GitHub connection sheets
el('pfCancel').addEventListener('click', () => { el('projectSheet').hidden = true; });
el('projectSheet').addEventListener('click', (e) => { if (e.target === el('projectSheet')) el('projectSheet').hidden = true; });
el('pfCreate').addEventListener('click', submitProject);
el('pfToggle').addEventListener('click', (e) => { e.preventDefault(); setPasteMode(el('pfPasteWrap').hidden); });
el('pfCopyPrompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(CONVERT_PROMPT); el('pfHint').textContent = 'Prompt copied — paste it at the end of your AI chat, then paste its reply above.'; }
  catch { el('pfPaste').value = CONVERT_PROMPT; el('pfHint').textContent = 'Copy the prompt text above and paste it into your AI chat.'; }
});
el('pfConnLink').addEventListener('click', (e) => { e.preventDefault(); el('projectSheet').hidden = true; openTokenSheet(); });
el('tkSave').addEventListener('click', () => {
  GH.token = el('tkInput').value.trim();
  el('tkHint').textContent = GH.token ? 'Saved on this device ✓' : 'Enter a token to save.';
  if (GH.token) setTimeout(() => { el('tokenSheet').hidden = true; openProjectForm(); }, 700);
});
el('tkClear').addEventListener('click', () => { GH.token = ''; el('tkInput').value = ''; el('tkHint').textContent = 'Removed from this device.'; });
el('tokenSheet').addEventListener('click', (e) => { if (e.target === el('tokenSheet')) el('tokenSheet').hidden = true; });

// CSV import sheet
el('csvCancel').addEventListener('click', () => { el('importSheet').hidden = true; });
el('importSheet').addEventListener('click', (e) => { if (e.target === el('importSheet')) el('importSheet').hidden = true; });
el('csvFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { loadCsv(String(rd.result)); } catch { el('csvHint').textContent = '⚠︎ Could not read that file.'; el('csvHint').classList.add('err'); } };
  rd.onerror = () => { el('csvHint').textContent = '⚠︎ Could not read that file.'; el('csvHint').classList.add('err'); };
  rd.readAsText(f);
});
el('csvAmountCol').addEventListener('change', () => (importProject.budget ? updateBudgetBreakdown() : onAmountColChange()));
el('csvDescCol').addEventListener('change', updateBudgetBreakdown);
['csvFigure', 'csvMetric'].forEach((id) => el(id).addEventListener('change', updateCsvSummary));
el('csvApply').addEventListener('click', async () => {
  const btn = el('csvApply');
  btn.disabled = true; el('csvHint').classList.remove('err'); el('csvHint').textContent = 'Applying…';
  try {
    requireToken();
    let raw = importProject.raw, message;
    if (importProject.budget) {
      const { perMetric } = budgetSpend();
      const month = detectMonth(csvRows);
      for (const m of importProject.metrics || []) {
        const updated = setMetricCurrentInNote(raw, m.label, perMetric[m.label] || 0);
        if (updated) raw = updated;
      }
      raw = upsertHistoryRow(raw, month, perMetric);
      message = `Budget import for ${month}`;
    } else {
      const label = el('csvMetric').value;
      if (!label) throw new Error('This project has no metric to update. Add one first (Edit note).');
      const a = analyzeColumn(csvRows, +el('csvAmountCol').value);
      const fig = el('csvFigure').value;
      const updated = setMetricCurrentInNote(raw, label, fig === 'count' ? a.count : a[fig]);
      if (!updated) throw new Error('Couldn’t find that metric line in the note.');
      raw = updated; message = `Import CSV → ${label}`;
    }
    const cur = await ghGetFile(importProject.path);
    await ghPutFile(importProject.path, raw.trim() + '\n', message, cur ? cur.sha : undefined);
    el('csvHint').textContent = '✓ Updated. Appears after GitHub publishes (~1 min).';
    setTimeout(() => { el('importSheet').hidden = true; }, 2400);
  } catch (e) {
    if (e.needToken) { el('importSheet').hidden = true; openTokenSheet('Connect GitHub once, then import.'); }
    else { el('csvHint').textContent = '⚠︎ ' + e.message; el('csvHint').classList.add('err'); }
  } finally { btn.disabled = false; }
});

// Edit-note sheet
el('editCancel').addEventListener('click', () => { el('editSheet').hidden = true; });
el('editSheet').addEventListener('click', (e) => { if (e.target === el('editSheet')) el('editSheet').hidden = true; });
el('editSave').addEventListener('click', async () => {
  const btn = el('editSave');
  btn.disabled = true; el('editHint').classList.remove('err'); el('editHint').textContent = 'Saving…';
  try {
    await saveNoteEdit(editingPath, el('editArea').value);
    el('editHint').textContent = '✓ Saved. Changes appear after GitHub publishes (~1 min).';
    setTimeout(() => { el('editSheet').hidden = true; }, 2400);
  } catch (e) {
    if (e.needToken) { el('editSheet').hidden = true; openTokenSheet('Connect GitHub once, then edit your project.'); }
    else { el('editHint').textContent = '⚠︎ ' + e.message; el('editHint').classList.add('err'); }
  } finally { btn.disabled = false; }
});
el('editDelete').addEventListener('click', async () => {
  if (!editDeleteArmed) { editDeleteArmed = true; el('editDelete').textContent = 'Tap again to confirm delete'; return; }
  const btn = el('editDelete');
  btn.disabled = true; el('editHint').classList.remove('err'); el('editHint').textContent = 'Deleting…';
  try {
    await deleteNoteAndUnlist(editingPath);
    el('editHint').textContent = '✓ Deleted. It disappears after GitHub publishes (~1 min).';
    setTimeout(() => { el('editSheet').hidden = true; location.hash = ''; }, 2000);
  } catch (e) {
    if (e.needToken) { el('editSheet').hidden = true; openTokenSheet('Connect GitHub once to delete this project.'); }
    else { el('editHint').textContent = '⚠︎ ' + e.message; el('editHint').classList.add('err'); btn.textContent = 'Delete project'; editDeleteArmed = false; }
  } finally { btn.disabled = false; }
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

// Re-fetch data when the app is reopened/refocused (so edits made elsewhere,
// or by me, show up without a manual reload). Guarded so it only runs when the
// app has been in the background a while and no sheet is open.
async function refreshData() {
  const sheetOpen = [...document.querySelectorAll('.sheet-backdrop')].some((s) => !s.hidden);
  if (sheetOpen) return;
  try { await loadData(); updateInboxBadge(); router(); lastLoad = Date.now(); } catch { /* offline: keep showing current */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastLoad > 15000) refreshData();
});

/* ---------- service worker (auto-updating) ---------- */
if ('serviceWorker' in navigator) {
  // When a new service worker takes over, reload once so the newest app loads.
  let reloading = false;
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return; reloading = true; location.reload();
    });
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => { reg.update(); setInterval(() => reg.update(), 60 * 60 * 1000); })
      .catch(() => {});
  });
}
