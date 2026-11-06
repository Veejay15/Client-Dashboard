/* ==========================================================================
   On-demand Local Dominator scans
   --------------------------------------------------------------------------
   POST /api/local-scan?client=<id>&kw=<keyword>
        Starts a fresh scan of one keyword through its monthly campaign
        ("run now"). Spends Local Dominator credits, so it is only allowed
        when, according to Local Dominator itself:
          • the keyword has its own single-keyword campaign,
          • that campaign is not already running, and
          • the keyword has not been scanned in the last 7 days.
        Eligibility is re-checked here on every request — the button state
        in the browser is never trusted.

   GET  /api/local-scan?client=<id>&campaign=<id>[&since=<ISO>]
        Progress of a requested scan: { status: "running" | "done" }.
        One Local Dominator request per call; the dashboard polls it.

   Requests must carry `X-Dashboard: 1`. A custom header cannot be sent by a
   plain cross-site form or link, so other websites cannot make a visitor's
   browser start scans.
   ========================================================================== */
"use strict";

const CLIENTS = require("./_lib/clients");
const { fetchClientGrid, startCampaignRun, campaignStatus, describeError, REFRESH_COOLDOWN_DAYS } = require("./_lib/localDominator");

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function failed(res, e, where) {
  console.error(`[local-scan] ${where}:`, e.status, e.message);
  if (e.status === 412) return send(res, 402, { error: "no_credits" });
  const auth = e.status === 401 || e.status === 403;
  return send(res, 502, { error: auth ? "ld_auth_failed" : "ld_unavailable", upstream: describeError(e) });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "method_not_allowed" });
  }
  if (req.headers["x-dashboard"] !== "1") return send(res, 403, { error: "forbidden" });

  const key = process.env.LD_API_KEY;
  if (!key) return send(res, 503, { error: "not_configured" });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("client") || "";
  const client = Object.prototype.hasOwnProperty.call(CLIENTS, id) ? CLIENTS[id] : null;
  if (!client) return send(res, 404, { error: "unknown_client" });

  /* ------------------------------------------------------------ status */
  if (req.method === "GET") {
    const campaign = url.searchParams.get("campaign") || "";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(campaign)) return send(res, 400, { error: "bad_campaign" });
    const sinceRaw = url.searchParams.get("since");
    const since = sinceRaw && !isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : null;
    try {
      const s = await campaignStatus(client, campaign, since, key);
      if (!s.found) return send(res, 404, { error: "unknown_campaign" });
      return send(res, 200, { status: s.status, lastRunAt: s.lastRunAt || null });
    } catch (e) {
      return failed(res, e, "status");
    }
  }

  /* ------------------------------------------------------------- start */
  const kw = (url.searchParams.get("kw") || "").trim();
  if (!kw || kw.length > 200) return send(res, 400, { error: "bad_keyword" });

  let keyword;
  try {
    const grid = await fetchClientGrid(client, key);
    keyword = grid.keywords.find(k => k.kw.toLowerCase() === kw.toLowerCase());
  } catch (e) {
    return failed(res, e, "check");
  }
  if (!keyword) return send(res, 404, { error: "unknown_keyword" });

  const r = keyword.refresh;
  if (!r.available) {
    const status = r.reason === "cooldown" ? 429 : 409;
    return send(res, status, {
      error: r.reason,
      nextAt: r.nextAt || null,
      campaignId: r.reason === "running" ? r.campaignId : undefined,
      cooldownDays: REFRESH_COOLDOWN_DAYS
    });
  }

  const startedAt = new Date().toISOString();
  try {
    await startCampaignRun(r.campaignId, key);
  } catch (e) {
    return failed(res, e, "start");
  }
  console.log(`[local-scan] started: client=${id} kw="${keyword.kw}" campaign=${r.campaignId}`);
  return send(res, 202, { status: "started", campaignId: r.campaignId, startedAt });
};
