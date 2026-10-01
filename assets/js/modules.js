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

  /* ================================================== LOCAL DOMINATOR */
  const RANK_BANDS = [
    { key: "high", label: "High (top 3)", color: "--good" },
    { key: "med",  label: "Medium (4–10)", color: "--warning" },
    { key: "low",  label: "Low (11+)", color: "--critical" }
  ];

  let ldActive = 0;

  function renderLocalDominator() {
    const ld = DEMO.localDominator;
    $("#ldMeta").textContent = `${ld.business} · ${ld.address} · ${ld.captured}`;

    $("#ldPicker").innerHTML = ld.keywords.map((k, i) => `
      <button class="${i === ldActive ? "is-active" : ""}" data-ld="${i}">
        ${k.kw} <i>${k.avg}</i>
      </button>`).join("");

    paintLdMap();
    renderLdBars();
  }

  function paintLdMap() {
    const k = DEMO.localDominator.keywords[ldActive];
    const img = $("#ldImg");

    img.classList.remove("is-loaded");
    img.alt = `Local Dominator map for “${k.kw}” — average rank ${k.avg}`;
    img.onload = () => img.classList.add("is-loaded");
    img.src = `assets/img/local/${k.img}.webp`;

    $("#ldSide").innerHTML = `
      <div class="ldstat">
        <span class="ldstat__label">Average rank</span>
        <div class="ldstat__value">${k.avg}</div>
      </div>
      <div class="ldstat">
        <span class="ldstat__label">Coverage breakdown</span>
        <div class="ldbreak" style="margin-top:10px">
          ${RANK_BANDS.map(b => `
            <div class="ldbreak__row" data-tip="${b.label} — share of sample points in this band.">
              <span class="ldbreak__dot" style="background:var(${b.color})"></span>
              <span class="ldbreak__name">${b.label}</span>
              <span class="ldbreak__val">${k[b.key] ? k[b.key] + "%" : "—"}</span>
            </div>`).join("")}
        </div>
      </div>
      <div class="ldstat">
        <span class="ldstat__label">Competitors tracked</span>
        <div class="ldstat__value">${k.competitors}</div>
      </div>
      <div class="ldstat" data-tip="Total Approximate Reach Percentage — Local Dominator's single measure of how much of the map area this business realistically reaches.">
        <span class="ldstat__label">TARP score</span>
        <div class="ldstat__value">${DEMO.localDominator.tarp}</div>
      </div>`;

    window.__bindTips($("#ldSide"));
  }

  function renderLdBars() {
    const ks = [...DEMO.localDominator.keywords].sort((a, b) => a.avg - b.avg);
    const worst = Math.max(...ks.map(k => k.avg));
    const c1 = cssVar("--series-1"), demph = cssVar("--demph");

    $("#ldBars").innerHTML = ks.map((k, i) => `
      <div class="hbar" data-tip="<strong>${k.kw}</strong>Average rank ${k.avg} across ${k.competitors} tracked competitors.">
        <span class="hbar__name">${k.kw}</span>
        <span class="hbar__track">
          <span class="hbar__fill" data-w="${(k.avg / worst * 100).toFixed(1)}"
                style="background:${i === 0 ? c1 : demph}"></span>
        </span>
        <span class="hbar__val">${k.avg}</span>
      </div>`).join("");

    requestAnimationFrame(() =>
      $$("#ldBars .hbar__fill").forEach(f => f.style.width = f.dataset.w + "%"));
    window.__bindTips($("#ldBars"));
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

  /* ============================================================= EXPORT */
  window.Modules = {
    init(onRankingsChange) {
      initDateControls(onRankingsChange);

      $("#ldPicker").addEventListener("click", e => {
        const b = e.target.closest("[data-ld]");
        if (!b) return;
        ldActive = +b.dataset.ld;
        $$("#ldPicker button").forEach(x => x.classList.remove("is-active"));
        b.classList.add("is-active");
        paintLdMap();
      });
    },
    refreshRankings,
    renderLocalDominator,
    renderLdBars,
    renderGa4,
    state
  };
})();
