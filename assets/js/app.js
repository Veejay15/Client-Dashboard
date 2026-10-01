/* ==========================================================================
   APP  —  Makarios Client Intelligence Dashboard
   Demo build: all state is in-memory, all data from data.js
   ========================================================================== */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = window.Charts.fmt;

  const SERIES = ["--series-1", "--series-2", "--series-3", "--series-4"];
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ====================================================== TOOLTIP ENGINE */
  const tipEl = $("#tip");
  const Tip = {
    show(x, y, html) {
      tipEl.innerHTML = html;
      tipEl.classList.add("is-visible");
      this.move(x, y);
    },
    move(x, y) {
      const r = tipEl.getBoundingClientRect();
      let left = x + 14, top = y + 16;
      if (left + r.width > innerWidth - 10) left = x - r.width - 14;
      if (top + r.height > innerHeight - 10) top = y - r.height - 14;
      tipEl.style.left = Math.max(8, left) + "px";
      tipEl.style.top  = Math.max(8, top) + "px";
    },
    hide() { tipEl.classList.remove("is-visible"); }
  };
  window.__tip = Tip;

  /* Declarative tooltips: [data-tip] on any element, and the .info bubbles. */
  function bindTips(root = document) {
    $$("[data-tip]", root).forEach(node => {
      if (node.__tipBound) return;
      node.__tipBound = true;
      const text = node.getAttribute("data-tip");
      node.addEventListener("mouseenter", e => Tip.show(e.clientX, e.clientY, text));
      node.addEventListener("mousemove",  e => Tip.move(e.clientX, e.clientY));
      node.addEventListener("mouseleave", () => Tip.hide());
      node.addEventListener("focus",      () => {
        const r = node.getBoundingClientRect();
        Tip.show(r.left + r.width / 2, r.bottom, text);
      });
      node.addEventListener("blur", () => Tip.hide());
    });
  }

  /* ============================================================== TOAST */
  let toastTimer;
  function toast(msg) {
    $("#toastMsg").textContent = msg;
    $("#toast").classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("is-visible"), 3200);
  }

  /* ====================================================== BUTTON RIPPLE */
  document.addEventListener("pointerdown", e => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty("--rx", (e.clientX - r.left) + "px");
    btn.style.setProperty("--ry", (e.clientY - r.top) + "px");
    btn.classList.remove("is-rippling");
    void btn.offsetWidth;
    btn.classList.add("is-rippling");
  });

  /* Any element with data-toast fires one. */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-toast]");
    if (t) toast(t.getAttribute("data-toast"));
  });

  /* A click means the pointer has committed to something — drop any tooltip
     so it can't stay pinned over the content behind it. */
  document.addEventListener("click", () => Tip.hide(), true);

  /* =============================================== NUMBER COUNT-UP ANIM */
  function countUp(node, to, decimals = 0, compact = false, suffix = "") {
    const dur = 1100, start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = to * eased;
      const text = compact ? fmt(Math.round(v), true)
                           : v.toLocaleString("en-US", {
                               minimumFractionDigits: decimals,
                               maximumFractionDigits: decimals
                             });
      node.textContent = text + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ========================================================= COMPONENTS */

  function deltaHtml(delta, invert, baseline = "vs. previous period", label) {
    // `delta` is always signed so that POSITIVE = better, including for metrics
    // where the raw number falls when things improve (avg. position). `label`
    // overrides the text for those, so "+26.3%" can read "5.8 positions".
    const cls = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
    const icon = delta === 0 ? "" : `<svg><use href="#i-${delta > 0 ? "up" : "down"}"></use></svg>`;
    const text = label || `${delta > 0 ? "+" : ""}${delta}%`;
    return `<span class="delta delta--${cls}">${icon}${text}</span>` +
           (baseline ? `<span class="delta__base">${baseline}</span>` : "");
  }

  function statTile(k) {
    const compact = k.format === "compact";
    const d = document.createElement("div");
    d.className = "stat anim-in";
    d.innerHTML = `
      <div class="stat__top">
        <span class="stat__icon"><svg><use href="#i-${k.icon}"></use></svg></span>
        <span class="stat__label">${k.label}</span>
        <span class="info" data-tip="<strong>${k.label}</strong>${k.tip}<br><br><em style='opacity:.72'>Source: ${k.source}</em>">?</span>
      </div>
      <div class="stat__value" data-to="${k.value}" data-dec="${k.decimals || 0}"
           data-compact="${compact}" data-suffix="${k.suffix || ""}">0</div>
      <div class="stat__row">${deltaHtml(k.delta, k.invertDelta, "vs. previous period", k.deltaLabel)}</div>
      <div class="stat__spark"></div>`;
    return d;
  }

  function renderKpis(mount, list) {
    mount.innerHTML = "";
    list.forEach((k, i) => {
      const tile = statTile(k);
      tile.style.setProperty("--d", (i * 55) + "ms");
      mount.append(tile);
      const spark = $(".stat__spark", tile);
      spark.__values = k.spark;          // kept so resize/theme can redraw it
      window.Charts.sparkline(spark, k.spark, { color: cssVar("--series-1") });
    });
    bindTips(mount);
    observe(mount);
  }

  /* --------------------------------------------------------- geo grid */
  function rankColor(rank) {
    // Sequential: one hue, more-is-darker. Rank is also printed in every cell,
    // so colour is never the only encoding.
    if (rank <= 1)  return "--seq-8";
    if (rank <= 3)  return "--seq-7";
    if (rank <= 5)  return "--seq-6";
    if (rank <= 8)  return "--seq-5";
    if (rank <= 11) return "--seq-4";
    if (rank <= 15) return "--seq-3";
    if (rank <= 20) return "--seq-2";
    return "--seq-1";
  }
  function rankInk(rank) {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) return rank <= 5 ? "#06220f" : "#dfeee4";
    return rank <= 8 ? "#ffffff" : "#0c110d";
  }

  function renderGeo(mount) {
    const g = DEMO.geoGrid;
    mount.innerHTML = "";
    g.cells.forEach((rank, i) => {
      const row = Math.floor(i / 7), col = i % 7;
      const cell = document.createElement("div");
      cell.className = "geocell" + (row === 3 && col === 3 ? " geocell--center" : "");
      cell.style.setProperty("--d", ((row + col) * 28) + "ms");
      cell.style.background = `var(${rankColor(rank)})`;
      cell.style.color = rankInk(rank);
      cell.textContent = rank;
      cell.setAttribute("data-tip",
        `<strong>Grid point ${row + 1}·${col + 1}</strong>Rank <b>#${rank}</b> for “${g.keyword}”` +
        (row === 3 && col === 3 ? "<br><em style='opacity:.7'>Business location</em>" : ""));
      mount.append(cell);
    });
    bindTips(mount);
  }

  /* -------------------------------------------------------- keywords */
  function moveCell(pos, prev) {
    const delta = prev - pos;
    if (delta === 0) return `<span class="move move--flat">—</span>`;
    const dir = delta > 0 ? "up" : "down";
    return `<span class="move move--${dir}"><svg><use href="#i-${dir}"></use></svg>${Math.abs(delta)}</span>`;
  }
  function rankCell(pos) {
    const cls = pos <= 3 ? " rank--top" : pos <= 10 ? " rank--mid" : "";
    return `<span class="rank${cls}">${pos}</span>`;
  }

  function renderKeywords(mount, rows, full) {
    mount.innerHTML = rows.map(r => `
      <tr>
        <td class="kw">${r.kw}</td>
        <td class="num">${fmt(r.vol)}</td>
        <td class="num">${rankCell(r.pos)}</td>
        <td class="num">${moveCell(r.pos, r.prev)}</td>
        ${full ? `<td><code style="font-size:11.5px;color:var(--text-muted)">${r.url}</code></td>` : ""}
        <td><span class="pill ${r.intent === "Ready to hire" ? "pill--good" : "pill--info"}">${r.intent}</span></td>
      </tr>`).join("");
  }

  /* ----------------------------------------------------- competitors */
  function compEntities() {
    return DEMO.competitors.entities.map(e => ({
      ...e, color: cssVar(SERIES[e.series - 1])
    }));
  }

  function renderCompLegend(mount) {
    mount.innerHTML = compEntities().map(e => `
      <span class="legend__item">
        <i class="legend__swatch" style="background:${e.color}"></i>
        ${e.name}${e.isClient ? ' <b style="color:var(--text-primary)">(you)</b>' : ""}
      </span>`).join("");
  }

  function renderCompTable(mount) {
    // Emphasis chart: the client in the accent hue, everyone else in the
    // de-emphasis fill. Bars are scaled so the LEADER fills the track — at
    // raw percentages the whole set would sit under a third of the width and
    // read as empty. The printed % is always the true value.
    const peak = Math.max(...DEMO.competitors.table.map(r => r.sov));
    mount.innerHTML = DEMO.competitors.table.map(r => {
      const color = r.isClient ? cssVar("--series-1") : cssVar("--demph");
      const w = (r.sov / peak) * 100;
      return `
      <tr${r.isClient ? ' style="background:var(--brand-50)"' : ""}>
        <td style="font-weight:${r.isClient ? 650 : 500};color:var(--text-primary)">
          ${r.name}${r.isClient ? ' <span class="pill pill--good" style="margin-left:5px">You</span>' : ""}
        </td>
        <td>
          <span class="sov">
            <span class="sov__track"><span class="sov__fill" data-w="${w.toFixed(1)}" style="background:${color}"></span></span>
            <b>${r.sov}%</b>
          </span>
        </td>
        <td class="num">${r.kws ? fmt(r.kws) : "—"}</td>
        <td class="num">${r.reviews ? fmt(r.reviews) : "—"}</td>
        <td class="num">${r.rating ? r.rating.toFixed(1) : "—"}</td>
        <td class="num">${r.da || "—"}</td>
        <td style="color:var(--text-muted);white-space:normal;min-width:180px">${r.gap}</td>
      </tr>`;
    }).join("");
    requestAnimationFrame(() =>
      $$(".sov__fill", mount).forEach(f => f.style.width = f.dataset.w + "%"));
  }

  /* ----------------------------------------------------------- AI */
  function renderAi(mount) {
    mount.innerHTML = DEMO.aiVisibility.sources.map(s => `
      <div class="aisource">
        <span class="ailogo">${s.short}</span>
        <span class="aisource__body">
          <b>${s.name}</b>
          <span>${s.note}</span>
        </span>
        <span class="aimeter">
          <span class="aimeter__track"><span class="aimeter__fill" data-w="${s.rate}"></span></span>
          <b class="aimeter__val">${s.rate}%</b>
        </span>
      </div>`).join("");
    requestAnimationFrame(() =>
      $$(".aimeter__fill", mount).forEach(f => f.style.width = f.dataset.w + "%"));
  }

  /* -------------------------------------------------------- feed etc */
  function renderFeed(mount) {
    mount.innerHTML = DEMO.activity.map(a => `
      <div class="feeditem">
        <span class="feedicon feedicon--${a.type === "done" ? "done" : "live"}">
          <svg><use href="#i-${a.type === "done" ? "check" : "clock"}"></use></svg>
        </span>
        <span class="feedbody">
          <b>${a.title}</b>
          <span>${a.meta}</span>
        </span>
        <span class="feedtime">${a.time}</span>
      </div>`).join("");
  }

  function renderRecs(mount) {
    mount.innerHTML = DEMO.recommendations.map((r, i) => `
      <div class="rec">
        <span class="rec__num">${i + 1}</span>
        <span class="rec__body">
          <span class="rec__title">
            ${r.title}
            <span class="pill pill--${r.severity}">${r.severityLabel}</span>
          </span>
          <span class="rec__desc">${r.desc}</span>
          <span class="rec__meta">
            <span>Impact <b>${r.impact}</b></span>
            <span>Effort <b>${r.effort}</b></span>
            <span data-tip="This finding came from the ${r.source} audit module.">Module <b>${r.source}</b></span>
          </span>
        </span>
      </div>`).join("");
    bindTips(mount);
  }

  function renderModules(mount) {
    mount.innerHTML = DEMO.modules.map(m => `
      <div class="tool" data-toast="${m.name} — full report would open here.">
        <span class="toolicon"><svg><use href="#i-${m.icon}"></use></svg></span>
        <span class="tool__body">
          <b>${m.name}</b>
          <p>${m.desc}</p>
        </span>
      </div>`).join("");
  }

  function renderReports(mount) {
    mount.innerHTML = DEMO.reports.map(r => `
      <div class="report">
        <span class="reporticon">PDF</span>
        <span class="report__body">
          <b>${r.name} ${r.isNew ? '<span class="pill pill--good" style="margin-left:5px">New</span>' : ""}</b>
          <span>${r.date} · ${r.pages} pages · ${r.size}</span>
        </span>
        <button class="btn btn--ghost btn--sm" data-toast="${r.name} — download starting…">
          <svg><use href="#i-dl"></use></svg> Download
        </button>
      </div>`).join("");
  }

  function renderGbp() {
    const g = DEMO.gbp;

    renderKpis($("#gbpKpis"), [
      { id: "rating", label: "Average Rating", value: g.rating, decimals: 1, delta: 2.1, spark: [4.6,4.6,4.7,4.7,4.8,4.8,4.8,4.9,4.9,4.9,4.9,4.9,4.9,4.9], icon: "star", source: "Google Business Profile", tip: "Your average Google review score. Above 4.7 is the threshold where rating stops being a conversion blocker." },
      { id: "revs", label: "Total Reviews", value: g.reviews, delta: 19.3, spark: [78,84,89,95,101,107,112,118,123,128,133,137,140,142], icon: "users", source: "Google Business Profile", tip: "Total published Google reviews. Volume matters as much as score — it is a direct local ranking factor." },
      { id: "resp", label: "Response Rate", value: g.responseRate, suffix: "%", delta: 11.2, spark: [62,66,70,74,78,81,84,87,89,91,93,94,95,96], icon: "check", source: "Google Business Profile", tip: "Share of reviews that received a reply. Google rewards responsive profiles, and replying to negatives recovers roughly a third of unhappy customers." },
      { id: "views", label: "Profile Views", value: g.views, format: "compact", delta: g.viewsDelta, spark: [9100,9800,10400,11200,12000,12800,13600,14300,15100,15900,16700,17400,17900,18400], icon: "eye", source: "Google Business Profile", tip: "How many times the business listing was shown on Google Search and Maps." }
    ]);

    $("#gbpActions").innerHTML = g.actions.map(a => `
      <div style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--grid)">
        <span style="flex:1;font-size:13.5px;font-weight:550;color:var(--text-primary)">${a.label}</span>
        <span style="font-size:19px;font-weight:680;letter-spacing:-.03em">${fmt(a.value)}</span>
        ${deltaHtml(a.delta, false, "")}
      </div>`).join("");

    const stars = Array.from({ length: 5 }, () => '<svg><use href="#i-star"></use></svg>').join("");
    $("#gbpReviews").innerHTML = `
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:20px">
        <div>
          <div style="font-size:42px;font-weight:700;letter-spacing:-.04em;line-height:1">${g.rating}</div>
          <span class="stars">${stars}</span>
          <p style="font-size:12px;color:var(--text-muted);margin-top:4px">${g.reviews} reviews</p>
        </div>
        <div style="flex:1;padding-left:18px;border-left:1px solid var(--border)">
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
            <b style="color:var(--text-primary)">+${g.reviewsDelta} new reviews</b> this period, with a
            <b style="color:var(--text-primary)">${g.responseRate}%</b> response rate.
          </p>
          <p style="font-size:12.5px;color:var(--text-muted);margin-top:9px;line-height:1.55">
            Your rating leads the market (4.9 vs 4.8 for the nearest competitor) but review volume trails by 145.
            Closing that gap is the single highest-leverage local ranking move available.
          </p>
        </div>
      </div>
      <div style="display:flex;gap:14px">
        <div style="flex:1;padding:13px;background:var(--surface-2);border-radius:var(--r-md)">
          <b style="display:block;font-size:19px;font-weight:680;letter-spacing:-.03em">${g.photosThisMonth}</b>
          <span style="font-size:11.5px;color:var(--text-muted)">Photos added</span>
        </div>
        <div style="flex:1;padding:13px;background:var(--surface-2);border-radius:var(--r-md)">
          <b style="display:block;font-size:19px;font-weight:680;letter-spacing:-.03em">${g.postsThisMonth}</b>
          <span style="font-size:11.5px;color:var(--text-muted)">GBP posts published</span>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------- table view */
  function buildTrafficTable() {
    const t = DEMO.traffic;
    $("#trafficTable").innerHTML = `
      <div class="tablewrap" style="margin-top:14px">
        <table class="data">
          <thead><tr><th>Period</th><th class="num">This period</th><th class="num">Previous</th><th class="num">Change</th></tr></thead>
          <tbody>${t.labels.map((l, i) => {
            const d = Math.round(((t.current[i] - t.previous[i]) / t.previous[i]) * 100);
            return `<tr><td>${l}</td><td class="num">${t.current[i]}</td><td class="num">${t.previous[i]}</td>
                    <td class="num"><span class="move move--${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : ""}${d}%</span></td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
  }

  /* =========================================================== CHARTS */
  function drawCharts() {
    const c1 = cssVar("--series-1"), muted = cssVar("--series-muted");

    window.Charts.lineChart($("#trafficChart"), {
      labels: DEMO.traffic.labels,
      ariaLabel: "Organic clicks, current period versus previous period",
      series: [
        { name: "This period",     values: DEMO.traffic.current,  color: c1, fill: true },
        { name: "Previous period", values: DEMO.traffic.previous, color: muted, dashed: true }
      ]
    });

    const comp = { labels: DEMO.competitors.labels, entities: compEntities() };
    window.Charts.groupedBars($("#compChart"), comp);
    window.Charts.groupedBars($("#compChart2"), comp);

    window.Charts.columns($("#blChart"), {
      labels: DEMO.backlinks.labels,
      values: DEMO.backlinks.referring,
      color: c1,
      unit: " referring domains",
      ariaLabel: "Referring domain growth by month"
    });
  }

  /* ====================================================== OBSERVER IN
     Entrance animation is a nice-to-have; being able to READ the dashboard is
     not. So every reveal is backed by a failsafe that unhides anything still
     pending, in case the observer never fires (print, screenshot, scripted
     capture, zero-height container, unsupported browser).                  */
  function reveal(node) {
    node.classList.add("is-in");
    const v = node.matches(".stat__value") ? node : $(".stat__value", node);
    if (v && !v.__counted) {
      v.__counted = true;
      countUp(v, parseFloat(v.dataset.to), +v.dataset.dec,
              v.dataset.compact === "true", v.dataset.suffix || "");
    }
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      reveal(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: .08, rootMargin: "0px 0px 280px 0px" });

  let failsafe;
  function observe(root = document) {
    $$(".anim-in", root).forEach(n => { if (!n.classList.contains("is-in")) io.observe(n); });
    clearTimeout(failsafe);
    failsafe = setTimeout(() => {
      $$(".anim-in:not(.is-in)").forEach(n => { reveal(n); io.unobserve(n); });
    }, 1800);
  }

  /* ============================================================== NAV */
  const TITLES = {
    overview:    ["Overview", "Last 3 months"],
    rankings:    ["Search Rankings", "34 tracked keywords"],
    local:       ["Local Map Grid", "49 sample points · 5 mi radius"],
    gbp:         ["Business Profile", "Google Business Profile performance"],
    ai:          ["AI Visibility", "120 tracked prompts · updated weekly"],
    competitors: ["Competitors", "3 tracked local competitors"],
    backlinks:   ["Backlinks", "91 referring domains"],
    actions:     ["Action Plan", "5 open items"],
    reports:     ["Reports", "5 documents available"]
  };

  function go(view) {
    $$(".nav__item").forEach(b => b.classList.toggle("is-active", b.dataset.view === view));
    $$(".view").forEach(s => s.classList.toggle("is-active", s.dataset.view === view));
    const [t, s] = TITLES[view] || ["Overview", ""];
    $("#viewTitle").textContent = t;
    $("#viewSub").textContent = `Americana Iron Works & Fence · ${s}`;
    $("#sidebar").classList.remove("is-open");
    $("#scrim").classList.remove("is-shown");
    window.scrollTo({ top: 0, behavior: "smooth" });
    observe();
    // Anything rendered inside a display:none section measured zero width, so
    // every chart and sparkline is rebuilt once the section is actually shown.
    requestAnimationFrame(() => { drawCharts(); redrawSparks(); });
  }

  function redrawSparks() {
    $$(".stat__spark").forEach(m => {
      if (m.__values && m.clientWidth) {
        window.Charts.sparkline(m, m.__values, { color: cssVar("--series-1") });
      }
    });
  }

  /* ============================================================ THEME */
  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    $("#themeIcon").innerHTML = `<use href="#i-${mode === "dark" ? "sun" : "moon"}"></use>`;
    try { localStorage.setItem("mk-theme", mode); } catch (e) { /* private mode */ }
    // Series tokens changed — every chart and the geo grid must be restepped.
    requestAnimationFrame(() => {
      drawCharts();
      renderGeo($("#geoGrid"));
      renderGeo($("#geoGrid2"));
      $$(".stat__spark").forEach(m => {
        if (m.__values) window.Charts.sparkline(m, m.__values, { color: cssVar("--series-1") });
      });
      renderCompLegend($("#compLegend"));
      renderCompLegend($("#compLegend2"));
      renderCompTable($("#compBody"));
    });
  }

  /* ============================================================= BOOT */
  function boot() {
    const u = DEMO.user;
    $("#userName").textContent = u.name;
    $("#menuName").textContent = u.name;
    $("#userRole").textContent = u.role;
    $("#menuRole").textContent = u.role;
    $("#menuEmail").textContent = u.email;
    $("#avatar").textContent = u.initials;
    $("#avatarLg").textContent = u.initials;

    /* client switcher */
    $("#clientList").innerHTML = DEMO.clients.map(c => `
      <div class="clientcard__item${c.active ? " is-active" : ""}" data-client="${c.id}">
        <i>${c.short}</i>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${c.name}</span>
        ${c.active ? '<svg style="width:13px;height:13px"><use href="#i-check"></use></svg>' : ""}
      </div>`).join("");

    /* date ranges */
    $("#rangeSeg").innerHTML = DEMO.ranges.map(r =>
      `<button data-range="${r.id}"${r.active ? ' class="is-active"' : ""}>${r.label}</button>`).join("");

    renderKpis($("#kpiGrid"), DEMO.kpis);
    renderKpis($("#rankKpis"), DEMO.kpis.slice(0, 4));
    renderKpis($("#blKpis"), [
      { id: "rd", label: "Referring Domains", value: 91, delta: 116.7, spark: DEMO.backlinks.referring, icon: "link", source: "Backlink audit", tip: "Unique websites linking to this site. Each distinct domain is a separate vote of confidence to Google." },
      { id: "tot", label: "Total Backlinks", value: DEMO.backlinks.total, delta: 84.9, spark: [128,151,174,203,228,256,281,318,318,318,318,318,318,318], icon: "link", source: "Backlink audit", tip: "Total individual links pointing at the site, across all referring domains." },
      { id: "da", label: "Domain Authority", value: DEMO.backlinks.da, delta: 33.3, spark: [18,18,19,19,20,21,21,22,22,23,23,24,24,24], icon: "shield", source: "Moz", tip: "A 0–100 prediction of how well the domain will rank. Moving from 18 to 24 is a meaningful jump at this size." },
      { id: "new", label: "New This Month", value: DEMO.backlinks.newThisMonth, delta: 44.4, spark: [4,5,6,6,7,8,9,9,10,11,12,12,13,13], icon: "up", source: "Backlink audit", tip: "Referring domains earned in the last 30 days, net of links lost." }
    ]);

    renderGeo($("#geoGrid"));
    renderGeo($("#geoGrid2"));

    $("#localStats").innerHTML = `
      <div class="stat"><div class="stat__top"><span class="stat__label">Average rank</span></div>
        <div class="stat__value">${DEMO.geoGrid.avgRank}</div>${deltaHtml(38.4, true)}</div>
      <div class="stat"><div class="stat__top"><span class="stat__label">Top-3 share</span></div>
        <div class="stat__value">${DEMO.geoGrid.top3Share}%</div>${deltaHtml(200, false)}</div>
      <div class="stat"><div class="stat__top"><span class="stat__label">Sample points</span></div>
        <div class="stat__value">49</div><span class="delta delta--flat">7×7 grid</span></div>
      <div class="stat"><div class="stat__top"><span class="stat__label">Best / worst</span></div>
        <div class="stat__value">1 / 17</div><span class="delta delta--flat">Centre vs NE corner</span></div>`;

    renderKeywords($("#kwBody"), DEMO.keywords, false);
    renderKeywords($("#kwBodyFull"), DEMO.keywords, true);
    renderCompLegend($("#compLegend"));
    renderCompLegend($("#compLegend2"));
    renderCompTable($("#compBody"));
    renderAi($("#aiBody"));
    renderAi($("#aiBodyFull"));
    renderFeed($("#feed"));
    renderRecs($("#recs"));
    renderModules($("#modules"));
    renderReports($("#reports"));
    renderGbp();
    buildTrafficTable();

    drawCharts();
    bindTips();
    observe();
    requestAnimationFrame(redrawSparks);

    requestAnimationFrame(() => { $("#healthFill").style.width = "78%"; });
    countUp($("#healthVal"), 78);
  }

  /* ============================================================ EVENTS */

  // login
  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const btn = $("#loginBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="btn__spinner"></span><span>Signing you in…</span>';
    setTimeout(() => {
      $("#login").hidden = true;
      $("#app").hidden = false;
      requestAnimationFrame(() => {
        $("#app").classList.add("is-ready");
        boot();
        setTimeout(() => toast("Signed in — data synced 14 minutes ago."), 700);
      });
    }, 900);
  });

  // logout
  $("#logoutBtn").addEventListener("click", () => {
    $("#profile").classList.remove("is-open");
    $("#app").classList.remove("is-ready");
    setTimeout(() => {
      $("#app").hidden = true;
      $("#login").hidden = false;
      const btn = $("#loginBtn");
      btn.disabled = false;
      btn.innerHTML = "<span>Sign in to dashboard</span>";
      toast("You have been signed out.");
    }, 380);
  });

  // profile menu
  $("#profileBtn").addEventListener("click", e => {
    e.stopPropagation();
    const p = $("#profile");
    p.classList.toggle("is-open");
    $("#profileBtn").setAttribute("aria-expanded", p.classList.contains("is-open"));
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#profile")) {
      $("#profile")?.classList.remove("is-open");
      $("#profileBtn")?.setAttribute("aria-expanded", "false");
    }
    if (!e.target.closest("#clientCard")) $("#clientCard")?.classList.remove("is-open");
  });

  // client switcher
  $("#clientCard").addEventListener("click", e => {
    const item = e.target.closest(".clientcard__item");
    if (item) {
      const c = DEMO.clients.find(x => x.id === item.dataset.client);
      if (c && !c.active) toast(`${c.name} — demo is scoped to Americana Fence.`);
      return;
    }
    $("#clientCard").classList.toggle("is-open");
  });

  // nav
  $("#nav").addEventListener("click", e => {
    const b = e.target.closest(".nav__item");
    if (b) go(b.dataset.view);
  });
  document.addEventListener("click", e => {
    const j = e.target.closest("[data-view-jump]");
    if (j) go(j.dataset.viewJump);
  });

  // date range
  $("#rangeSeg").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#rangeSeg button").forEach(x => x.classList.remove("is-active"));
    b.classList.add("is-active");
    toast(`Range set to ${b.textContent} — demo data is fixed.`);
  });

  // table view toggle
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-table-toggle]");
    if (!t) return;
    const target = $("#" + t.dataset.tableToggle);
    const shown = target.classList.toggle("is-shown");
    t.textContent = shown ? "Chart view" : "Table view";
  });

  // theme
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next);
  });

  // mobile sidebar
  $("#burger").addEventListener("click", () => {
    $("#sidebar").classList.add("is-open");
    $("#scrim").classList.add("is-shown");
  });
  $("#scrim").addEventListener("click", () => {
    $("#sidebar").classList.remove("is-open");
    $("#scrim").classList.remove("is-shown");
  });

  // keyboard
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $(".search input")?.focus();
    }
    if (e.key === "Escape") {
      $("#profile")?.classList.remove("is-open");
      $("#clientCard")?.classList.remove("is-open");
      Tip.hide();
    }
  });

  // redraw charts on resize (debounced)
  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if ($("#app").hidden) return;
      drawCharts();
      // Sparkline viewBoxes are measured in pixels, so they must be rebuilt
      // at the new width or they stretch.
      $$(".stat").forEach(tile => {
        const spark = $(".stat__spark", tile);
        if (spark && spark.__values) {
          window.Charts.sparkline(spark, spark.__values, { color: cssVar("--series-1") });
        }
      });
    }, 180);
  });

  /* restore theme */
  try {
    const saved = localStorage.getItem("mk-theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
      $("#themeIcon").innerHTML = `<use href="#i-${saved === "dark" ? "sun" : "moon"}"></use>`;
    }
  } catch (e) { /* private mode — stay on the light default */ }

  bindTips();
})();
