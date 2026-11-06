/* ==========================================================================
   MODULES  —  date range + comparison, Local Dominator maps, GA4
   Attached to window.Modules and wired up from app.js after boot.
   ========================================================================== */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = window.Charts.fmt;
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* --------------------------------------------------------------- dates */
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function parseISO(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function prettyRange(from, to) {
    const a = parseISO(from), b = parseISO(to);
    const sameYear = a.getFullYear() === b.getFullYear();
    const left = `${MONTHS[a.getMonth()]} ${a.getDate()}${sameYear ? "" : ", " + a.getFullYear()}`;
    const right = `${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
    return `${left} – ${right}`;
  }
  function dayCount(from, to) {
    return Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1;
  }

  /* State for the Search Rankings view. */
  const state = {
    preset: DEMO.datePresets.find(p => p.active),
    compare: DEMO.compareModes.find(c => c.active),
    metric: "clicks"
  };

  /* ====================================================== DATE CONTROLS */
  function initDateControls(onChange) {
    const dateMenu = $("#dateMenu"), compMenu = $("#compMenu");

    dateMenu.innerHTML = DEMO.datePresets.map(p => `
      <button class="dropdown__item${p === state.preset ? " is-active" : ""}" data-preset="${p.id}">
        ${p.label}${p.id !== "custom" ? `<em>${dayCount(p.from, p.to)} days</em>` : ""}
      </button>`).join("");

    compMenu.innerHTML = DEMO.compareModes.map(c => `
      <button class="dropdown__item${c === state.compare ? " is-active" : ""}" data-compare="${c.id}">
        ${c.label}
      </button>`).join("");

    function paint() {
      $("#dateLabel").textContent = state.preset.label;
      $("#dateSpan").textContent  = prettyRange(state.preset.from, state.preset.to);
      $("#compLabel").textContent = state.compare.label;
      $("#compSpan").textContent  = state.compare.id === "none"
        ? "—" : prettyRange(state.compare.from, state.compare.to);
      $("#rangeNote").textContent = `${dayCount($("#dateFrom").value, $("#dateTo").value)} days selected`;
      $("#rankChartSub").textContent = state.compare.id === "none"
        ? "Current period" : `Current period vs. ${state.compare.label.toLowerCase()}`;
      $("#kwSub").textContent = state.compare.id === "none"
        ? "12 keywords · no comparison"
        : `12 keywords · comparing against ${state.compare.label.toLowerCase()}`;

      $$("[data-preset]").forEach(b => b.classList.toggle("is-active", b.dataset.preset === state.preset.id));
      $$("[data-compare]").forEach(b => b.classList.toggle("is-active", b.dataset.compare === state.compare.id));
      $("#customRange").classList.toggle("is-open", state.preset.id === "custom");
    }

    // Toggle open/close
    $("#dateBtn").addEventListener("click", e => {
      e.stopPropagation();
      $("#compDrop").classList.remove("is-open");
      $("#dateDrop").classList.toggle("is-open");
    });
    $("#compBtn").addEventListener("click", e => {
      e.stopPropagation();
      $("#dateDrop").classList.remove("is-open");
      $("#compDrop").classList.toggle("is-open");
    });
    document.addEventListener("click", e => {
      if (!e.target.closest("#dateDrop")) $("#dateDrop")?.classList.remove("is-open");
      if (!e.target.closest("#compDrop")) $("#compDrop")?.classList.remove("is-open");
    });

    dateMenu.addEventListener("click", e => {
      const b = e.target.closest("[data-preset]");
      if (!b) return;
      state.preset = DEMO.datePresets.find(p => p.id === b.dataset.preset);
      $("#dateFrom").value = state.preset.from;
      $("#dateTo").value   = state.preset.to;
      $("#dateDrop").classList.remove("is-open");
      paint(); onChange();
    });

    compMenu.addEventListener("click", e => {
      const b = e.target.closest("[data-compare]");
      if (!b) return;
      state.compare = DEMO.compareModes.find(c => c.id === b.dataset.compare);
      $("#compDrop").classList.remove("is-open");
      paint(); onChange();
    });

    // Custom range
    ["#dateFrom", "#dateTo"].forEach(sel =>
      $(sel).addEventListener("change", () => {
        $("#rangeNote").textContent = `${dayCount($("#dateFrom").value, $("#dateTo").value)} days selected`;
      }));

    $("#applyRange").addEventListener("click", () => {
      const from = $("#dateFrom").value, to = $("#dateTo").value;
      if (parseISO(from) > parseISO(to)) {
        window.__toast("Start date must come before the end date.");
        return;
      }
      state.preset = { ...DEMO.datePresets.find(p => p.id === "custom"), from, to };
      paint(); onChange();
      window.__toast(`Range applied — ${prettyRange(from, to)}. Demo data is fixed.`);
    });

    // Metric toggle
    $("#metricSeg").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("#metricSeg button").forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.metric = b.dataset.metric;
      onChange();
    });

    paint();
  }

  /* ======================================================= RANKINGS VIEW */
  function renderRankChart() {
    const isClicks = state.metric === "clicks";
    const base = DEMO.traffic.current;
    // Impressions share the same shape; only the unit changes. Still one axis.
    const cur  = isClicks ? base : base.map(v => Math.round(v * 11.5));
    const prevBase = DEMO.traffic.previous;
    const prev = isClicks ? prevBase : prevBase.map(v => Math.round(v * 11.5));

    const series = [{
      name: "Current period", values: cur, color: cssVar("--series-1"), fill: true
    }];
    if (state.compare.id !== "none") {
      series.push({ name: state.compare.label, values: prev, color: cssVar("--series-muted"), dashed: true });
    }

    $("#rankLegend").innerHTML = series.map(s => `
      <span class="legend__item">
        <i class="legend__swatch legend__swatch--line" style="background:${s.color}"></i> ${s.name}
      </span>`).join("");

    window.Charts.lineChart($("#rankChart"), {
      labels: DEMO.traffic.labels,
      height: 280,
      ariaLabel: `${isClicks ? "Clicks" : "Impressions"} over time`,
      series
    });
  }

  function renderKeywordTable() {
    const comparing = state.compare.id !== "none";
    const metricLabel = state.metric === "clicks" ? "Clicks" : "Impressions";

    $("#kwHeadFull").innerHTML = `
      <tr>
        <th>Keyword</th>
        <th class="num">Volume</th>
        <th class="num">Position</th>
        <th class="num">${metricLabel}</th>
        ${comparing ? `<th class="num">Change</th>` : ""}
        <th>Landing page</th>
        <th>Buyer stage</th>
      </tr>`;

    const pick = r => state.metric === "clicks"
      ? { now: r.clicks, before: r.pClicks }
      : { now: r.impr,   before: r.pImpr };

    $("#kwBodyFull").innerHTML = DEMO.keywords.map(r => {
      const v = pick(r);
      const diff = v.now - v.before;
      const pct = v.before ? Math.round((diff / v.before) * 100) : 0;
      const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
      const posCls = r.pos <= 3 ? " rank--top" : r.pos <= 10 ? " rank--mid" : "";
      const posMove = r.prev - r.pos;

      return `
      <tr>
        <td class="kw">${r.kw}</td>
        <td class="num">${fmt(r.vol)}</td>
        <td class="num">
          <span class="rank${posCls}">${r.pos}</span>
          ${posMove !== 0 ? `<span class="move move--${posMove > 0 ? "up" : "down"}" style="margin-left:6px">
              <svg><use href="#i-${posMove > 0 ? "up" : "down"}"></use></svg>${Math.abs(posMove)}</span>` : ""}
        </td>
        <td class="num">
          <span class="cmp">
            <b>${fmt(v.now)}</b>
            ${comparing ? `<span>was ${fmt(v.before)}</span>` : ""}
          </span>
        </td>
        ${comparing ? `<td class="num">
          <span class="move move--${dir}">
            ${diff !== 0 ? `<svg><use href="#i-${diff > 0 ? "up" : "down"}"></use></svg>` : ""}${diff === 0 ? "—" : (pct > 0 ? "+" : "") + pct + "%"}
          </span>
        </td>` : ""}
        <td><code style="font-size:11.5px;color:var(--text-muted)">${r.url}</code></td>
        <td><span class="pill ${r.intent === "Ready to hire" ? "pill--good" : "pill--info"}">${r.intent}</span></td>
      </tr>`;
    }).join("");
  }

  function refreshRankings() {
    renderRankChart();
    renderKeywordTable();
  }

  /* ================================================== LOCAL DOMINATOR
     Live data comes from /api/local-grid, a Vercel function that holds the
     Local Dominator API key server-side. Until it answers — or if it can't —
     the view shows the saved August 2026 captures in DEMO.localDominator.
     Both sources are adapted to one keyword shape, so every renderer below
     works the same either way.                                           */
  const RANK_BANDS = [
    { key: "high",   label: "High (top 3)",  color: "--good" },
    { key: "med",    label: "Medium (4–10)", color: "--warning" },
    { key: "low",    label: "Low (11–20)",   color: "--critical" },
    { key: "outPct", label: "Not in top 20", color: "--demph" }
  ];

  const LD_REASONS = {
    not_configured: "The Local Dominator API key has not been added in Vercel yet.",
    ld_auth_failed: "Local Dominator rejected the API key — it may have been revoked or mistyped.",
    ld_unavailable: "Local Dominator is not responding right now. The page will use live data again on the next load.",
    unknown_client: "This client has not been mapped to Local Dominator yet."
  };

  const ld = {
    mode: "loading",          // loading → live | static
    reason: "",
    business: "", address: "", captured: "",
    keywords: [],
    active: 0
  };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const fmtAvg = n => (typeof n === "number" ? n.toFixed(2) : "—");
  function fmtDate(s, withYear = true) {
    if (!s) return "—";
    const d = s.length === 10 ? parseISO(s) : new Date(s);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? ", " + d.getFullYear() : ""}`;
  }
  function fmtSpacing(m) {
    if (typeof m !== "number" || !m) return null;
    const mi = m / 1609.344;
    return (mi >= 0.95 ? mi.toFixed(1).replace(/\.0$/, "") : mi.toFixed(2).replace(/0$/, "")) + " mi";
  }
  function gridLabel(k) {
    const n = k.grid ? k.grid.length : k.gridSize;
    const sp = fmtSpacing(k.spacingM);
    return [n ? `${n}×${n} grid` : null, sp ? `${sp} apart` : null].filter(Boolean).join(" · ");
  }

  function useStatic(reason) {
    const d = DEMO.localDominator;
    Object.assign(ld, {
      mode: "static",
      reason,
      business: d.business,
      address: d.address,
      captured: d.captured,
      keywords: d.keywords.map(k => ({
        kw: k.kw,
        avg: k.avg,
        image: `assets/img/local/${k.img}.webp`,
        stats: { high: k.high, med: k.med, low: k.low },
        competitors: k.competitors,
        grid: null
      }))
    });
  }

  const activeClientId = () => (DEMO.clients.find(c => c.active) || {}).id;

  /* ---------------------------------------------------------- loading
     `version` is passed after a fresh scan finishes, so the request skips
     the 5-minute edge cache and returns the new scan immediately. */
  async function loadLiveLocal(version) {
    const client = activeClientId();
    const prevKw = (ld.keywords[ld.active] || {}).kw;

    if (location.protocol === "file:") {
      useStatic("Live data needs the deployed site — this page was opened as a local file.");
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const v = version ? `&v=${encodeURIComponent(version)}` : "";
        const res = await fetch(`/api/local-grid?client=${encodeURIComponent(client)}${v}`, {
          headers: { Accept: "application/json" },
          signal: ctrl.signal
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(LD_REASONS[body.error] || `The live connection returned an error (HTTP ${res.status}).`);

        const kws = (body.keywords || []).filter(k => k.kw && (k.grid || k.image));
        if (!kws.length) throw new Error("Connected to Local Dominator, but no scans were found for this business yet.");

        Object.assign(ld, {
          mode: "live",
          reason: "",
          business: body.business,
          address: body.address,
          keywords: kws
        });
      } catch (e) {
        useStatic(e.name === "AbortError" ? "Local Dominator took too long to respond." : e.message);
      } finally {
        clearTimeout(timer);
      }
    }

    // Keep the keyword the viewer was looking at, if it still exists.
    const i = prevKw ? ld.keywords.findIndex(k => k.kw.toLowerCase() === prevKw.toLowerCase()) : -1;
    ld.active = Math.max(0, i);
    window.__setViewSub("local", ld.mode === "live"
      ? `Local Dominator · live · ${ld.keywords.length} tracked keywords`
      : `Local Dominator · saved ${ld.captured} captures`);

    // Pick up scans that were already running when the page opened.
    if (ld.mode === "live") {
      ld.keywords.forEach(k => {
        if (k.refresh && k.refresh.reason === "running" && !scanJobs.has(k.refresh.campaignId)) {
          trackScan(k.refresh.campaignId, k.kw, null);
        }
      });
    }
    renderLocalDominator();
    paintOverviewGeo();
  }

  /* -------------------------------------------------------- rendering */
  function renderLocalDominator() {
    if (!ld.keywords.length) {                    // first paint, before the fetch lands
      useStatic("");
      ld.mode = "loading";
    }
    paintLdChip();
    paintLdMeta();

    $("#ldPicker").innerHTML = ld.keywords.map((k, i) => `
      <button class="${i === ld.active ? "is-active" : ""}" data-ld="${i}">
        ${esc(k.kw)} <i>${fmtAvg(k.avg)}</i>
      </button>`).join("");

    paintLdMap();
    renderLdBars();
  }

  function paintLdChip() {
    const chip = $("#ldChip");
    if (ld.mode === "live") {
      const latest = ld.keywords.map(k => k.scannedAt).filter(Boolean).sort().pop();
      chip.className = "chip chip--live";
      chip.innerHTML = `<i></i> Live${latest ? " · scanned " + fmtDate(latest, false) : ""}`;
      chip.setAttribute("data-tip",
        "Pulled straight from Local Dominator through its API. New scans show up here automatically — the connection refreshes every 30 minutes.");
    } else if (ld.mode === "static") {
      chip.className = "chip chip--warn";
      chip.innerHTML = `<svg><use href="#i-alert"></use></svg> Saved capture`;
      chip.setAttribute("data-tip",
        `Showing the saved ${esc(ld.captured)} captures instead of live data.` +
        (ld.reason ? `<br><br>${esc(ld.reason)}` : ""));
    } else {
      chip.className = "chip";
      chip.innerHTML = `<svg class="spin"><use href="#i-refresh"></use></svg> Connecting…`;
      chip.setAttribute("data-tip", "Loading the latest scans from Local Dominator…");
    }
  }

  function paintLdMeta() {
    const k = ld.keywords[ld.active] || {};
    const parts = [ld.business, ld.address];
    if (ld.mode === "live") parts.push(gridLabel(k));
    else parts.push(ld.captured);
    $("#ldMeta").textContent = parts.filter(Boolean).join(" · ");
  }

  function paintLdMap() {
    const k = ld.keywords[ld.active];
    if (!k) return;
    const fig = $("#ldMap"), img = $("#ldImg"), fb = $("#ldFallback");

    fb.hidden = true;
    fb.innerHTML = "";
    img.hidden = false;
    img.classList.remove("is-loaded");
    fig.classList.add("is-loading");
    img.alt = `Local Dominator map for “${k.kw}” — average rank ${fmtAvg(k.avg)}`;
    // A map image that neither loads nor fails within 8s is treated as failed,
    // so a slow Local Dominator server never leaves an empty panel.
    const token = {};
    ld.imgToken = token;
    const stale = () => ld.imgToken !== token;
    img.onload = () => { if (stale()) return; img.classList.add("is-loaded"); fig.classList.remove("is-loading"); };
    img.onerror = () => { if (!stale()) showGridInMap(k); };
    if (k.image) {
      img.src = k.image;
      setTimeout(() => {
        if (!stale() && !img.classList.contains("is-loaded") && !img.hidden) showGridInMap(k);
      }, 8000);
    } else {
      showGridInMap(k);
    }

    paintLdMeta();
    paintLdLinks(k);
    paintLdSide(k);
    paintRankGrid(k);
  }

  /* When Local Dominator's map image can't be shown, draw the scan's own
     rank grid in its place so the panel is never empty. */
  function showGridInMap(k) {
    const fig = $("#ldMap"), img = $("#ldImg"), fb = $("#ldFallback");
    fig.classList.remove("is-loading");
    img.hidden = true;
    img.removeAttribute("src");
    fb.hidden = false;
    if (!k.grid) {
      fb.innerHTML = `<p class="ldmap__note">The map image for this scan isn't available right now.</p>`;
      return;
    }
    fb.innerHTML = `<div class="geo geo--map"></div>
      <p class="ldmap__note">Map image unavailable — showing every sample point from this scan instead.</p>`;
    window.__renderGeo($(".geo", fb), { keyword: k.kw, grid: k.grid, shape: k.shape });
  }

  function paintLdLinks(k) {
    const ext = `<svg class="ldlinks__ext"><use href="#i-external"></use></svg>`;
    const link = (href, icon, label, tip) => href
      ? `<a class="btn btn--ghost btn--sm" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-tip="${tip}">
           <svg><use href="#i-${icon}"></use></svg> ${label} ${ext}</a>`
      : "";
    const html = ld.mode === "live" ? [
      scanButton(k),
      link(k.live, "map", "Open interactive map", "Opens this scan in Local Dominator — zoom in and click any pin to see who outranks you at that spot."),
      link(k.report, "doc", "Scan analysis report", "Local Dominator's written analysis of this scan: strong and weak zones, top competitors and next steps."),
      link(k.campaign, "calendar", "All scans for this keyword", "Every scheduled run of this keyword in Local Dominator.")
    ].join("") : "";
    const box = $("#ldLinks");
    box.innerHTML = html;
    box.hidden = !html.trim();
    window.__bindTips(box);
  }

  /* ------------------------------------------------- on-demand scans
     The server decides eligibility (7-day limit, one at a time, keyword has
     its own monthly campaign) and re-checks it on every request; the button
     only mirrors that state. Disabled states use aria-disabled rather than
     `disabled` so their explanatory tooltips still show on hover.         */
  const SCAN_POLL_MS = 20000;
  const SCAN_GIVE_UP_MS = 20 * 60 * 1000;
  const scanJobs = new Map();                 // campaignId → { kw, since, started, timer }

  const SCAN_ERRORS = {
    no_credits: "Local Dominator is out of scan credits — your strategist has been told.",
    no_schedule: "Fresh scans aren't switched on for this keyword yet.",
    multi_keyword: "This keyword is scanned together with others, so it can't be re-scanned on its own.",
    not_configured: "Live scanning isn't connected yet.",
    ld_auth_failed: "Local Dominator rejected the connection. Please let your strategist know.",
    ld_unavailable: "Local Dominator isn't responding right now. Please try again shortly."
  };

  function scanButton(k) {
    const r = k.refresh;
    if (!r) return "";
    const off = (icon, label, tip) =>
      `<button type="button" class="btn btn--ghost btn--sm btn--off" aria-disabled="true" data-tip="${tip}">
         <svg${icon === "refresh" ? ' class="spin"' : ""}><use href="#i-${icon}"></use></svg> ${label}</button>`;

    if ((r.campaignId && scanJobs.has(r.campaignId)) || r.reason === "running") {
      return off("refresh", "Scan running…",
        `Local Dominator is scanning “${esc(k.kw)}” right now. The new map appears here automatically, usually within 5–10 minutes.`);
    }
    if (r.available) {
      return `<button type="button" class="btn btn--primary btn--sm" id="ldScanBtn" data-kw="${esc(k.kw)}"
        data-tip="Runs a brand-new Local Dominator scan of this keyword. The new map appears here automatically, usually within 5–10 minutes.<br><br>Each keyword can be re-scanned once every 7 days.">
        <svg><use href="#i-refresh"></use></svg> Request a fresh scan</button>`;
    }
    if (r.reason === "cooldown") {
      return off("clock", `Next fresh scan ${fmtDate(r.nextAt, false)}`,
        `Each keyword can be re-scanned once every 7 days. This one was scanned recently — it can be scanned again on ${fmtDate(r.nextAt)}.`);
    }
    if (r.reason === "multi_keyword") {
      return off("refresh", "Fresh scan unavailable",
        "This keyword is scanned together with others in Local Dominator, so it can't be re-scanned on its own.");
    }
    return off("refresh", "Fresh scans coming soon",
      "Fresh scans switch on once this keyword's monthly scan schedule is set up by your Makarios strategist.");
  }

  async function requestScan(btn) {
    const k = ld.keywords[ld.active];
    if (!k || btn.getAttribute("aria-disabled") === "true") return;

    // Scans spend credits — first click arms, second click starts.
    if (!btn.classList.contains("is-confirming")) {
      btn.classList.add("is-confirming");
      btn.innerHTML = `<svg><use href="#i-check"></use></svg> Click again to start the scan`;
      btn.__reset = setTimeout(() => paintLdLinks(ld.keywords[ld.active]), 5000);
      return;
    }
    clearTimeout(btn.__reset);
    btn.setAttribute("aria-disabled", "true");
    btn.innerHTML = `<svg class="spin"><use href="#i-refresh"></use></svg> Starting…`;

    let msg;
    try {
      const q = new URLSearchParams({ client: activeClientId(), kw: k.kw });
      const res = await fetch(`/api/local-scan?${q}`, {
        method: "POST",
        headers: { "X-Dashboard": "1", Accept: "application/json" }
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 202) {
        k.refresh = { available: false, reason: "running", campaignId: body.campaignId };
        trackScan(body.campaignId, k.kw, body.startedAt);
        msg = `Scan started for “${k.kw}” — the new map will appear here in about 5–10 minutes.`;
      } else if (body.error === "running") {
        k.refresh = { available: false, reason: "running", campaignId: body.campaignId };
        trackScan(body.campaignId, k.kw, null);
        msg = "A scan for this keyword is already running.";
      } else if (body.error === "cooldown") {
        k.refresh = { ...k.refresh, available: false, reason: "cooldown", nextAt: body.nextAt };
        msg = `This keyword was scanned recently — it can be scanned again on ${fmtDate(body.nextAt)}.`;
      } else {
        msg = SCAN_ERRORS[body.error] || "The scan couldn't be started. Please try again later.";
      }
    } catch (e) {
      msg = "Couldn't reach the server. Please check your connection and try again.";
    }
    window.__toast(msg);
    if (ld.keywords[ld.active] === k) paintLdLinks(k);
  }

  function trackScan(campaignId, kw, since) {
    if (!campaignId || scanJobs.has(campaignId)) return;
    scanJobs.set(campaignId, { kw, since, started: Date.now(), timer: null });
    scanJobs.get(campaignId).timer = setTimeout(() => pollScan(campaignId), SCAN_POLL_MS);
  }

  async function pollScan(campaignId) {
    const job = scanJobs.get(campaignId);
    if (!job) return;
    if (Date.now() - job.started > SCAN_GIVE_UP_MS) {
      scanJobs.delete(campaignId);
      window.__toast(`The scan for “${job.kw}” is taking longer than usual. It will show here once Local Dominator finishes.`);
      return;
    }
    try {
      const q = new URLSearchParams({ client: activeClientId(), campaign: campaignId });
      if (job.since) q.set("since", job.since);
      const res = await fetch(`/api/local-scan?${q}`, { headers: { "X-Dashboard": "1", Accept: "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === "done") {
        scanJobs.delete(campaignId);
        window.__toast(`Fresh scan ready for “${job.kw}”.`);
        await loadLiveLocal(body.lastRunAt || String(Date.now()));
        return;
      }
      if (res.status === 404 || res.status === 400) {        // campaign gone — stop quietly
        scanJobs.delete(campaignId);
        return;
      }
    } catch (e) { /* network blip — try again next tick */ }
    job.timer = setTimeout(() => pollScan(campaignId), SCAN_POLL_MS);
  }

  function rankDelta(k) {
    if (!k.prev || typeof k.avg !== "number") return "";
    const d = Math.round((k.prev.avg - k.avg) * 100) / 100;     // positive = moved up
    const when = fmtDate(k.prev.date);
    if (d === 0) return `<span class="ldstat__delta">No change since ${when}</span>`;
    const dir = d > 0 ? "up" : "down";
    return `<span class="ldstat__delta ldstat__delta--${dir}">
      <svg><use href="#i-${dir}"></use></svg>${Math.abs(d).toFixed(2)} since ${when}</span>`;
  }

  function paintLdSide(k) {
    const s = k.stats || {};
    const live = ld.mode === "live";
    const bands = live ? RANK_BANDS : RANK_BANDS.slice(0, 3);
    const hasTrend = live && (k.history || []).length >= 3;

    let html = `
      <div class="ldstat" data-tip="Average Google Maps position across the sample points. Lower is better — 1 is the top of the map pack.">
        <span class="ldstat__label">Average rank</span>
        <div class="ldstat__value">${fmtAvg(k.avg)}</div>
        ${live ? rankDelta(k) : ""}
        ${hasTrend ? `<div class="ldspark" id="ldSpark" aria-hidden="true"></div>
          <span class="ldstat__sub">${k.history.length} scans since ${fmtDate(k.history[0].date)} · line rising = ranking better</span>` : ""}
      </div>
      <div class="ldstat">
        <span class="ldstat__label">Coverage breakdown</span>
        <div class="ldbreak">
          ${bands.map(b => `
            <div class="ldbreak__row" data-tip="${b.label} — share of sample points in this band.">
              <span class="ldbreak__dot" style="background:var(${b.color})"></span>
              <span class="ldbreak__name">${b.label}</span>
              <span class="ldbreak__val">${s[b.key] ? s[b.key] + "%" : "—"}</span>
            </div>`).join("")}
        </div>
      </div>`;

    if (live) {
      html += `
      <div class="ldstat" data-tip="Sample points where the business appears anywhere in the top 20 Google Maps results.">
        <span class="ldstat__label">Visible at</span>
        <div class="ldstat__value">${s.found ?? "—"}<small> / ${s.points ?? "—"} points</small></div>
      </div>
      <div class="ldstat" data-tip="When Local Dominator ran this scan, and the grid it used.">
        <span class="ldstat__label">Last scanned</span>
        <div class="ldstat__value ldstat__value--sm">${fmtDate(k.scannedAt)}</div>
        <span class="ldstat__sub">${esc(gridLabel(k))}${k.source === "scheduled" ? " · scheduled scan" : ""}</span>
        ${k.schedule && k.schedule.nextRunAt ? `<span class="ldstat__next" data-tip="Local Dominator re-scans this keyword automatically every month, so the trend keeps building without anyone asking.">
          <svg><use href="#i-calendar"></use></svg> Next automatic scan ${fmtDate(k.schedule.nextRunAt)}</span>` : ""}
      </div>`;
    } else {
      html += `
      <div class="ldstat">
        <span class="ldstat__label">Competitors tracked</span>
        <div class="ldstat__value">${k.competitors}</div>
      </div>
      <div class="ldstat" data-tip="Total Approximate Reach Percentage — Local Dominator's single measure of how much of the map area this business realistically reaches.">
        <span class="ldstat__label">TARP score</span>
        <div class="ldstat__value">${DEMO.localDominator.tarp}</div>
      </div>`;
    }

    $("#ldSide").innerHTML = html;
    if (hasTrend) paintLdSpark(k);
    window.__bindTips($("#ldSide"));
  }

  /* Rank is lower-is-better, so the trend is plotted inverted: a rising line
     always means improvement, like every other sparkline on the dashboard. */
  function paintLdSpark(k) {
    const m = $("#ldSpark");
    if (!m || !m.clientWidth) return;
    window.Charts.sparkline(m, k.history.map(h => -h.avg), { color: cssVar("--series-1") });
  }

  function paintRankGrid(k) {
    if (k.grid) {
      $("#geoKw2").textContent = `“${k.kw}” · ${gridLabel(k)} · ${fmtDate(k.scannedAt)}`;
      window.__renderGeo($("#geoGrid2"), { keyword: k.kw, grid: k.grid, shape: k.shape });
    } else {
      const g = DEMO.geoGrid;
      $("#geoKw2").textContent = `“${g.keyword}” · ${g.radius} radius · sample layout`;
    }
  }

  /* The Overview card mirrors one keyword — the demo's headline term if it
     was scanned, otherwise the best-ranked live keyword. */
  function paintOverviewGeo() {
    if (ld.mode !== "live") return;
    const want = DEMO.geoGrid.keyword.toLowerCase();
    const k = ld.keywords.find(x => x.grid && x.kw.toLowerCase() === want) || ld.keywords.find(x => x.grid);
    if (!k) return;

    $("#geoKw").textContent = `“${k.kw}” · ${gridLabel(k)} · ${fmtDate(k.scannedAt, false)}`;
    window.__renderGeo($("#geoGrid"), { keyword: k.kw, grid: k.grid, shape: k.shape });
    $("#geoAvg").textContent = fmtAvg(k.avg);
    $("#geoTop3").textContent = Math.round((k.stats && k.stats.high) || 0) + "%";

    const delta = $("#geoAvgDelta");
    if (k.prev) {
      const d = Math.round((k.prev.avg - k.avg) * 10) / 10;
      delta.textContent = d === 0 ? "—" : `${d > 0 ? "↑" : "↓"} ${Math.abs(d)}`;
      delta.style.color = d > 0 ? "var(--good)" : d < 0 ? "var(--critical)" : "var(--text-muted)";
    } else {
      delta.textContent = "";
    }
    $("#geoTop3Delta").textContent = "";      // no prior grid to compare against
  }

  function renderLdBars() {
    const ks = ld.keywords
      .map((k, i) => ({ ...k, i }))
      .filter(k => typeof k.avg === "number")
      .sort((a, b) => a.avg - b.avg);
    if (!ks.length) { $("#ldBars").innerHTML = ""; return; }
    const worst = Math.max(...ks.map(k => k.avg)) || 1;
    const c1 = cssVar("--series-1"), demph = cssVar("--demph");

    $("#ldBars").innerHTML = ks.map((k, rank) => {
      const tip = ld.mode === "live"
        ? `<strong>${esc(k.kw)}</strong>Average rank ${fmtAvg(k.avg)} · visible at ${k.stats ? k.stats.found + " of " + k.stats.points : "—"} points.<br><em style='opacity:.7'>Click to open this map.</em>`
        : `<strong>${esc(k.kw)}</strong>Average rank ${fmtAvg(k.avg)} across ${k.competitors} tracked competitors.`;
      return `
      <button class="hbar hbar--btn" data-ld="${k.i}" data-tip="${tip}">
        <span class="hbar__name">${esc(k.kw)}</span>
        <span class="hbar__track">
          <span class="hbar__fill" data-w="${(k.avg / worst * 100).toFixed(1)}"
                style="background:${rank === 0 ? c1 : demph}"></span>
        </span>
        <span class="hbar__val">${fmtAvg(k.avg)}</span>
      </button>`;
    }).join("");

    requestAnimationFrame(() =>
      $$("#ldBars .hbar__fill").forEach(f => f.style.width = f.dataset.w + "%"));
    window.__bindTips($("#ldBars"));
  }

  function selectLdKeyword(i) {
    if (!ld.keywords[i] || i === ld.active) return;
    ld.active = i;
    $$("#ldPicker button").forEach(x => x.classList.toggle("is-active", +x.dataset.ld === i));
    paintLdMap();
  }

  /* Charts measure their box, so they are redrawn when the view is shown and
     when the theme changes. */
  function redrawLocalCharts() {
    renderLdBars();
    const k = ld.keywords[ld.active];
    if (k && (k.history || []).length >= 3 && ld.mode === "live") paintLdSpark(k);
  }

  /* ================================================================ GA4 */
  function renderGa4() {
    window.__renderKpis($("#ga4Kpis"), DEMO.ga4.kpis);

    /* Conversions — single series magnitude over time. */
    window.Charts.columns($("#ga4Events"), {
      labels: DEMO.ga4.events.labels,
      values: DEMO.ga4.events.values,
      color: cssVar("--series-1"),
      height: 240,
      unit: " conversions",
      ariaLabel: "Conversion events by month"
    });

    /* Channels — part-to-whole, one stacked bar + a labelled list. */
    const palette = ["--series-1", "--series-2", "--series-3", "--series-4", "--demph"];
    const ch = DEMO.ga4.channels;

    $("#ga4Channels").innerHTML = `
      <div class="stackbar">
        ${ch.map((c, i) => `
          <span class="stackbar__seg" style="width:${c.pct}%;background:var(${palette[i]})"
                data-tip="<strong>${c.name}</strong>${fmt(c.sessions)} sessions · ${c.pct}% of total"></span>`).join("")}
      </div>
      ${ch.map((c, i) => `
        <div class="chanrow">
          <span class="chanrow__dot" style="background:var(${palette[i]})"></span>
          <span class="chanrow__name">${c.name}</span>
          <span class="chanrow__val">${fmt(c.sessions)}</span>
          <span class="chanrow__pct">${c.pct}%</span>
          <span class="move move--${c.delta >= 0 ? "up" : "down"}" style="width:52px;justify-content:flex-end">
            <svg><use href="#i-${c.delta >= 0 ? "up" : "down"}"></use></svg>${Math.abs(c.delta)}%
          </span>
        </div>`).join("")}`;

    renderDonut();

    /* Landing pages */
    $("#ga4Pages").innerHTML = DEMO.ga4.landingPages.map(p => {
      const strong = p.rate >= 4.5;
      return `
      <tr>
        <td><code style="font-size:12px;color:var(--text-primary)">${p.url}</code></td>
        <td class="num">${fmt(p.sessions)}</td>
        <td>
          <span class="sov">
            <span class="sov__track"><span class="sov__fill" data-w="${(p.rate / 7 * 100).toFixed(1)}"
                  style="background:${strong ? cssVar("--series-1") : cssVar("--demph")}"></span></span>
            <b>${p.rate}%</b>
          </span>
        </td>
        <td class="num">${p.time}s</td>
      </tr>`;
    }).join("");

    requestAnimationFrame(() =>
      $$("#ga4Pages .sov__fill").forEach(f => f.style.width = f.dataset.w + "%"));

    window.__bindTips($("#ga4Channels"));
    window.__bindTips($("#ga4Devices"));
  }

  /* Donut for device split — part-to-whole with only three slices. */
  function renderDonut() {
    const d = DEMO.ga4.devices;
    const palette = ["--series-1", "--series-2", "--series-3"];
    const R = 54, SW = 18, C = 2 * Math.PI * R;
    let offset = 0;

    const arcs = d.map((x, i) => {
      const len = (x.pct / 100) * C;
      // 2px gap between adjacent segments
      const seg = `<circle cx="70" cy="70" r="${R}" fill="none"
        stroke="var(${palette[i]})" stroke-width="${SW}"
        stroke-dasharray="${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}"
        stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"
        style="transition:stroke-dasharray .9s var(--ease-out)"></circle>`;
      offset += len;
      return seg;
    }).join("");

    $("#ga4Devices").innerHTML = `
      <div class="donut">
        <svg class="donut__chart" width="140" height="140" viewBox="0 0 140 140" role="img"
             aria-label="Sessions by device">
          ${arcs}
          <text x="70" y="66" text-anchor="middle" style="font-size:22px;font-weight:700;fill:var(--text-primary);letter-spacing:-.03em">${d[0].pct}%</text>
          <text x="70" y="84" text-anchor="middle" style="font-size:11px;fill:var(--text-muted)">mobile</text>
        </svg>
        <div class="donut__legend">
          ${d.map((x, i) => `
            <div class="chanrow" style="border:none;padding:0">
              <span class="chanrow__dot" style="background:var(${palette[i]})"></span>
              <span class="chanrow__name">${x.name}</span>
              <span class="chanrow__val">${x.pct}%</span>
            </div>`).join("")}
        </div>
      </div>`;
  }

  /* ================================================ GBP — extended cards */
  function stars(n) {
    return `<span class="stars">${Array.from({ length: 5 }, (_, i) =>
      `<svg style="${i < n ? "" : "opacity:.2"}"><use href="#i-star"></use></svg>`).join("")}</span>`;
  }

  function renderGbpExtra() {
    const g = DEMO.gbp;

    $("#gbpRecent").innerHTML = g.recentReviews.map(r => `
      <div class="rev">
        <span class="rev__av">${r.initials}</span>
        <div class="rev__body">
          <div class="rev__top">
            <b>${r.name}</b>
            ${stars(r.stars)}
            <span class="rev__when">${r.when}</span>
          </div>
          <p class="rev__text">${r.text}</p>
          <span class="pill ${r.replied ? "pill--good" : "pill--warn"}" style="margin-top:7px">
            <svg><use href="#i-${r.replied ? "check" : "alert"}"></use></svg>
            ${r.replied ? "Replied" : "Awaiting reply"}
          </span>
        </div>
      </div>`).join("");

    window.Charts.columns($("#gbpChart"), {
      labels: g.interactions.labels,
      values: g.interactions.values,
      color: cssVar("--series-1"),
      height: 230,
      unit: " interactions",
      ariaLabel: "Total profile interactions by month"
    });

    const total = g.distribution.reduce((s, d) => s + d.count, 0);
    $("#gbpDist").innerHTML = g.distribution.map(d => `
      <div class="hbar" data-tip="${d.count} of ${total} reviews gave ${d.stars} star${d.stars > 1 ? "s" : ""}.">
        <span class="hbar__name" style="width:58px">${d.stars} star${d.stars > 1 ? "s" : ""}</span>
        <span class="hbar__track">
          <span class="hbar__fill" data-w="${(d.count / total * 100).toFixed(1)}"
                style="background:${d.stars >= 4 ? cssVar("--series-1") : cssVar("--demph")}"></span>
        </span>
        <span class="hbar__val">${d.count}</span>
      </div>`).join("");
    requestAnimationFrame(() =>
      $$("#gbpDist .hbar__fill").forEach(f => f.style.width = f.dataset.w + "%"));

    $("#gbpQa").innerHTML = g.questions.map(q => `
      <div class="qa">
        <span class="qa__icon ${q.answered ? "is-done" : "is-open"}">
          <svg><use href="#i-${q.answered ? "check" : "alert"}"></use></svg>
        </span>
        <div>
          <b>${q.q}</b>
          <span>${q.when}</span>
        </div>
      </div>`).join("");

    window.__bindTips($("#gbpDist"));
  }

  /* ================================================= AI — extended cards */
  function renderAiExtra() {
    const ai = DEMO.aiVisibility;

    window.Charts.lineChart($("#aiTrend"), {
      labels: ai.trend.labels,
      height: 230,
      unit: "%",
      ariaLabel: "AI citation rate by month",
      series: [{ name: "Citation rate", values: ai.trend.values, color: cssVar("--series-1"), fill: true }]
    });

    $("#aiPrompts").innerHTML = ai.prompts.map(p => `
      <tr>
        <td class="kw">${p.prompt}</td>
        <td>
          <span class="pill ${p.cited ? "pill--good" : "pill--warn"}">
            <svg><use href="#i-${p.cited ? "check" : "alert"}"></use></svg>
            ${p.cited ? "Cited" : "Not cited"}
          </span>
        </td>
        <td class="num">${p.rank ? `<span class="rank rank--top">${p.rank}</span>` : "—"}</td>
        <td style="color:var(--text-muted)">${p.source}</td>
      </tr>`).join("");

    $("#aiDrivers").innerHTML = ai.drivers.map((d, i) => `
      <div class="hbar" data-tip="<strong>${d.label}</strong>${d.note}">
        <span class="hbar__name" style="width:150px">${d.label}</span>
        <span class="hbar__track">
          <span class="hbar__fill" data-w="${d.weight}"
                style="background:${i >= ai.drivers.length - 2 ? cssVar("--demph") : cssVar("--series-1")}"></span>
        </span>
        <span class="hbar__val">${d.weight}</span>
      </div>`).join("");
    requestAnimationFrame(() =>
      $$("#aiDrivers .hbar__fill").forEach(f => f.style.width = f.dataset.w + "%"));

    window.__bindTips($("#aiDrivers"));
  }

  /* ============================================ ACTION PLAN — extended */
  function renderActionsExtra() {
    $("#roadmap").innerHTML = DEMO.roadmap.map(p => `
      <div class="phase ${p.status === "active" ? "is-active" : ""}">
        <div class="phase__head">
          <span class="phase__dot"></span>
          <b>${p.phase}</b>
          <span class="pill ${p.status === "active" ? "pill--good" : "pill--info"}">
            ${p.status === "active" ? "In progress" : "Queued"}
          </span>
        </div>
        <ul class="phase__list">
          ${p.items.map(i => `<li>${i}</li>`).join("")}
        </ul>
      </div>`).join("");

    $("#completed").innerHTML = DEMO.completedActions.map(c => `
      <div class="feeditem">
        <span class="feedicon feedicon--done"><svg><use href="#i-check"></use></svg></span>
        <span class="feedbody">
          <b>${c.title}</b>
          <span style="color:var(--good);font-weight:600">${c.impact}</span>
        </span>
        <span class="feedtime">${c.when}</span>
      </div>`).join("");
  }

  /* ============================================================= EXPORT */
  let inited = false;

  window.Modules = {
    init(onRankingsChange) {
      // boot() runs again after sign-out → sign-in; listeners must bind once,
      // or one click on "Request a fresh scan" would both arm AND confirm it.
      if (inited) return;
      inited = true;
      initDateControls(onRankingsChange);

      $("#ldPicker").addEventListener("click", e => {
        const b = e.target.closest("[data-ld]");
        if (b) selectLdKeyword(+b.dataset.ld);
      });

      $("#ldLinks").addEventListener("click", e => {
        const b = e.target.closest("#ldScanBtn");
        if (b) requestScan(b);
      });

      // The coverage bars double as a keyword picker.
      $("#ldBars").addEventListener("click", e => {
        const b = e.target.closest("[data-ld]");
        if (!b) return;
        selectLdKeyword(+b.dataset.ld);
        $("#ldPicker").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    refreshRankings,
    renderLocalDominator,
    loadLiveLocal,
    redrawLocalCharts,
    renderGa4,
    renderGbpExtra,
    renderAiExtra,
    renderActionsExtra,
    state
  };
})();
