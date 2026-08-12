'use strict';
/* Money — a finance view over the same Markdown vault as Benchmarks.
 * Data lives in ../money/*.md : accounts.md, budget.md, and one YYYY-MM.md
 * ledger per month. Writes go straight to GitHub with the shared token. */

const el = (id) => document.getElementById(id);
const view = el('view');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = (x) => Math.round((+x || 0) * 100) / 100;
const money = (n) => `฿${round2(Math.abs(n)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/* ---------- GitHub (token shared with the Benchmarks app) ---------- */
const GH = {
  get owner() { const h = location.hostname; return h.endsWith('github.io') ? h.split('.')[0] : 'okuyazu'; },
  get repo() { return location.pathname.split('/').filter(Boolean)[0] || 'routine'; },
  branch: 'main',
  get token() { return localStorage.getItem('benchmarks:ghtoken:v1') || ''; },
  set token(v) { if (v) localStorage.setItem('benchmarks:ghtoken:v1', v); else localStorage.removeItem('benchmarks:ghtoken:v1'); },
};
const b64encode = (s) => btoa(unescape(encodeURIComponent(s)));
const b64decode = (s) => decodeURIComponent(escape(atob(s.replace(/\s/g, ''))));
const ghHeaders = () => ({ Authorization: `Bearer ${GH.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const ghUrl = (p) => `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
async function ghError(res) {
  const map = { 401: 'Token invalid or expired.', 403: 'Token lacks “Contents: write”.', 404: 'Not found — check the token’s repo access.', 409: 'Conflict — try again.', 422: 'Rejected by GitHub.' };
  let extra = ''; try { extra = (await res.json()).message || ''; } catch { /* */ }
  return new Error(map[res.status] || `GitHub error ${res.status}. ${extra}`);
}
function requireToken() { if (!GH.token) { const e = new Error('no-token'); e.needToken = true; throw e; } }
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

/* ---------- Markdown helpers ---------- */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? text.slice(m[0].length) : text;
}
function parseTable(md) {
  const lines = (md || '').split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return { headers: [], rows: [] };
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = cells(lines[0]).map((h) => h.toLowerCase());
  const rows = [];
  for (const l of lines.slice(1)) {
    if (/^[\s|:\-]+$/.test(l.trim())) continue;
    const c = cells(l); const o = {}; headers.forEach((h, i) => { o[h] = c[i] !== undefined ? c[i] : ''; });
    rows.push(o);
  }
  return { headers, rows };
}
function parseRules(md) {
  const m = md.match(/##\s*Rules\s*([\s\S]*?)(?=\n##\s|$)/i);
  const rules = [];
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^\s*-\s*(.+?):\s*(.+)$/);
    if (mm) rules.push({ category: mm[1].trim(), keywords: mm[2].split(',').map((k) => k.trim().toLowerCase()).filter(Boolean) });
  }
  return rules;
}
function categorize(desc, rules) {
  const d = String(desc || '').toLowerCase();
  for (const r of rules) if (r.keywords.some((k) => k && d.includes(k))) return r.category;
  return 'Other';
}

/* ---------- state ---------- */
let ACCOUNTS = [], CATS = [], RULES = [], LEDGERS = {}, MONTHS = [];
let TAB = 'overview';
const CUR_MONTH = new Date().toISOString().slice(0, 7);
let selMonth = CUR_MONTH;
const bust = () => `?t=${Date.now()}`;
const monthName = (m) => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
const parseLedger = (md) => parseTable(md).rows
  .map((r) => ({ date: r.date, description: r.description, amount: +r.amount || 0, category: r.category, account: r.account }))
  .filter((t) => t.date);

async function load() {
  const [acc, bud] = await Promise.all([
    fetch(`../money/accounts.md${bust()}`).then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch(`../money/budget.md${bust()}`).then((r) => r.ok ? r.text() : '').catch(() => ''),
  ]);
  ACCOUNTS = parseTable(acc).rows.map((r) => ({ name: r.account, type: r.type, balance: +r.balance || 0 }));
  CATS = parseTable(bud).rows.map((r) => ({ category: r.category, monthly: +r.monthly || 0 }));
  RULES = parseRules(bud);
  const idx = await fetch(`../money/index.json${bust()}`).then((r) => r.ok ? r.json() : null).catch(() => null);
  let cand = (idx && Array.isArray(idx.months)) ? idx.months.slice() : [];
  if (!cand.includes(CUR_MONTH)) cand.push(CUR_MONTH); // always try the current month
  cand = [...new Set(cand)].sort();
  const texts = await Promise.all(cand.map((m) => fetch(`../money/${m}.md${bust()}`).then((r) => r.ok ? r.text() : null).catch(() => null)));
  LEDGERS = {};
  cand.forEach((m, i) => { if (texts[i] && /\|\s*date\s*\|/i.test(texts[i])) LEDGERS[m] = parseLedger(texts[i]); });
  MONTHS = Object.keys(LEDGERS).sort();
  if (!MONTHS.includes(selMonth)) selMonth = MONTHS[MONTHS.length - 1] || CUR_MONTH;
}
async function writeIndex() {
  const path = 'money/index.json';
  const cur = await ghGetFile(path);
  await ghPutFile(path, JSON.stringify({ months: MONTHS }, null, 2) + '\n', 'Update money index', cur ? cur.sha : undefined);
}
const txOf = (m) => LEDGERS[m] || [];
function monthStats(m) {
  let income = 0, expense = 0; const byCat = {};
  for (const t of txOf(m)) {
    if (t.amount >= 0) income += t.amount;
    else { expense += -t.amount; byCat[t.category] = round2((byCat[t.category] || 0) + -t.amount); }
  }
  return { income: round2(income), expense: round2(expense), net: round2(income - expense), byCat };
}
function monthSwitcher() {
  const i = MONTHS.indexOf(selMonth);
  const prev = i > 0 ? MONTHS[i - 1] : '';
  const next = i >= 0 && i < MONTHS.length - 1 ? MONTHS[i + 1] : '';
  return `<div class="mswitch">
    <button ${prev ? `data-m="${prev}"` : 'disabled'}>‹</button>
    <span>${esc(monthName(selMonth))}</span>
    <button ${next ? `data-m="${next}"` : 'disabled'}>›</button></div>`;
}
function wireSwitcher() {
  view.querySelectorAll('.mswitch button[data-m]').forEach((b) => b.addEventListener('click', () => { selMonth = b.dataset.m; render(); }));
}

/* ---------- views ---------- */
function renderOverview() {
  const total = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const st = monthStats(selMonth);
  const accRows = ACCOUNTS.map((a) => `<div class="row-card"><div class="main"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.type || '')}</div></div>
    <div class="amt ${a.balance < 0 ? 'neg' : 'pos'}">${a.balance < 0 ? '−' : ''}${money(a.balance)}</div></div>`).join('');
  const budRows = CATS.map((c) => {
    const spent = st.byCat[c.category] || 0; const over = spent > c.monthly;
    const pct = c.monthly > 0 ? Math.min(spent / c.monthly, 1) * 100 : (spent > 0 ? 100 : 0);
    return `<div class="bcat"><div class="top"><span>${esc(c.category)}</span><span class="nums ${over ? 'over' : ''}">${money(spent)} / ${money(c.monthly)}${over ? ' ⚠' : ''}</span></div>
      <div class="bar"><span style="width:${pct.toFixed(0)}%;background:${over ? 'var(--crit)' : 'var(--accent)'}"></span></div></div>`;
  }).join('');
  view.innerHTML = `
    <div class="hero"><div class="lab">Total balance across ${ACCOUNTS.length} account${ACCOUNTS.length === 1 ? '' : 's'}</div>
      <div class="bal">${total < 0 ? '−' : ''}${money(total)}</div>
      ${monthSwitcher()}
      <div class="trio">
        <div class="cell in"><span class="n">${money(st.income)}</span><span class="l">In</span></div>
        <div class="cell out"><span class="n">${money(st.expense)}</span><span class="l">Out</span></div>
        <div class="cell"><span class="n">${st.net < 0 ? '−' : ''}${money(st.net)}</span><span class="l">Net</span></div>
      </div>
    </div>
    <div class="section-label">Accounts</div>${accRows || '<div class="empty">No accounts yet.</div>'}
    <div class="section-label">Budget · ${esc(monthName(selMonth))}</div>${budRows || '<div class="empty">No budget categories.</div>'}`;
  wireSwitcher();
}
function renderTx() {
  const list = [...txOf(selMonth)].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = list.map((t) => `<div class="row-card">
    <div class="main"><div class="t">${esc(t.description || '(no description)')}</div>
      <div class="s">${esc(t.date)} · ${esc(t.category || '—')} · ${esc(t.account || '—')}</div></div>
    <div class="amt ${t.amount < 0 ? 'neg' : 'pos'}">${t.amount < 0 ? '−' : '+'}${money(t.amount)}</div></div>`).join('');
  view.innerHTML = `${monthSwitcher()}
    <div class="section-label">${list.length} transactions</div>
    <div class="field-row" style="margin-bottom:12px">
      <button class="btn ghost" id="importBtn" style="flex:1">⭳ CSV</button>
      <button class="btn ghost" id="importImgBtn" style="flex:1">📷 Screenshot</button>
    </div>
    ${rows || '<div class="empty">No transactions this month. Tap ＋ to add one.</div>'}`;
  wireSwitcher();
  el('importBtn').addEventListener('click', openCsv);
  el('importImgBtn').addEventListener('click', openImg);
}
function renderBudget() {
  const st = monthStats(selMonth);
  const rows = CATS.map((c) => {
    const spent = st.byCat[c.category] || 0; const over = spent > c.monthly; const left = round2(c.monthly - spent);
    const pct = c.monthly > 0 ? Math.min(spent / c.monthly, 1) * 100 : (spent > 0 ? 100 : 0);
    return `<div class="bcat"><div class="top"><span>${esc(c.category)}${over ? '' : ` <span class="muted">${money(left)} left</span>`}</span>
      <span class="nums ${over ? 'over' : ''}">${money(spent)} / ${money(c.monthly)}${over ? ` · over ${money(-left)}` : ''}</span></div>
      <div class="bar"><span style="width:${pct.toFixed(0)}%;background:${over ? 'var(--crit)' : 'var(--accent)'}"></span></div></div>`;
  }).join('');
  const uncategorized = st.byCat.Other || 0;
  view.innerHTML = `${monthSwitcher()}<div class="section-label">Budget</div>${rows || '<div class="empty">No categories.</div>'}
    ${uncategorized ? `<p class="muted small">${money(uncategorized)} in “Other”. Add keywords to money/budget.md → ## Rules to sort it.</p>` : ''}`;
  wireSwitcher();
}
function renderReports() {
  const months = MONTHS.slice(-6);
  const stats = months.map((m) => ({ m, ...monthStats(m) }));
  const maxFlow = Math.max(1, ...stats.map((s) => Math.max(s.income, s.expense)));
  const flow = stats.map((s) => `<div class="mrow">
    <div class="mlab">${esc(monthName(s.m).replace(/ \d+$/, ''))}</div>
    <div class="mbars">
      <div class="mbar"><span class="fill in" style="width:${(s.income / maxFlow * 100).toFixed(0)}%"></span><b>${money(s.income)}</b></div>
      <div class="mbar"><span class="fill out" style="width:${(s.expense / maxFlow * 100).toFixed(0)}%"></span><b>${money(s.expense)}</b></div>
    </div>
    <div class="mnet ${s.net < 0 ? 'neg' : 'pos'}">${s.net < 0 ? '−' : '+'}${money(s.net)}</div>
  </div>`).join('');
  const st = monthStats(selMonth);
  const cats = Object.entries(st.byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));
  const catBars = cats.map(([name, amt]) => `<div class="bcat"><div class="top"><span>${esc(name)}</span><span class="nums">${money(amt)}</span></div>
    <div class="bar"><span style="width:${(amt / maxCat * 100).toFixed(0)}%;background:var(--accent)"></span></div></div>`).join('');
  view.innerHTML = `
    <div class="section-label">Cashflow · last ${months.length} month${months.length === 1 ? '' : 's'}</div>
    <div class="legend"><span><i class="in"></i>In</span><span><i class="out"></i>Out</span></div>
    <div class="report-card">${flow || '<div class="empty">No data.</div>'}</div>
    ${monthSwitcher()}
    <div class="section-label">Spending by category</div>
    <div class="report-card">${catBars || '<div class="empty">No spending in ' + esc(monthName(selMonth)) + '.</div>'}</div>`;
  wireSwitcher();
}
function render() {
  view.scrollTo?.(0, 0);
  ({ tx: renderTx, budget: renderBudget, reports: renderReports }[TAB] || renderOverview)();
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === TAB));
}

/* ---------- add transaction ---------- */
let txKind = 'expense';
function openTx() {
  txKind = 'expense';
  document.querySelectorAll('#txKind button').forEach((b) => b.classList.toggle('on', b.dataset.kind === 'expense'));
  el('txDate').value = new Date().toISOString().slice(0, 10);
  el('txAmount').value = ''; el('txDesc').value = ''; el('txHint').textContent = ''; el('txHint').classList.remove('err');
  el('txCategory').innerHTML = ['Income', ...CATS.map((c) => c.category), 'Other']
    .filter((v, i, a) => a.indexOf(v) === i).map((c) => `<option>${esc(c)}</option>`).join('');
  el('txAccount').innerHTML = ACCOUNTS.map((a) => `<option>${esc(a.name)}</option>`).join('') || '<option>Cash</option>';
  el('txSheet').hidden = false;
}
function ledgerHeader(month) {
  return `---\ntype: ledger\nmonth: ${month}\n---\n\n# ${monthName(month)}\n\n| date | description | amount | category | account |\n|---|---|---|---|---|\n`;
}
function appendLedgerRow(md, t, month) {
  const line = `| ${t.date} | ${t.description.replace(/\|/g, '/')} | ${t.amount} | ${t.category} | ${t.account} |`;
  if (!md || !/\|\s*date\s*\|/i.test(md)) return ledgerHeader(month) + line + '\n';
  const lines = md.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim().startsWith('|')) last = i;
  lines.splice(last + 1, 0, line);
  return lines.join('\n');
}
function rememberTx(month, list) {
  LEDGERS[month] = [...(LEDGERS[month] || []), ...list];
  const isNew = !MONTHS.includes(month);
  if (isNew) { MONTHS.push(month); MONTHS.sort(); }
  return isNew;
}
async function saveTx() {
  const amt = Math.abs(parseFloat(el('txAmount').value));
  if (isNaN(amt) || amt === 0) { el('txHint').textContent = 'Enter an amount.'; el('txHint').classList.add('err'); return; }
  const t = {
    date: el('txDate').value || new Date().toISOString().slice(0, 10),
    description: el('txDesc').value.trim() || '(no description)',
    amount: txKind === 'income' ? amt : -amt,
    category: txKind === 'income' ? 'Income' : el('txCategory').value,
    account: el('txAccount').value || 'Cash',
  };
  const month = t.date.slice(0, 7);
  const btn = el('txSave'); btn.disabled = true; el('txHint').classList.remove('err'); el('txHint').textContent = 'Saving…';
  try {
    requireToken();
    const path = `money/${month}.md`;
    const cur = await ghGetFile(path);
    await ghPutFile(path, appendLedgerRow(cur ? cur.text : '', t, month), `Add transaction: ${t.description}`, cur ? cur.sha : undefined);
    const isNew = rememberTx(month, [t]); selMonth = month;
    if (isNew) { try { await writeIndex(); } catch { /* index is best-effort */ } }
    el('txSheet').hidden = true; render();
  } catch (e) {
    if (e.needToken) { el('txSheet').hidden = true; openToken('Connect GitHub once, then add transactions.'); }
    else { el('txHint').textContent = '⚠︎ ' + e.message; el('txHint').classList.add('err'); }
  } finally { btn.disabled = false; }
}

/* ---------- CSV import ---------- */
function detectDelimiter(t) { const l = t.split(/\r?\n/).find((x) => x.trim()) || ''; const c = { ',': 0, ';': 0, '\t': 0 }; for (const ch of l) if (ch in c) c[ch]++; return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ','; }
function parseCSV(t, d) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === d) { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; } if (f.length || row.length) { row.push(f); rows.push(row); } return rows.filter((r) => r.some((x) => x.trim() !== '')); }
function stripPreamble(rows) { if (rows.length < 3) return rows; const len = {}; rows.forEach((r) => { len[r.length] = (len[r.length] || 0) + 1; }); const w = +Object.keys(len).sort((a, b) => len[b] - len[a] || (+b) - (+a))[0]; for (let i = 0; i < rows.length - 1; i++) if (rows[i].length === w && rows[i + 1].length === w) return rows.slice(i); return rows; }
function csvNum(s) { if (s == null) return NaN; let t = String(s).trim(); if (!t) return NaN; const neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t); t = t.replace(/[^0-9.]/g, ''); if (!t || t === '.') return NaN; const n = parseFloat(t); return isNaN(n) ? NaN : (neg ? -n : n); }
function isDateCol(rows, c) { const cs = rows.slice(1).map((r) => (r[c] || '').trim()).filter(Boolean); return cs.length && cs.filter((x) => /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(x)).length / cs.length > 0.5; }
function findDateCol(rows) { for (let c = 0; c < rows[0].length; c++) if (isDateCol(rows, c)) return c; return -1; }
function autoAmount(rows) { const h = rows[0].map((x) => String(x).toLowerCase()); let best = 0, sc = -1; for (let c = 0; c < rows[0].length; c++) { if (isDateCol(rows, c)) continue; if (/balance|remaining|bal\b/.test(h[c])) continue; const v = rows.slice(1).map((r) => csvNum(r[c])).filter((n) => !isNaN(n)); if (!v.length) continue; let s = v.length; if (/withdraw|debit|amount|expense|paid|spend/.test(h[c])) s += 1e6; else if (/deposit|credit/.test(h[c])) s += 5e5; if (s > sc) { sc = s; best = c; } } return best; }
function autoDesc(rows) { let best = 0, sc = -1; for (let c = 0; c < rows[0].length; c++) { if (isDateCol(rows, c)) continue; const cells = rows.slice(1).map((r) => (r[c] || '').trim()); const numeric = cells.filter((x) => x && !isNaN(csvNum(x))).length; if (numeric > cells.length / 2) continue; const avg = cells.reduce((a, b) => a + b.length, 0) / (cells.length || 1); if (avg > sc) { sc = avg; best = c; } } return best; }
let csvRows = [];
function openCsv() { el('csvFile').value = ''; el('csvResult').hidden = true; el('csvHint').textContent = ''; el('csvHint').classList.remove('err'); el('csvSheet').hidden = false; }
function loadCsv(text) {
  const rows = stripPreamble(parseCSV(text, detectDelimiter(text)));
  if (rows.length < 2) { el('csvHint').textContent = '⚠︎ That CSV looks empty.'; el('csvHint').classList.add('err'); return; }
  csvRows = rows;
  const opts = rows[0].map((h, i) => `<option value="${i}">${esc(h || 'Column ' + (i + 1))}</option>`).join('');
  el('csvAmount').innerHTML = opts; el('csvAmount').value = String(autoAmount(rows));
  el('csvDesc').innerHTML = opts; el('csvDesc').value = String(autoDesc(rows));
  el('csvAccount').innerHTML = ACCOUNTS.map((a) => `<option>${esc(a.name)}</option>`).join('') || '<option>Cash</option>';
  el('csvResult').hidden = false;
  updateCsvPreview();
}
function csvTransactions() {
  const ac = +el('csvAmount').value, dc = +el('csvDesc').value, sign = el('csvSign').value, account = el('csvAccount').value;
  const vals = csvRows.slice(1).map((r) => csvNum(r[ac]));
  const signed = sign === 'signed' || (sign === 'auto' && vals.some((n) => !isNaN(n) && n < 0));
  const dateCol = findDateCol(csvRows);
  const out = [];
  csvRows.slice(1).forEach((r, i) => {
    const n = vals[i]; if (isNaN(n) || n === 0) return;
    let amount; // negative = expense
    if (signed) amount = n; else amount = -Math.abs(n); // debit-only → all expense
    const desc = (r[dc] || '').trim();
    let date = (dateCol >= 0 ? String(r[dateCol]) : '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    date = date ? `${date[1]}-${String(+date[2]).padStart(2, '0')}-${String(+date[3]).padStart(2, '0')}` : `${CUR_MONTH}-01`;
    const category = amount >= 0 ? 'Income' : categorize(desc, RULES);
    out.push({ date, description: desc || '(no description)', amount: round2(amount), category, account });
  });
  return out;
}
function updateCsvPreview() {
  const tx = csvTransactions();
  const exp = tx.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const inc = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  el('csvSummary').textContent = `${tx.length} transactions · ${money(exp)} out · ${money(inc)} in → into this month`;
  const head = csvRows[0].map((h) => `<th>${esc(h || '')}</th>`).join('');
  const body = csvRows.slice(1, 5).map((r) => `<tr>${csvRows[0].map((_, i) => `<td>${esc(r[i] || '')}</td>`).join('')}</tr>`).join('');
  el('csvPreview').innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
async function applyCsv() {
  const tx = csvTransactions();
  if (!tx.length) { el('csvHint').textContent = '⚠︎ No transactions found — check the Amount column.'; el('csvHint').classList.add('err'); return; }
  const btn = el('csvApply'); btn.disabled = true; el('csvHint').classList.remove('err'); el('csvHint').textContent = 'Adding…';
  try {
    requireToken();
    const byMonth = {};
    for (const t of tx) (byMonth[t.date.slice(0, 7)] ||= []).push(t);
    let anyNew = false;
    for (const [month, list] of Object.entries(byMonth)) {
      const path = `money/${month}.md`;
      const cur = await ghGetFile(path);
      let md = cur ? cur.text : '';
      for (const t of list) md = appendLedgerRow(md, t, month);
      await ghPutFile(path, md, `Import ${list.length} transactions for ${month}`, cur ? cur.sha : undefined);
      if (rememberTx(month, list)) anyNew = true;
    }
    if (anyNew) { try { await writeIndex(); } catch { /* index is best-effort */ } }
    selMonth = Object.keys(byMonth).sort().pop() || selMonth;
    el('csvSheet').hidden = true; TAB = 'tx'; render();
  } catch (e) {
    if (e.needToken) { el('csvSheet').hidden = true; openToken('Connect GitHub once, then import.'); }
    else { el('csvHint').textContent = '⚠︎ ' + e.message; el('csvHint').classList.add('err'); }
  } finally { btn.disabled = false; }
}

/* ---------- screenshot import (on-device OCR) ---------- */
let _tessP = null;
function loadTesseract() {
  if (_tessP) return _tessP;
  _tessP = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Text reader failed to start.')));
    s.onerror = () => reject(new Error('Couldn’t load the text reader — needs internet the first time.'));
    document.head.appendChild(s);
  });
  return _tessP;
}
async function ocrImage(file, onProgress) {
  const T = await loadTesseract();
  const { data } = await T.recognize(file, 'eng', { logger: (m) => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress); } });
  return data.text || '';
}

const p2 = (n) => String(+n).padStart(2, '0');
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function parseDateLine(line) {
  let m;
  if ((m = line.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/))) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  if ((m = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/))) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = line.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(20\d{2})\b/)) && MON[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${p2(MON[m[2].slice(0, 3).toLowerCase()])}-${p2(m[1])}`;
  if ((m = line.match(/\b([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/)) && MON[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${p2(MON[m[1].slice(0, 3).toLowerCase()])}-${p2(m[2])}`;
  if ((m = line.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\.?\b/)) && MON[m[2].slice(0, 3).toLowerCase()]) return `${new Date().getFullYear()}-${p2(MON[m[2].slice(0, 3).toLowerCase()])}-${p2(m[1])}`;
  return null;
}
const MON_RX = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
const DATE_RX = new RegExp(`(20\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2})|(\\b\\d{1,2}[-/.]\\d{1,2}[-/.]20\\d{2}\\b)|(\\b\\d{1,2}\\s+${MON_RX}\\.?(?:\\s+20\\d{2})?\\b)|(\\b${MON_RX}\\.?\\s+\\d{1,2},?\\s+20\\d{2}\\b)`, 'gi');
function parseAmountLine(line) {
  const rx = /[-−+]?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|[-−+]?\d+\.\d{1,2}|[-−+]?\d+/g;
  const cur = /฿|thb|บาท/i.test(line);
  let best = null, m;
  while ((m = rx.exec(line))) {
    const tok = m[0].replace(/−/g, '-');
    const strong = /[.,]/.test(tok) || /^[-+]/.test(tok); // has decimals, thousands, or a sign
    if (!strong && !cur) continue; // a bare integer with no currency mark isn't money
    const value = parseFloat(tok.replace(/[^0-9.]/g, ''));
    if (isNaN(value) || value === 0) continue;
    const cand = { value, index: m.index, len: m[0].length, neg: tok.startsWith('-'), pos: tok.startsWith('+'), strong };
    // prefer a "strong" token; among equals prefer the rightmost (amounts sit at line end)
    if (!best || (cand.strong && !best.strong) || (cand.strong === best.strong && cand.index >= best.index)) best = cand;
  }
  return best;
}
function parseReceiptText(text) {
  const out = []; let ctx = null; const today = new Date().toISOString().slice(0, 10);
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const d = parseDateLine(line);
    if (/\bbalance\b/i.test(line)) { if (d) ctx = d; continue; } // skip summary/balance lines
    const work = line.replace(DATE_RX, ' '); // remove dates so day digits aren't read as amounts
    const amt = parseAmountLine(work);
    if (!amt) { if (d) ctx = d; continue; } // a date-only line just sets the running context
    const desc = (work.slice(0, amt.index) + ' ' + work.slice(amt.index + amt.len))
      .replace(/฿|THB|บาท/gi, '').replace(/[|·•]/g, ' ').replace(/\s{2,}/g, ' ')
      .replace(/^[\s.,;:\-]+|[\s.,;:\-]+$/g, '').trim();
    const amount = amt.pos ? amt.value : -amt.value; // default to expense unless explicitly +
    const date = d || ctx || today;
    out.push({ date, description: desc, amount: round2(amount), category: amount >= 0 ? 'Income' : categorize(desc, RULES) });
  }
  return out;
}

let imgTx = [];
function openImg() {
  imgTx = []; el('imgFile').value = ''; el('imgResult').hidden = true; el('imgProgress').hidden = true;
  el('imgRaw').textContent = ''; el('imgHint').textContent = ''; el('imgHint').classList.remove('err');
  el('imgSheet').hidden = false;
}
function imgCatOptions(sel) {
  return ['Income', ...CATS.map((c) => c.category), 'Other'].filter((v, i, a) => a.indexOf(v) === i)
    .map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
}
function renderImgRows() {
  el('imgCount').textContent = imgTx.length ? `${imgTx.length} row${imgTx.length === 1 ? '' : 's'} — edit, delete, or add before saving` : '';
  el('imgRows').innerHTML = imgTx.map((t, i) => `
    <div class="img-row" data-i="${i}">
      <input class="ir-desc" type="text" value="${esc(t.description)}" placeholder="Description" />
      <input class="ir-amt" type="number" step="any" value="${t.amount}" placeholder="0" />
      <input class="ir-date" type="date" value="${esc(t.date)}" />
      <select class="ir-cat">${imgCatOptions(t.category)}</select>
      <button class="ir-del" title="Remove row">✕</button>
    </div>`).join('') || '<div class="empty">No rows detected. Tap “Add a row”.</div>';
  el('imgRows').querySelectorAll('.img-row').forEach((row) => {
    const i = +row.dataset.i;
    row.querySelector('.ir-desc').addEventListener('input', (e) => { imgTx[i].description = e.target.value; });
    row.querySelector('.ir-amt').addEventListener('input', (e) => { imgTx[i].amount = +e.target.value || 0; });
    row.querySelector('.ir-date').addEventListener('input', (e) => { imgTx[i].date = e.target.value; });
    row.querySelector('.ir-cat').addEventListener('change', (e) => { imgTx[i].category = e.target.value; });
    row.querySelector('.ir-del').addEventListener('click', () => { imgTx.splice(i, 1); renderImgRows(); });
  });
}
async function handleImgFiles(files) {
  imgTx = []; let raw = '';
  el('imgResult').hidden = true; el('imgHint').textContent = ''; el('imgHint').classList.remove('err');
  const prog = el('imgProgress'); prog.hidden = false;
  try {
    for (let i = 0; i < files.length; i++) {
      prog.textContent = `Reading image ${i + 1} of ${files.length}…`;
      const text = await ocrImage(files[i], (p) => { prog.textContent = `Reading image ${i + 1} of ${files.length}… ${Math.round(p * 100)}%`; });
      raw += (raw ? '\n----\n' : '') + text;
      imgTx.push(...parseReceiptText(text));
    }
    prog.hidden = true;
    el('imgRaw').textContent = raw || '(no text detected)';
    el('imgAccount').innerHTML = ACCOUNTS.map((a) => `<option>${esc(a.name)}</option>`).join('') || '<option>Cash</option>';
    renderImgRows();
    el('imgResult').hidden = false;
    if (!imgTx.length) { el('imgHint').textContent = 'No transactions detected automatically — add rows by hand, or open the raw text to see what was read.'; }
  } catch (e) {
    prog.hidden = true; el('imgHint').textContent = '⚠︎ ' + e.message; el('imgHint').classList.add('err');
  }
}
async function applyImg() {
  const account = el('imgAccount').value || 'Cash';
  const tx = imgTx.filter((t) => t.amount && t.date)
    .map((t) => ({ date: t.date, description: (t.description || '').trim() || '(no description)', amount: round2(t.amount), category: t.category || (t.amount >= 0 ? 'Income' : 'Other'), account }));
  if (!tx.length) { el('imgHint').textContent = '⚠︎ Nothing to add — each row needs a date and a non-zero amount.'; el('imgHint').classList.add('err'); return; }
  const btn = el('imgApply'); btn.disabled = true; el('imgHint').classList.remove('err'); el('imgHint').textContent = 'Adding…';
  try {
    requireToken();
    const byMonth = {};
    for (const t of tx) (byMonth[t.date.slice(0, 7)] ||= []).push(t);
    let anyNew = false;
    for (const [month, list] of Object.entries(byMonth)) {
      const path = `money/${month}.md`;
      const cur = await ghGetFile(path);
      let md = cur ? cur.text : '';
      for (const t of list) md = appendLedgerRow(md, t, month);
      await ghPutFile(path, md, `Import ${list.length} transactions from screenshot for ${month}`, cur ? cur.sha : undefined);
      if (rememberTx(month, list)) anyNew = true;
    }
    if (anyNew) { try { await writeIndex(); } catch { /* index is best-effort */ } }
    selMonth = Object.keys(byMonth).sort().pop() || selMonth;
    el('imgSheet').hidden = true; TAB = 'tx'; render();
  } catch (e) {
    if (e.needToken) { el('imgSheet').hidden = true; openToken('Connect GitHub once, then import.'); }
    else { el('imgHint').textContent = '⚠︎ ' + e.message; el('imgHint').classList.add('err'); }
  } finally { btn.disabled = false; }
}

/* ---------- token sheet ---------- */
function openToken(hint) { el('tkInput').value = GH.token; el('tkHint').textContent = hint || (GH.token ? 'A token is saved on this device.' : ''); el('tokenSheet').hidden = false; }

/* ---------- wiring ---------- */
document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => { TAB = b.dataset.tab; render(); }));
el('addBtn').addEventListener('click', openTx);
el('connBtn').addEventListener('click', () => openToken());
el('txCancel').addEventListener('click', () => { el('txSheet').hidden = true; });
el('txSheet').addEventListener('click', (e) => { if (e.target === el('txSheet')) el('txSheet').hidden = true; });
el('txSave').addEventListener('click', saveTx);
document.querySelectorAll('#txKind button').forEach((b) => b.addEventListener('click', () => {
  txKind = b.dataset.kind;
  document.querySelectorAll('#txKind button').forEach((x) => x.classList.toggle('on', x === b));
  el('txCategory').closest('.field').style.opacity = txKind === 'income' ? '.5' : '1';
}));
el('csvCancel').addEventListener('click', () => { el('csvSheet').hidden = true; });
el('csvSheet').addEventListener('click', (e) => { if (e.target === el('csvSheet')) el('csvSheet').hidden = true; });
el('csvFile').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { loadCsv(String(rd.result)); } catch { el('csvHint').textContent = '⚠︎ Could not read that file.'; el('csvHint').classList.add('err'); } }; rd.readAsText(f); });
['csvAmount', 'csvDesc', 'csvSign', 'csvAccount'].forEach((id) => el(id).addEventListener('change', updateCsvPreview));
el('csvApply').addEventListener('click', applyCsv);
el('imgCancel').addEventListener('click', () => { el('imgSheet').hidden = true; });
el('imgSheet').addEventListener('click', (e) => { if (e.target === el('imgSheet')) el('imgSheet').hidden = true; });
el('imgFile').addEventListener('change', (e) => { const f = [...(e.target.files || [])]; if (f.length) handleImgFiles(f); });
el('imgAddRow').addEventListener('click', () => { imgTx.push({ date: new Date().toISOString().slice(0, 10), description: '', amount: 0, category: 'Other' }); renderImgRows(); });
el('imgApply').addEventListener('click', applyImg);
el('tkSave').addEventListener('click', () => { GH.token = el('tkInput').value.trim(); el('tkHint').textContent = GH.token ? 'Saved ✓' : 'Enter a token.'; if (GH.token) setTimeout(() => { el('tokenSheet').hidden = true; }, 600); });
el('tkClear').addEventListener('click', () => { GH.token = ''; el('tkInput').value = ''; el('tkHint').textContent = 'Removed.'; });
el('tokenSheet').addEventListener('click', (e) => { if (e.target === el('tokenSheet')) el('tokenSheet').hidden = true; });

async function boot() {
  view.innerHTML = '<div class="empty">Loading…</div>';
  try { await load(); render(); } catch (e) { view.innerHTML = `<div class="empty">Couldn’t load. ${esc(e.message || '')}</div>`; }
}
boot();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') boot(); });

/* ---------- service worker (shared with Benchmarks; enables install + offline) ---------- */
if ('serviceWorker' in navigator) {
  let reloading = false;
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js')
      .then((reg) => { reg.update(); setInterval(() => reg.update(), 60 * 60 * 1000); })
      .catch(() => {});
  });
}
