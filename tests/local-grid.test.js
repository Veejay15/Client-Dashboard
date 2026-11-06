/* Run with:  node --test tests/
   Mocks the Local Dominator API with payloads shaped like the samples in
   https://app.localdominator.co/api-doc/ and exercises /api/local-grid.   */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const API = path.join(__dirname, "..", "api");
const KEY = "ld_test_secret_key_123";

/* Fresh modules per test, so the per-instance memo cache never leaks. */
function loadHandler() {
  for (const id of Object.keys(require.cache)) if (id.startsWith(API)) delete require.cache[id];
  return require(path.join(API, "local-grid.js"));
}

async function call(handler, url) {
  const res = {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b; }
  };
  await handler({ method: "GET", url }, res);
  return { status: res.statusCode, headers: res.headers, raw: res.body, json: JSON.parse(res.body) };
}

/* -------------------------------------------------------------- fixtures */
const LD = "https://app.localdominator.co";
const AMF = "Americana Iron Works & Fence";

function grid(n, fill) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => fill(r, c)));
}

const fixtures = {
  "/v1/scheduled-scans": {
    scheduled_scans: [
      { id: "c-1", search_term: "fence installation chicago", place_name: AMF, shape: "circle",
        grid_size: 7, distance: 1207, vicinity: "939 W North Ave, Chicago, IL 60642",
        center_lat: 41.91, center_lng: -87.65,
        share_links: { campaign_link: `${LD}/dashboard-content/scheduled-heat-map?id=c-1` } },
      { id: "c-9", search_term: "fence installation chicago", place_name: "Other Fence Co", shape: "circle" }
    ],
    total: 2, page: 0, per_page: 50
  },
  "/v1/scheduled-scans/c-1": {
    id: "c-1",
    runs: [
      { run_uuid: "r-1", created_at: "2026-08-28T08:00:00.000Z", average_rank: 4.2 },
      { run_uuid: "r-3", created_at: "2026-10-28T08:00:00.000Z", average_rank: 3.1 },
      { run_uuid: "r-2", created_at: "2026-09-28T08:00:00.000Z", average_rank: 3.6 }
    ]
  },
  "/v1/scheduled-scan-runs/r-3": [
    { keyword: "fence installation chicago", name: AMF, average_rank: 3.1,
      creation_timestamp: "2026-10-28 08:03:11.123456+00",
      content: grid(7, (r, c) => (r === 6 && c === 3 ? null : 1 + ((r + c) % 12))),
      share_links: {
        image_link: `${LD}/static-images/heat-map-image?heatmapRecordId=1&link=abc`,
        dynamic_url: `${LD}/dashboard-content/live-heat-map/scan-results?heatmapRecordId=1&link=abc`
      },
      run_analysis_map: { "fence installation chicago": { status: "Completed", view_link: `${LD}/client/share/seo-report/xyz` } } }
  ],
  "/v1/scans": {
    totalcount: 4,
    scans: [
      { keyword: "Chicago wrought iron gates", name: AMF, place_id: "ChIJ-amf", average_rank: 2.4,
        creation_timestamp: "2026-10-15 10:00:00+00", shape: "square", grid_size: 5, locations_distance: 804.672,
        center_lat: 41.9104, center_lng: -87.6505,
        content: grid(5, (r, c) => (r === 0 && c === 0 ? null : (r + c) % 5 + 1)),
        share_links: { image_link: "javascript:alert(1)", dynamic_url: "https://evil.example.com/x" },
        scan_uuid: "s-new" },
      { keyword: "Chicago wrought iron gates", name: AMF, average_rank: 2.9,
        creation_timestamp: "2026-07-15 10:00:00+00", shape: "square", content: grid(5, () => 3), scan_uuid: "s-old" },
      { keyword: "fence installation chicago", name: AMF, average_rank: 5.0,
        creation_timestamp: "2026-06-01 10:00:00+00", shape: "circle", content: grid(7, () => 5), scan_uuid: "s-june" },
      { keyword: "roofing chicago", name: "Some Roofer LLC", average_rank: 1.1,
        creation_timestamp: "2026-10-20 10:00:00+00", content: grid(3, () => 1), scan_uuid: "s-other" }
    ]
  }
};

function mockFetch(overrides = {}) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const u = new URL(url);
    const method = opts.method || "GET";
    calls.push({ url: u, headers: opts.headers, method, body: opts.body ? JSON.parse(opts.body) : null });
    const route = method === "GET"
      ? overrides[u.pathname] ?? fixtures[u.pathname]
      : overrides[`${method} ${u.pathname}`] ?? { message: "ok" };
    if (typeof route === "number") return { ok: false, status: route, json: async () => ({}) };
    if (!route) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(route)) };
  };
  return calls;
}

/* ----------------------------------------------------------------- tests */
test("503 not_configured when LD_API_KEY is missing", async () => {
  delete process.env.LD_API_KEY;
  const r = await call(loadHandler(), "/api/local-grid?client=amf");
  assert.equal(r.status, 503);
  assert.equal(r.json.error, "not_configured");
  assert.equal(r.headers["cache-control"], "no-store");
});

test("404 for clients that are not in the allow-list", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch();
  for (const id of ["nope", "__proto__", "constructor", ""]) {
    const r = await call(loadHandler(), `/api/local-grid?client=${id}`);
    assert.equal(r.status, 404, id);
  }
  assert.equal(calls.length, 0, "never calls Local Dominator for unknown clients");
});

test("405 for non-GET", async () => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await loadHandler()({ method: "POST", url: "/api/local-grid?client=amf" }, res);
  assert.equal(res.statusCode, 405);
});

test("merges scheduled + one-time scans into the latest scan per keyword", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch();
  const r = await call(loadHandler(), "/api/local-grid?client=amf");

  assert.equal(r.status, 200);
  assert.match(r.headers["cache-control"], /s-maxage=300/);

  // Auth + host on every upstream request
  assert.ok(calls.length > 0);
  for (const c of calls) {
    assert.equal(c.url.host, "api.localdominator.co");
    assert.equal(c.headers.Authorization, `Bearer ${KEY}`);
  }
  // Other businesses' campaigns are never drilled into
  assert.ok(!calls.some(c => c.url.pathname.endsWith("/c-9")));

  const body = r.json;
  assert.equal(body.business, AMF);
  assert.deepEqual(body.keywords.map(k => k.kw), ["Chicago wrought iron gates", "fence installation chicago"]);
  assert.ok(!body.keywords.some(k => /roof/i.test(k.kw)), "other business filtered out");

  const fic = body.keywords[1];
  assert.equal(fic.source, "scheduled");
  assert.equal(fic.avg, 3.1);
  assert.equal(fic.scannedAt, "2026-10-28T08:03:11.123Z");
  assert.equal(fic.gridSize, 7);
  assert.equal(fic.spacingM, 1207);
  assert.ok(fic.image.startsWith(`${LD}/static-images/`));
  assert.ok(fic.live.startsWith(`${LD}/dashboard-content/`));
  assert.equal(fic.report, `${LD}/client/share/seo-report/xyz`);
  assert.ok(fic.campaign.includes("c-1"));
  assert.deepEqual(fic.history.map(h => h.date), ["2026-06-01", "2026-08-28", "2026-09-28", "2026-10-28"]);
  assert.deepEqual(fic.history.map(h => h.avg), [5, 4.2, 3.6, 3.1]);
  assert.deepEqual(fic.prev, { date: "2026-09-28", avg: 3.6 });

  const wig = body.keywords[0];
  assert.equal(wig.source, "one-time");
  assert.equal(wig.avg, 2.4);
  assert.equal(wig.image, null, "javascript: URL dropped");
  assert.equal(wig.live, null, "non-Local-Dominator URL dropped");
  assert.deepEqual(wig.prev, { date: "2026-07-15", avg: 2.9 });

  assert.ok(!r.raw.includes(KEY), "API key never appears in the response");
});

test("circle grids only count points inside the circle; nulls inside are 'not found'", () => {
  const { gridStats, isPoint } = require(path.join(API, "_lib", "localDominator.js"))._internal;
  let inside = 0;
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (isPoint(r, c, 7, "circle")) inside++;
  assert.equal(inside, 37);                         // 49 minus 3 cells in each corner

  const g = grid(7, (r, c) => (r === 3 && c === 3 ? null : r === 0 && c === 0 ? 1 : 2));
  const s = gridStats(g, "circle");
  assert.equal(s.points, 37);                        // corner (0,0) excluded despite its value
  assert.equal(s.found, 36);
  assert.equal(s.out, 1);                            // the null at the centre
  assert.equal(s.high, 97.3);

  const sq = gridStats(grid(3, (r, c) => [1, 5, 15, 25, null, 0, 3, 10, 11][r * 3 + c]), "square");
  assert.deepEqual([sq.points, sq.found, sq.out], [9, 6, 3]);   // 25, null and 0 are not ranks
});

test("auth failure → 502 ld_auth_failed, not cached, no upstream detail leaked", async () => {
  process.env.LD_API_KEY = KEY;
  mockFetch({ "/v1/scheduled-scans": 401, "/v1/scans": 401 });
  const r = await call(loadHandler(), "/api/local-grid?client=amf");
  assert.equal(r.status, 502);
  // Only the step and status code are passed on — no body, no key.
  assert.deepEqual(r.json, { error: "ld_auth_failed", upstream: { step: "GET /v1/scheduled-scans", status: 401 } });
  assert.ok(!r.raw.includes(KEY));
  assert.equal(r.headers["cache-control"], "no-store");
});

test("one source failing still returns the other (partial)", async () => {
  process.env.LD_API_KEY = KEY;
  mockFetch({ "/v1/scheduled-scans": 403 });
  const r = await call(loadHandler(), "/api/local-grid?client=amf");
  assert.equal(r.status, 200);
  assert.equal(r.json.meta.partial, true);
  assert.equal(r.json.meta.scheduledRows, null);
  const fic = r.json.keywords.find(k => k.kw === "fence installation chicago");
  assert.equal(fic.source, "one-time");
  assert.equal(fic.avg, 5);
});

test("latest run still processing (202) → falls back to the previous run", async () => {
  process.env.LD_API_KEY = KEY;
  const pending = Symbol("pending");
  const calls = mockFetch({
    "/v1/scheduled-scan-runs/r-2": [{ ...fixtures["/v1/scheduled-scan-runs/r-3"][0], average_rank: 3.6,
      creation_timestamp: "2026-09-28 08:02:00+00" }]
  });
  const base = global.fetch;
  global.fetch = async (url, opts) => {
    if (new URL(url).pathname === "/v1/scheduled-scan-runs/r-3") {
      calls.push({ url: new URL(url), headers: opts.headers });
      return { ok: true, status: 202, json: async () => ({ pending }) };
    }
    return base(url, opts);
  };
  const r = await call(loadHandler(), "/api/local-grid?client=amf");
  const fic = r.json.keywords.find(k => k.kw === "fence installation chicago");
  assert.equal(fic.avg, 3.6);
  assert.equal(fic.scannedAt.slice(0, 10), "2026-09-28");
});

test("timestamps in Local Dominator's Postgres format parse to ISO", () => {
  const { parseTs } = require(path.join(API, "_lib", "localDominator.js"))._internal;
  assert.equal(parseTs("2026-04-10 14:08:50.736785+00"), "2026-04-10T14:08:50.736Z");
  assert.equal(parseTs("2026-04-10T08:00:00.000Z"), "2026-04-10T08:00:00.000Z");
  assert.equal(parseTs("garbage"), null);
  assert.equal(parseTs(null), null);
});

/* ======================================================================
   On-demand scans (/api/local-scan) and the monthly plan
   ====================================================================== */
function loadScan() {
  for (const id of Object.keys(require.cache)) if (id.startsWith(API)) delete require.cache[id];
  return require(path.join(API, "local-scan.js"));
}

async function callScan(handler, method, url, headers = { "x-dashboard": "1" }) {
  const res = {
    headers: {}, statusCode: 200, body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b; }
  };
  await handler({ method, url, headers }, res);
  return { status: res.statusCode, headers: res.headers, raw: res.body, json: JSON.parse(res.body) };
}

const daysAgo = d => new Date(Date.now() - d * 864e5).toISOString();
/* Campaign c-1 whose last run was `d` days ago. */
const c1RanDaysAgo = (d, extra = {}) => ({
  "/v1/scheduled-scans/c-1": { id: "c-1", place_name: AMF, ...extra,
    runs: [{ run_uuid: "r-3", created_at: daysAgo(d), average_rank: 3.1 }] },
  "/v1/scheduled-scan-runs/r-3": [{ ...fixtures["/v1/scheduled-scan-runs/r-3"][0],
    creation_timestamp: daysAgo(d) }]
});

test("refreshState: eligibility rules", () => {
  const { refreshState } = require(path.join(API, "_lib", "localDominator.js"))._internal;
  const now = Date.parse("2026-11-06T12:00:00Z");
  const camp = { id: "c", single: true, inProgress: false, lastRunAt: "2026-10-20T08:00:00Z" };
  assert.deepEqual(refreshState(null, null, now), { available: false, reason: "no_schedule" });
  assert.equal(refreshState({ ...camp, single: false }, null, now).reason, "multi_keyword");
  assert.equal(refreshState({ ...camp, inProgress: true }, null, now).reason, "running");
  assert.deepEqual(refreshState(camp, null, now), { available: true, campaignId: "c" });
  const cd = refreshState({ ...camp, lastRunAt: "2026-11-03T08:00:00Z" }, null, now);
  assert.equal(cd.reason, "cooldown");
  assert.equal(cd.nextAt, "2026-11-10T08:00:00.000Z");
  // a recent one-time scan of the keyword also counts toward the 7 days
  assert.equal(refreshState(camp, "2026-11-05T08:00:00Z", now).reason, "cooldown");
});

test("scan: requires the X-Dashboard header (blocks cross-site triggers)", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch();
  const r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=fence%20installation%20chicago", {});
  assert.equal(r.status, 403);
  assert.equal(calls.length, 0);
});

test("scan: eligible keyword → run-now on its own campaign, 202", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch(c1RanDaysAgo(10));
  const r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=FENCE%20installation%20chicago");
  assert.equal(r.status, 202);
  assert.equal(r.json.status, "started");
  assert.equal(r.json.campaignId, "c-1");
  const posts = calls.filter(c => c.method === "POST");
  assert.equal(posts.length, 1, "exactly one paid request");
  assert.equal(posts[0].url.pathname, "/v1/scheduled-scans/c-1/run-now");
  assert.equal(r.headers["cache-control"], "no-store");
  assert.ok(!r.raw.includes(KEY));
});

test("scan: scanned 3 days ago → 429 cooldown, nothing spent", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch(c1RanDaysAgo(3));
  const r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=fence%20installation%20chicago");
  assert.equal(r.status, 429);
  assert.equal(r.json.error, "cooldown");
  assert.ok(Date.parse(r.json.nextAt) > Date.now());
  assert.equal(calls.filter(c => c.method === "POST").length, 0);
});

test("scan: campaign already running → 409, nothing spent", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch(c1RanDaysAgo(10, { in_progress: true }));
  const r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=fence%20installation%20chicago");
  assert.equal(r.status, 409);
  assert.equal(r.json.error, "running");
  assert.equal(r.json.campaignId, "c-1");
  assert.equal(calls.filter(c => c.method === "POST").length, 0);
});

test("scan: keyword without its own campaign → 409 no_schedule", async () => {
  process.env.LD_API_KEY = KEY;
  const calls = mockFetch();
  const r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=Chicago%20wrought%20iron%20gates");
  assert.equal(r.status, 409);
  assert.equal(r.json.error, "no_schedule");
  assert.equal(calls.filter(c => c.method === "POST").length, 0);
});

test("scan: unknown keyword → 404; out of credits (412) → 402 no_credits", async () => {
  process.env.LD_API_KEY = KEY;
  mockFetch();
  let r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=roofing%20chicago");
  assert.equal(r.status, 404);

  mockFetch({ ...c1RanDaysAgo(10), "POST /v1/scheduled-scans/c-1/run-now": 412 });
  r = await callScan(loadScan(), "POST", "/api/local-scan?client=amf&kw=fence%20installation%20chicago");
  assert.equal(r.status, 402);
  assert.equal(r.json.error, "no_credits");
});

test("scan status: running until a new run exists and LD is idle; other businesses are refused", async () => {
  process.env.LD_API_KEY = KEY;
  const since = daysAgo(0.01);                       // ~15 minutes ago
  const status = overrides => {
    mockFetch(overrides);
    return callScan(loadScan(), "GET", `/api/local-scan?client=amf&campaign=c-1&since=${encodeURIComponent(since)}`);
  };

  // just requested: not in progress yet, no new run → still "running"
  let r = await status(c1RanDaysAgo(10));
  assert.equal(r.json.status, "running");
  // in progress
  r = await status(c1RanDaysAgo(0.005, { in_progress: true }));
  assert.equal(r.json.status, "running");
  // finished
  r = await status(c1RanDaysAgo(0.005));
  assert.equal(r.json.status, "done");
  assert.ok(r.json.lastRunAt);

  // a campaign belonging to another business is not reported on
  mockFetch({ "/v1/scheduled-scans/c-9xxxx": { id: "c-9xxxx", place_name: "Other Fence Co", runs: [] } });
  r = await callScan(loadScan(), "GET", "/api/local-scan?client=amf&campaign=c-9xxxx");
  assert.equal(r.status, 404);

  r = await callScan(loadScan(), "GET", "/api/local-scan?client=amf&campaign=../../x");
  assert.equal(r.status, 400);
});

test("monthly plan: one campaign per keyword, copying the latest grid; existing ones kept", async () => {
  process.env.LD_API_KEY = KEY;
  mockFetch();
  const { fetchClientGrid, planMonthly } = require(path.join(API, "_lib", "localDominator.js"));
  const CLIENTS = require(path.join(API, "_lib", "clients.js"));
  const grid = await fetchClientGrid(CLIENTS.amf, KEY);
  const plan = planMonthly(CLIENTS.amf, grid);

  const fic = plan.items.find(i => i.kw === "fence installation chicago");
  assert.equal(fic.action, "keep");
  assert.equal(fic.existingId, "c-1");

  const wig = plan.items.find(i => i.kw === "Chicago wrought iron gates");
  assert.equal(wig.action, "create");
  assert.equal(wig.points, 25);                       // 5×5 square
  assert.deepEqual(wig.body.search_terms, ["Chicago wrought iron gates"]);
  assert.equal(wig.body.google_place_id, "ChIJ-amf");
  assert.equal(wig.body.grid_size, 5);
  assert.equal(wig.body.distance, 805);
  assert.equal(wig.body.shape, "square");
  assert.equal(wig.body.scheduling, "0 13 1 * *");
  assert.equal(wig.body.run_now, false);
  assert.equal(plan.newPointsPerMonth, 25);
  assert.equal(plan.totalPointsPerMonth, 25 + 37);   // + the existing 7×7 circle
});
