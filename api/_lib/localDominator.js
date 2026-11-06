/* ==========================================================================
   LOCAL DOMINATOR API CLIENT  (server-side only — never shipped to browsers)
   --------------------------------------------------------------------------
   Docs: https://app.localdominator.co/api-doc/   Base: /v1   Auth: Bearer

   Pulls both kinds of geo-grid scan for one client and reduces them to the
   latest scan per keyword, plus an average-rank history:

     one-time scans   GET /v1/scans                         (list, has grid)
     scheduled scans  GET /v1/scheduled-scans               (campaigns)
                      GET /v1/scheduled-scans/{id}          (campaign + runs)
                      GET /v1/scheduled-scan-runs/{run_id}  (rows, has grid)

   The docs give sample payloads but not every wrapper key, so list
   responses are unwrapped defensively (see `asList`).
   ========================================================================== */
"use strict";

const BASE = "https://api.localdominator.co/v1";
const TIMEOUT_MS = 9000;
const MAX_RANK = 20;                 // Google Maps results checked per point
const HISTORY_DAYS = 400;            // how far back to look for scans
const MAX_PAGES = 5;                 // one-time scan pages (50 per page)

class LdError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ http */
async function ldGet(path, query, key) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: ctrl.signal
    });
    if (res.status === 202) return { pending: true };          // still running
    if (!res.ok) throw new LdError(res.status, `GET ${path} → HTTP ${res.status}`);
    return { data: await res.json() };
  } catch (e) {
    if (e.name === "AbortError") throw new LdError(504, `GET ${path} timed out`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------------------- helpers */
const enc = encodeURIComponent;
const round2 = n => (typeof n === "number" && isFinite(n) ? Math.round(n * 100) / 100 : null);

function asList(data, ...keys) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const k of [...keys, "data", "results", "items"]) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

/* "2026-04-10 14:08:50.736785+00" and ISO strings → ISO, or null. */
function parseTs(s) {
  if (!s) return null;
  let iso = String(s).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  return isNaN(d) ? null : d.toISOString();
}

/* Only Local Dominator https links reach the browser — they are rendered
   into href/src attributes, so anything else is dropped. */
function safeUrl(u) {
  if (typeof u !== "string") return null;
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "localdominator.co" && !url.hostname.endsWith(".localdominator.co")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function matchesClient(row, client) {
  const placeId = row.place_id || row.google_place_id || null;
  if (client.placeId) return placeId === client.placeId;
  const name = String(row.name || row.place_name || "").toLowerCase();
  return client.nameIncludes.some(s => name.includes(s.toLowerCase()));
}

/* ------------------------------------------------------------ grid maths
   `content` is a square matrix of ranks. For circle scans the corners are
   not sample points, so a cell only counts when it lies inside the circle.
   Inside the scan area, a null / 0 / >20 cell means the business was not
   found in the top 20 at that point.                                      */
function isPoint(r, c, n, shape) {
  if (shape !== "circle") return true;
  const m = (n - 1) / 2;
  return (r - m) ** 2 + (c - m) ** 2 <= (m + 0.5) ** 2;
}
const isRank = v => typeof v === "number" && v >= 1 && v <= MAX_RANK;

function cleanGrid(content) {
  if (!Array.isArray(content) || !content.length) return null;
  const n = content.length;
  if (!content.every(row => Array.isArray(row) && row.length === n)) return null;
  return content.map(row => row.map(v => (typeof v === "number" && isFinite(v) ? v : null)));
}

function gridStats(grid, shape) {
  if (!grid) return null;
  const n = grid.length;
  let points = 0, high = 0, med = 0, low = 0, sum = 0;
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (!isPoint(r, c, n, shape)) return;
    points++;
    if (!isRank(v)) return;
    sum += v;
    if (v <= 3) high++;
    else if (v <= 10) med++;
    else low++;
  }));
  const found = high + med + low;
  const pct = x => (points ? Math.round((x / points) * 1000) / 10 : 0);
  return {
    points,
    found,
    out: points - found,
    high: pct(high),
    med: pct(med),
    low: pct(low),
    outPct: pct(points - found),
    foundPct: pct(found),
    avgFound: found ? round2(sum / found) : null
  };
}

function firstReportLink(map) {
  if (!map || typeof map !== "object") return null;
  for (const v of Object.values(map)) {
    if (v && /complete/i.test(String(v.status || "")) && v.view_link) {
      const u = safeUrl(v.view_link);
      if (u) return u;
    }
  }
  return null;
}

function normalizeScan(row, source) {
  const shape = row.shape || "circle";
  const grid = cleanGrid(row.content);
  const share = row.share_links || {};
  return {
    kw: String(row.keyword || row.search_term || "").trim(),
    source,
    id: row.scan_uuid || row.run_uuid || row.id || null,
    scannedAt: parseTs(row.creation_timestamp || row.created_at),
    avg: round2(row.average_rank),
    business: row.name || row.place_name || null,
    address: row.vicinity || null,
    center: { lat: row.center_lat ?? null, lng: row.center_lng ?? null },
    shape,
    gridSize: grid ? grid.length : row.grid_size ?? null,
    spacingM: row.locations_distance ?? row.distance ?? null,
    grid,
    stats: gridStats(grid, shape),
    image: safeUrl(share.image_link) || safeUrl(row.view_only_link),
    live: safeUrl(share.dynamic_url),
    report: firstReportLink(row.run_analysis_map)
  };
}

/* -------------------------------------------------------- one-time scans */
async function collectOneTime(client, key) {
  const end = new Date();
  const start = new Date(end.getTime() - HISTORY_DAYS * 864e5);
  const iso = d => d.toISOString().slice(0, 10);

  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const r = await ldGet("/scans", {
      text: client.search,
      per_page: 50,
      page,
      start_date: iso(start),
      end_date: iso(end)
    }, key);
    if (r.pending) break;
    const scans = asList(r.data, "scans");
    all.push(...scans);
    const total = typeof r.data.totalcount === "number" ? r.data.totalcount : all.length;
    if (!scans.length || all.length >= total) break;
  }
  return all.filter(s => matchesClient(s, client)).map(s => normalizeScan(s, "one-time"));
}

/* ------------------------------------------------- scheduled campaigns */
async function collectScheduled(client, key) {
  const list = await ldGet("/scheduled-scans", { text: client.search, per_page: "50", page: "0" }, key);
  if (list.pending) return [];
  const campaigns = asList(list.data, "scheduled_scans").filter(c => matchesClient(c, client));

  const perCampaign = await Promise.all(campaigns.map(async camp => {
    const d = await ldGet(`/scheduled-scans/${enc(camp.id)}`, { date_range: "1Y" }, key);
    if (d.pending) return [];
    const detail = d.data && d.data.runs ? d.data
      : (d.data && (d.data.scheduled_scan || d.data.data)) || {};
    const c = { ...camp, ...detail };

    const runs = (detail.runs || [])
      .map(run => ({ ...run, at: parseTs(run.created_at) }))
      .filter(run => run.at && run.run_uuid)
      .sort((a, b) => b.at.localeCompare(a.at));

    // Latest run first; if it is still processing, use the one before.
    for (const run of runs.slice(0, 2)) {
      const rr = await ldGet(`/scheduled-scan-runs/${enc(run.run_uuid)}`, null, key);
      if (rr.pending) continue;
      const rows = asList(rr.data, "scans", "rows");
      // A run's average_rank is per campaign, so it is only a keyword
      // history when the campaign tracks a single keyword.
      const single = rows.length === 1;

      return rows.map(row => {
        const scan = normalizeScan({
          ...row,
          shape: row.shape || c.shape,
          grid_size: row.grid_size || c.grid_size,
          locations_distance: row.locations_distance ?? c.distance,
          center_lat: row.center_lat ?? c.center_lat,
          center_lng: row.center_lng ?? c.center_lng,
          name: row.name || c.place_name,
          vicinity: row.vicinity || c.vicinity,
          creation_timestamp: row.creation_timestamp || run.created_at,
          share_links: row.share_links || run.share_links,
          run_analysis_map: row.run_analysis_map || run.run_analysis_map
        }, "scheduled");
        if (single) {
          scan.history = runs
            .filter(x => typeof x.average_rank === "number")
            .map(x => ({ date: x.at, avg: round2(x.average_rank) }));
        }
        scan.campaign = safeUrl(c.share_links && c.share_links.campaign_link);
        return scan;
      });
    }
    return [];
  }));

  return perCampaign.flat();
}

/* ------------------------------------------------------------- merging
   Latest scan per keyword wins; every scan of that keyword (one-time or
   scheduled) contributes one history point per day.                      */
function mergeByKeyword(scans) {
  const groups = new Map();
  for (const s of scans) {
    if (!s.kw) continue;
    const k = s.kw.toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  return [...groups.values()].map(list => {
    list.sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
    const latest = { ...list[0] };

    const byDay = new Map();
    for (const s of list) {
      for (const h of s.history || []) if (h.avg != null) byDay.set(h.date.slice(0, 10), h.avg);
    }
    for (const s of [...list].reverse()) {           // scan rows override run averages
      if (s.scannedAt && s.avg != null) byDay.set(s.scannedAt.slice(0, 10), s.avg);
    }
    latest.history = [...byDay]
      .map(([date, avg]) => ({ date, avg }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-24);

    const today = latest.scannedAt ? latest.scannedAt.slice(0, 10) : null;
    latest.prev = today ? latest.history.filter(h => h.date < today).pop() || null : null;
    return latest;
  }).sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99));
}

async function fetchClientGrid(client, key) {
  const [scheduled, oneTime] = await Promise.allSettled([
    collectScheduled(client, key),
    collectOneTime(client, key)
  ]);

  const scans = [scheduled, oneTime].filter(r => r.status === "fulfilled").flatMap(r => r.value);
  const errors = [scheduled, oneTime].filter(r => r.status === "rejected").map(r => r.reason);
  if (!scans.length && errors.length) throw errors[0];

  const keywords = mergeByKeyword(scans);
  const first = keywords.find(k => k.business) || {};
  return {
    business: first.business || client.name,
    address: first.address || null,
    keywords,
    meta: {
      scheduledRows: scheduled.status === "fulfilled" ? scheduled.value.length : null,
      oneTimeScans: oneTime.status === "fulfilled" ? oneTime.value.length : null,
      partial: errors.length > 0
    },
    errors
  };
}

module.exports = {
  fetchClientGrid,
  LdError,
  // exported for tests
  _internal: { normalizeScan, gridStats, mergeByKeyword, parseTs, safeUrl, isPoint, asList }
};
