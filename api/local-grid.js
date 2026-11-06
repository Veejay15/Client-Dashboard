/* ==========================================================================
   GET /api/local-grid?client=<id>[&v=<token>]
   --------------------------------------------------------------------------
   Live Local Dominator geo-grid data for one dashboard client. The API key
   lives in the LD_API_KEY environment variable (Vercel → Settings →
   Environment Variables) and never leaves the server.

   Cached at Vercel's edge for 5 minutes (served stale for up to an hour
   while refreshing). Reading costs no Local Dominator credits; the cache is
   there to stay well inside API rate limits. After a fresh scan finishes,
   the dashboard adds `v=<run time>` to get a new copy straight away.
   ========================================================================== */
"use strict";

const CLIENTS = require("./_lib/clients");
const { fetchClientGrid, describeError } = require("./_lib/localDominator");

const MEMO_MS = 5 * 60 * 1000;       // per-instance cache, behind the edge cache
const memo = new Map();

function send(res, status, body, cache) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "method_not_allowed" });
  }

  const key = process.env.LD_API_KEY;
  if (!key) return send(res, 503, { error: "not_configured" });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("client") || "";
  const client = Object.prototype.hasOwnProperty.call(CLIENTS, id) ? CLIENTS[id] : null;
  if (!client) return send(res, 404, { error: "unknown_client" });

  const v = (url.searchParams.get("v") || "").slice(0, 40);
  const memoKey = `${id}|${v}`;
  const edgeCache = "public, s-maxage=300, stale-while-revalidate=3600";

  const hit = memo.get(memoKey);
  if (hit && Date.now() - hit.at < MEMO_MS) return send(res, 200, hit.body, edgeCache);

  try {
    const result = await fetchClientGrid(client, key);
    result.errors.forEach(e => console.error("[local-grid] partial:", e.status, e.message));

    const body = {
      client: id,
      business: result.business,
      address: result.address,
      fetchedAt: new Date().toISOString(),
      keywords: result.keywords,
      meta: result.meta
    };
    if (memo.size > 50) memo.clear();
    memo.set(memoKey, { at: Date.now(), body });
    return send(res, 200, body, edgeCache);
  } catch (e) {
    console.error("[local-grid] failed:", e.status, e.message);
    const auth = e.status === 401 || e.status === 403;
    return send(res, 502, { error: auth ? "ld_auth_failed" : "ld_unavailable", upstream: describeError(e) });
  }
};
