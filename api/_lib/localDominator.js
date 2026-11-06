/* ==========================================================================
   LOCAL DOMINATOR API CLIENT  (server-side only — never shipped to browsers)
   --------------------------------------------------------------------------
   Docs: https://app.localdominator.co/api-doc/   Base: /v1   Auth: Bearer

   Reading — the latest scan per keyword, plus an average-rank history:
     one-time scans   GET  /v1/scans                         (list, has grid)
     scheduled scans  GET  /v1/scheduled-scans               (campaigns)
                      GET  /v1/scheduled-scans/{id}          (campaign + runs)
                      GET  /v1/scheduled-scan-runs/{run_id}  (rows, has grid)

   Writing — on-demand and monthly scans, both through scheduled campaigns:
                      POST /v1/scheduled-scans/{id}/run-now  (fresh scan)
                      POST /v1/scheduled-scans               (monthly setup)

   On-demand scans go through a keyword's own campaign rather than a
   one-time scan because the campaign carries `in_progress` and its run
   dates. That makes the 7-day limit and the "already running" lock pure
   reads of Local Dominator — no database — and puts every manual run in the
   same history as the monthly ones.

   The docs give sample payloads but not every wrapper key, so responses are
   unwrapped defensively (see `asList`).
   ========================================================================== */
"use strict";

const BASE = "https://api.localdominator.co/v1";
const TIMEOUT_MS = 9000;
const MAX_RANK = 20;                       // Google Maps results checked per point
const HISTORY_DAYS = 400;                  // how far back to look for scans
const MAX_PAGES = 5;                       // one-time scan pages (50 per page)
const REFRESH_COOLDOWN_DAYS = 7;           // client-requested scans, per keyword
const MONTHLY_CRON = "0 13 1 * *";         // 1st of the month, 13:00 UTC (8am Chicago)

class LdError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ http */
async function ldRequest(method, path, { query, body } = {}, key) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  }

  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    if (method === "GET" && res.status === 202) return { pending: true };   // still running
    if (!res.ok) throw new LdError(res.status, `${method} ${path} → HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    if (e.name === "AbortError") throw new LdError(504, `${method} ${path} timed out`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
const ldGet = (path, query, key) => ldRequest("GET", path, { query }, key);

/* --------------------------------------------------------------- helpers */
const enc = encodeURIComponent;
const round2 = n => (typeof n === "number" && isFinite(n) ? Math.round(n * 100) / 100 : null);
const DAY = 864e5;

function asList(data, ...keys) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const k of [...keys, "data", "results", "items"]) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

/* "2026-04-10 14:08:50.736785+00", ISO strings and "2026-04-10" → ISO, or null. */
function parseTs(s) {
  if (!s) return null;
  const iso = String(s).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
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

/* A campaign's keywords: `search_term` (string) on list items, or
   `search_terms` (strings or { term } objects) on create/detail. */
function campaignTerms(c) {
  const raw = Array.isArray(c.search_terms) ? c.search_terms
    : c.search_term != null ? [c.search_term] : [];
  return raw.map(t => String(typeof t === "object" && t ? t.term : t).trim()).filter(Boolean);
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

function pointCount(n, shape) {
  let p = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (isPoint(r, c, n, shape)) p++;
  return p;
}

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
    placeId: row.place_id || row.google_place_id || null,
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
  const start = new Date(end.getTime() - HISTORY_DAYS * DAY);
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
  const mine = all.filter(s => matchesClient(s, client)).map(s => normalizeScan(s, "one-time"));
  mine.fetched = all.length;                 // for diagnostics: found vs. matched
  return mine;
}

/* ------------------------------------------------- scheduled campaigns */
function unwrapCampaign(data) {
  if (!data || typeof data !== "object") return {};
  if (data.runs || data.id) return data;
  return data.scheduled_scan || data.data || {};
}

function campaignRuns(detail) {
  return (detail.runs || [])
    .map(run => ({ ...run, at: parseTs(run.created_at) }))
    .filter(run => run.at)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/* Returns the scan rows of each campaign's latest finished run, and a
   summary of every campaign (used for on-demand scans and the schedule). */
async function collectScheduled(client, key) {
  const list = await ldGet("/scheduled-scans", { text: client.search, per_page: "50", page: "0" }, key);
  if (list.pending) return { rows: [], campaigns: [], fetched: 0 };
  const all = asList(list.data, "scheduled_scans");
  const listed = all.filter(c => matchesClient(c, client));

  const per = await Promise.all(listed.map(async camp => {
    const d = await ldGet(`/scheduled-scans/${enc(camp.id)}`, { date_range: "1Y" }, key);
    const detail = d.pending ? {} : unwrapCampaign(d.data);
    const c = { ...camp, ...detail, id: camp.id };
    const runs = campaignRuns(detail);
    const terms = campaignTerms(c);

    const summary = {
      id: c.id,
      terms,
      single: terms.length === 1,
      inProgress: !!c.in_progress,
      lastRunAt: (runs[0] && runs[0].at) || parseTs(c.last_run_date),
      nextRunAt: parseTs(c.next_run_at),
      scheduling: c.scheduling || null,
      schedulingType: c.scheduling_type || null,
      link: safeUrl(c.share_links && c.share_links.campaign_link)
    };

    // Latest run first; if it is still processing, use the one before.
    for (const run of runs.filter(x => x.run_uuid).slice(0, 2)) {
      const rr = await ldGet(`/scheduled-scan-runs/${enc(run.run_uuid)}`, null, key);
      if (rr.pending) continue;
      const rows = asList(rr.data, "scans", "rows");
      // A run's average_rank covers the whole campaign, so it is only a
      // keyword history when the campaign tracks a single keyword.
      const single = summary.single || (terms.length === 0 && rows.length === 1);

      return {
        summary,
        rows: rows.map(row => {
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
          return scan;
        })
      };
    }
    return { summary, rows: [] };
  }));

  return { rows: per.flatMap(p => p.rows), campaigns: per.map(p => p.summary), fetched: all.length };
}

/* What went wrong upstream, safe to show: the step and HTTP status only. */
function describeError(e) {
  const m = /^(GET|POST|PATCH|DELETE) (\/[a-z-]+)/.exec(String(e && e.message) || "");
  return { step: m ? `${m[1]} /v1${m[2]}` : "request", status: (e && e.status) || null };
}

/* --------------------------------------------------- on-demand eligibility
   Only single-keyword campaigns can be re-run from the dashboard: "run now"
   on a multi-keyword campaign would scan (and bill) every keyword in it.  */
function refreshState(camp, latestScanAt, now = Date.now()) {
  if (!camp) return { available: false, reason: "no_schedule" };
  if (!camp.single) return { available: false, reason: "multi_keyword", campaignId: camp.id };
  if (camp.inProgress) return { available: false, reason: "running", campaignId: camp.id };

  const last = [camp.lastRunAt, latestScanAt].filter(Boolean).sort().pop();
  if (last) {
    const next = Date.parse(last) + REFRESH_COOLDOWN_DAYS * DAY;
    if (next > now) {
      return { available: false, reason: "cooldown", campaignId: camp.id, nextAt: new Date(next).toISOString() };
    }
  }
  return { available: true, campaignId: camp.id };
}

/* ------------------------------------------------------------- merging
   Latest scan per keyword wins; every scan of that keyword (one-time or
   scheduled) contributes one history point per day. Campaign info is
   attached per keyword even when the campaign has not run yet.           */
function mergeByKeyword(scans, campaigns = [], now = Date.now()) {
  const groups = new Map();
  for (const s of scans) {
    if (!s.kw) continue;
    const k = s.kw.toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  // Prefer a single-keyword campaign; fall back to any campaign that covers the keyword.
  const campFor = kw => {
    const hits = campaigns.filter(c => c.terms.some(t => t.toLowerCase() === kw));
    return hits.find(c => c.single) || hits[0] || null;
  };

  return [...groups.entries()].map(([kwKey, list]) => {
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

    const camp = campFor(kwKey);
    latest.campaign = camp ? camp.link : null;
    latest.schedule = camp && camp.nextRunAt ? { nextRunAt: camp.nextRunAt, type: camp.schedulingType } : null;
    latest.refresh = refreshState(camp, latest.scannedAt, now);
    return latest;
  }).sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99));
}

async function fetchClientGrid(client, key) {
  const [scheduled, oneTime] = await Promise.allSettled([
    collectScheduled(client, key),
    collectOneTime(client, key)
  ]);

  const sched = scheduled.status === "fulfilled" ? scheduled.value : { rows: [], campaigns: [], fetched: null };
  const once = oneTime.status === "fulfilled" ? oneTime.value : null;
  const scans = [...sched.rows, ...(once || [])];
  const errors = [scheduled, oneTime].filter(r => r.status === "rejected").map(r => r.reason);
  if (!scans.length && errors.length) throw errors[0];

  const keywords = mergeByKeyword(scans, sched.campaigns);
  const first = keywords.find(k => k.business) || {};
  return {
    business: first.business || client.name,
    address: first.address || null,
    keywords,
    campaigns: sched.campaigns,
    meta: {
      // Counts only — never names of other businesses on the team account.
      oneTimeFetched: once ? once.fetched : null,
      oneTimeScans: once ? once.length : null,
      campaignsFetched: sched.fetched,
      campaignsMatched: sched.campaigns.length,
      scheduledRows: scheduled.status === "fulfilled" ? sched.rows.length : null,
      partial: errors.length > 0,
      issues: errors.map(describeError)
    },
    errors
  };
}

/* ------------------------------------------------------ on-demand scans */
async function startCampaignRun(campaignId, key) {
  return ldRequest("POST", `/scheduled-scans/${enc(campaignId)}/run-now`, {}, key);
}

/* Cheap status check for one campaign — a single request. `since` is when
   the dashboard asked for the run; the run is done once Local Dominator is
   no longer busy AND a run at/after that time exists (a just-requested run
   can take a moment to register as in progress). */
async function campaignStatus(client, campaignId, since, key) {
  const d = await ldGet(`/scheduled-scans/${enc(campaignId)}`, { date_range: "1M" }, key);
  if (d.pending) return { found: true, status: "running" };
  const c = unwrapCampaign(d.data);
  if (!matchesClient(c, client)) return { found: false };

  const runs = campaignRuns(c);
  const lastRunAt = (runs[0] && runs[0].at) || parseTs(c.last_run_date);
  const sinceMs = since ? Date.parse(since) - 2 * 60 * 1000 : null;   // clock-skew allowance
  const newRun = sinceMs == null || (lastRunAt && Date.parse(lastRunAt) >= sinceMs);
  return { found: true, status: !c.in_progress && newRun ? "done" : "running", lastRunAt };
}

/* -------------------------------------------------- monthly schedule plan
   One single-keyword monthly campaign per scanned keyword, copying the grid
   of that keyword's latest scan so results stay comparable. Keywords that
   already have a single-keyword campaign are left alone.                  */
function planMonthly(client, grid) {
  const items = grid.keywords.map(k => {
    const existing = grid.campaigns.find(c => c.single && c.terms[0].toLowerCase() === k.kw.toLowerCase());
    const n = k.gridSize;
    const points = n ? pointCount(n, k.shape) : null;
    const missing = [
      !k.placeId && !client.placeId && "Google Place ID",
      (k.center.lat == null || k.center.lng == null) && "map centre",
      !n && "grid size",
      !k.spacingM && "pin spacing"
    ].filter(Boolean);

    const body = {
      google_place_id: client.placeId || k.placeId,
      latitude: k.center.lat,
      longitude: k.center.lng,
      shape: k.shape === "square" ? "square" : "circle",
      distance: Math.max(1, Math.round(k.spacingM || 0)),
      grid_size: n,
      search_terms: [k.kw],
      scheduling: MONTHLY_CRON,
      alias: `${client.name} · ${k.kw} · monthly`,
      labels: ["makarios-dashboard"],
      run_now: false,
      notify: false,
      skippable: false,
      serp_device: "desktop"
    };

    return {
      kw: k.kw,
      action: existing ? "keep" : missing.length ? "blocked" : "create",
      existingId: existing ? existing.id : null,
      missing,
      gridSize: n,
      shape: k.shape,
      spacingM: k.spacingM,
      points,
      body: existing || missing.length ? null : body
    };
  });

  return {
    items,
    newPointsPerMonth: items.filter(i => i.action === "create").reduce((s, i) => s + (i.points || 0), 0),
    totalPointsPerMonth: items.filter(i => i.action !== "blocked").reduce((s, i) => s + (i.points || 0), 0)
  };
}

async function createCampaign(body, key) {
  return ldRequest("POST", "/scheduled-scans", { body }, key);
}

module.exports = {
  fetchClientGrid,
  describeError,
  startCampaignRun,
  campaignStatus,
  planMonthly,
  createCampaign,
  LdError,
  REFRESH_COOLDOWN_DAYS,
  MONTHLY_CRON,
  // exported for tests
  _internal: { normalizeScan, gridStats, mergeByKeyword, refreshState, parseTs, safeUrl, isPoint, pointCount, asList, campaignTerms }
};
