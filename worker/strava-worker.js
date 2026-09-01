/* Strava OAuth + activity proxy for My Benchmarks.
 *
 * Deploy this as a Cloudflare Worker (free tier). It holds the Strava client
 * secret so the static app never sees it. The app calls two endpoints:
 *
 *   POST /exchange   { code }           -> swaps an OAuth code for tokens
 *   POST /summary    { refresh_token }  -> refreshes, fetches recent runs,
 *                                          returns weekly/monthly km summary
 *
 * No per-user storage: the refresh token lives on the user's device and is
 * sent with each /summary call. Set two Worker variables (Settings → Variables):
 *   STRAVA_CLIENT_ID       (from strava.com/settings/api)
 *   STRAVA_CLIENT_SECRET   (mark as a Secret)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - ys) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
function summarize(acts) {
  const now = new Date();
  const cw = isoWeek(now), cm = now.toISOString().slice(0, 7);
  let wk = 0, mo = 0; const recent = [];
  for (const a of acts || []) {
    const type = (a.sport_type || a.type || '').toLowerCase();
    if (!type.includes('run')) continue;
    const dist = a.distance || 0;              // meters
    const sd = a.start_date ? new Date(a.start_date) : null;
    if (!sd || dist <= 0) continue;
    if (isoWeek(sd) === cw) wk += dist;
    if (sd.toISOString().slice(0, 7) === cm) mo += dist;
    if (recent.length < 8) recent.push({ date: sd.toISOString().slice(0, 10), km: Math.round(dist / 10) / 100, name: a.name || 'Run' });
  }
  return { week: cw, weekKm: Math.round(wk / 10) / 100, month: cm, monthKm: Math.round(mo / 10) / 100, recent, updatedAt: now.toISOString() };
}
async function stravaToken(env, body) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, ...body }),
  });
  return { ok: r.ok, data: await r.json() };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname.endsWith('/exchange') && request.method === 'POST') {
        const { code } = await request.json();
        if (!code) return json({ error: 'missing code' }, 400);
        const { ok, data } = await stravaToken(env, { code, grant_type: 'authorization_code' });
        if (!ok) return json({ error: 'strava', detail: data }, 400);
        return json({
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          athlete: data.athlete ? { name: `${data.athlete.firstname || ''} ${data.athlete.lastname || ''}`.trim() } : null,
        });
      }
      if (url.pathname.endsWith('/summary') && request.method === 'POST') {
        const { refresh_token } = await request.json();
        if (!refresh_token) return json({ error: 'missing refresh_token' }, 400);
        const { ok, data } = await stravaToken(env, { grant_type: 'refresh_token', refresh_token });
        if (!ok) return json({ error: 'refresh', detail: data }, 400);
        const after = Math.floor(Date.now() / 1000) - 40 * 86400;
        const ar = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${after}`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const acts = ar.ok ? await ar.json() : [];
        return json({ ...summarize(acts), refresh_token: data.refresh_token, expires_at: data.expires_at });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },
};
