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
let ACCOUNTS = [], CATS = [], RULES = [], TX = [];
let TAB = 'overview';
const MONTH = new Date().toISOString().slice(0, 7);
const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const bust = () => `?t=${Date.now()}`;

async function load() {
  const [acc, bud, led] = await Promise.all([
    fetch(`../money/accounts.md${bust()}`).then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch(`../money/budget.md${bust()}`).then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch(`../money/${MONTH}.md${bust()}`).then((r) => r.ok ? r.text() : '').catch(() => ''),
  ]);
  ACCOUNTS = parseTable(acc).rows.map((r) => ({ name: r.account, type: r.type, balance: +r.balance || 0 }));
  CATS = parseTable(bud).rows.map((r) => ({ category: r.category, monthly: +r.monthly || 0 }));
  RULES = parseRules(bud);
  TX = parseTable(led).rows.map((r) => ({ date: r.date, description: r.description, amount: +r.amount || 0, category: r.category, account: r.account }))
    .filter((t) => t.date);
}

function monthStats() {
  let income = 0, expense = 0; const byCat = {};
  for (const t of TX) {
    if (t.amount >= 0) income += t.amount;
    else { expense += -t.amount; byCat[t.category] = round2((byCat[t.category] || 0) + -t.amount); }
  }
  return { income: round2(income), expense: round2(expense), net: round2(income - expense), byCat };
}

/* ---------- views ---------- */
function renderOverview() {
  const total = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const st = monthStats();
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
      <div class="trio">
        <div class="cell in"><span class="n">${money(st.income)}</span><span class="l">In</span></div>
        <div class="cell out"><span class="n">${money(st.expense)}</span><span class="l">Out</span></div>
        <div class="cell"><span class="n">${st.net < 0 ? '−' : ''}${money(st.net)}</span><span class="l">Net</span></div>
      </div>
      <div class="lab" style="margin-top:12px">${esc(monthLabel)}</div>
    </div>
    <div class="section-label">Accounts</div>${accRows || '<div class="empty">No accounts yet.</div>'}
    <div class="section-label">Budget this month</div>${budRows || '<div class="empty">No budget categories.</div>'}`;
}
function renderTx() {
  const list = [...TX].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = list.map((t) => `<div class="row-card">
    <div class="main"><div class="t">${esc(t.description || '(no description)')}</div>
      <div class="s">${esc(t.date)} · ${esc(t.category || '—')} · ${esc(t.account || '—')}</div></div>
    <div class="amt ${t.amount < 0 ? 'neg' : 'pos'}">${t.amount < 0 ? '−' : '+'}${money(t.amount)}</div></div>`).join('');
  view.innerHTML = `<div class="section-label">${esc(monthLabel)} · ${list.length} transactions</div>
    <button class="btn ghost" id="importBtn" style="width:100%;margin-bottom:12px">⭳ Import statement (CSV)</button>
    ${rows || '<div class="empty">No transactions yet. Tap ＋ to add one.</div>'}`;
  el('importBtn').addEventListener('click', openCsv);
}
function renderBudget() {
  const st = monthStats();
  const rows = CATS.map((c) => {
    const spent = st.byCat[c.category] || 0; const over = spent > c.monthly; const left = round2(c.monthly - spent);
    const pct = c.monthly > 0 ? Math.min(spent / c.monthly, 1) * 100 : (spent > 0 ? 100 : 0);
    return `<div class="bcat"><div class="top"><span>${esc(c.category)}${over ? '' : ` <span class="muted">${money(left)} left</span>`}</span>
      <span class="nums ${over ? 'over' : ''}">${money(spent)} / ${money(c.monthly)}${over ? ` · over ${money(-left)}` : ''}</span></div>
      <div class="bar"><span style="width:${pct.toFixed(0)}%;background:${over ? 'var(--crit)' : 'var(--accent)'}"></span></div></div>`;
  }).join('');
  const uncategorized = st.byCat.Other || 0;
  view.innerHTML = `<div class="section-label">Budget · ${esc(monthLabel)}</div>${rows || '<div class="empty">No categories.</div>'}
    ${uncategorized ? `<p class="muted small">${money(uncategorized)} in “Other”. Add keywords to ../money/budget.md → ## Rules to sort it.</p>` : ''}`;
}
function render() {
  el('view').scrollTo?.(0, 0);
  if (TAB === 'tx') renderTx(); else if (TAB === 'budget') renderBudget(); else renderOverview();
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
function ledgerHeader() {
  return `---\ntype: ledger\nmonth: ${MONTH}\n---\n\n# ${monthLabel}\n\n| date | description | amount | category | account |\n|---|---|---|---|---|\n`;
}
function appendLedgerRow(md, t) {
  const line = `| ${t.date} | ${t.description.replace(/\|/g, '/')} | ${t.amount} | ${t.category} | ${t.account} |`;
  if (!md || !/\|\s*date\s*\|/i.test(md)) return ledgerHeader() + line + '\n';
  const lines = md.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim().startsWith('|')) last = i;
  lines.splice(last + 1, 0, line);
  return lines.join('\n');
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
  const btn = el('txSave'); btn.disabled = true; el('txHint').classList.remove('err'); el('txHint').textContent = 'Saving…';
  try {
    requireToken();
    const path = `money/${MONTH}.md`;
    const cur = await ghGetFile(path);
    await ghPutFile(path, appendLedgerRow(cur ? cur.text : '', t), `Add transaction: ${t.description}`, cur ? cur.sha : undefined);
    el('txSheet').hidden = true;
    TX.push(t); render(); // optimistic; repo republishes in ~1 min
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
    date = date ? `${date[1]}-${String(+date[2]).padStart(2, '0')}-${String(+date[3]).padStart(2, '0')}` : `${MONTH}-01`;
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
    const path = `money/${MONTH}.md`;
    const cur = await ghGetFile(path);
    let md = cur ? cur.text : '';
    for (const t of tx) md = appendLedgerRow(md, t);
    await ghPutFile(path, md, `Import ${tx.length} transactions for ${MONTH}`, cur ? cur.sha : undefined);
    TX.push(...tx);
    el('csvSheet').hidden = true; TAB = 'tx'; render();
  } catch (e) {
    if (e.needToken) { el('csvSheet').hidden = true; openToken('Connect GitHub once, then import.'); }
    else { el('csvHint').textContent = '⚠︎ ' + e.message; el('csvHint').classList.add('err'); }
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
el('tkSave').addEventListener('click', () => { GH.token = el('tkInput').value.trim(); el('tkHint').textContent = GH.token ? 'Saved ✓' : 'Enter a token.'; if (GH.token) setTimeout(() => { el('tokenSheet').hidden = true; }, 600); });
el('tkClear').addEventListener('click', () => { GH.token = ''; el('tkInput').value = ''; el('tkHint').textContent = 'Removed.'; });
el('tokenSheet').addEventListener('click', (e) => { if (e.target === el('tokenSheet')) el('tokenSheet').hidden = true; });

async function boot() {
  view.innerHTML = '<div class="empty">Loading…</div>';
  try { await load(); render(); } catch (e) { view.innerHTML = `<div class="empty">Couldn’t load. ${esc(e.message || '')}</div>`; }
}
boot();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') boot(); });
