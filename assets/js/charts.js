/* ==========================================================================
   CHARTS  —  dependency-free SVG renderers
   --------------------------------------------------------------------------
   Built to the data-viz method:
     · thin marks (2px lines, >=8px markers)
     · 4px rounded data-ends anchored to the baseline on bars
     · 2px surface gap between adjacent bars
     · recessive grid + axes, text in ink tokens (never the series color)
     · ONE axis — comparisons share a unit; no dual-scale charts anywhere
     · hover layer by default (crosshair + tooltip on lines, per-mark on bars)
     · legend present for >=2 series, with direct labels
   ========================================================================== */

const NS = "http://www.w3.org/2000/svg";

/* ------------------------------------------------------------------ utils */
function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function niceCeil(n) {
  if (n <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function fmt(n, compact) {
  if (n == null) return "—";
  if (compact && Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (compact && Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("en-US");
}

/* Rounded-top bar path: flat baseline, 4px rounded data-end. */
function barPath(x, y, w, h, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/* Catmull-Rom → cubic bezier, for a gently smoothed trend line. */
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ====================================================================== */
/*  SPARKLINE — tiny trend inside a stat tile. No axes, no legend.         */
/* ====================================================================== */
function sparkline(mount, values, opts = {}) {
  // Size the viewBox to the measured box so 1 SVG unit == 1 CSS pixel. A fixed
  // viewBox would either letterbox (default preserveAspectRatio) or stretch the
  // stroke and turn the terminal dot into an ellipse.
  const w = opts.w || Math.round(mount.clientWidth) || 220;
  const h = opts.h || Math.round(mount.clientHeight) || 38;
  const pad = 3;
  const color = opts.color || "var(--series-1)";
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;

  const svg = el("svg", {
    viewBox: `0 0 ${w} ${h}`, width: "100%", height: "100%",
    preserveAspectRatio: "none", class: "chart", "aria-hidden": "true"
  });
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / span) * (h - pad * 2)
  ]);

  const gid = "sg" + Math.random().toString(36).slice(2, 8);
  const defs = el("defs");
  const grad = el("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.append(
    el("stop", { offset: "0%",   "stop-color": color, "stop-opacity": ".26" }),
    el("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" })
  );
  defs.append(grad);
  svg.append(defs);

  const line = smoothPath(pts);
  svg.append(el("path", { d: `${line} L${pts.at(-1)[0]},${h} L${pts[0][0]},${h} Z`, fill: `url(#${gid})`, class: "area" }));

  const stroke = el("path", { d: line, class: "line line--draw", stroke: color });
  svg.append(stroke);

  // Terminal dot — marks "where it stands now".
  svg.append(el("circle", { cx: pts.at(-1)[0], cy: pts.at(-1)[1], r: 2.6, fill: color, class: "dot" }));

  mount.innerHTML = "";
  mount.append(svg);
  requestAnimationFrame(() => {
    try { stroke.style.setProperty("--len", stroke.getTotalLength()); } catch (e) { /* no-op */ }
  });
}

/* ====================================================================== */
/*  LINE CHART — trend over time.                                          */
/*  Current vs previous period: same unit, ONE axis.                       */
/* ====================================================================== */
function lineChart(mount, cfg) {
  // Size the viewBox to the measured container so 1 SVG unit == 1 CSS pixel.
  // A fixed viewBox stretched with preserveAspectRatio="none" scales the axis
  // TEXT along with the geometry, which is what makes charts look pixellated
  // and oversized on a wide screen.
  const W = Math.round(mount.clientWidth) || 760;
  const H = cfg.height || 268;
  const m = { t: 16, r: 18, b: 32, l: 46 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;

  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`, width: "100%", height: H,
    class: "chart", role: "img", "aria-label": cfg.ariaLabel || "Trend chart"
  });
  svg.style.height = H + "px";

  const all = cfg.series.flatMap(s => s.values);
  const yMax = niceCeil(Math.max(...all) * 1.12);
  const x = i => m.l + (i / (cfg.labels.length - 1)) * iw;
  const y = v => m.t + ih - (v / yMax) * ih;

  /* grid + y axis — recessive */
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax / ticks) * i;
    const yy = y(v);
    svg.append(el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "grid-line" }));
    const t = el("text", { x: m.l - 9, y: yy + 3.5, class: "axis-text", "text-anchor": "end" });
    t.textContent = fmt(Math.round(v), true);
    svg.append(t);
  }

  /* x labels — thinned so they never collide */
  const every = Math.ceil(cfg.labels.length / 7);
  cfg.labels.forEach((lab, i) => {
    if (i % every !== 0 && i !== cfg.labels.length - 1) return;
    const t = el("text", { x: x(i), y: H - 10, class: "axis-text", "text-anchor": "middle" });
    t.textContent = lab;
    svg.append(t);
  });

  /* series */
  const strokes = [];
  cfg.series.forEach(s => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const d = smoothPath(pts);

    if (s.fill) {
      const gid = "lg" + Math.random().toString(36).slice(2, 8);
      const defs = el("defs");
      const grad = el("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" });
      grad.append(
        el("stop", { offset: "0%",   "stop-color": s.color, "stop-opacity": ".22" }),
        el("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": "0" })
      );
      defs.append(grad); svg.append(defs);
      svg.append(el("path", {
        d: `${d} L${pts.at(-1)[0]},${m.t + ih} L${pts[0][0]},${m.t + ih} Z`,
        fill: `url(#${gid})`, class: "area"
      }));
    }

    const p = el("path", {
      d, class: "line line--draw", stroke: s.color,
      "stroke-dasharray": s.dashed ? "5 4" : null
    });
    if (s.dashed) { p.classList.remove("line--draw"); p.setAttribute("stroke-dasharray", "5 4"); p.setAttribute("opacity", ".85"); }
    svg.append(p);
    strokes.push(p);
  });

  /* hover layer: crosshair + tooltip */
  const chair = el("line", { class: "crosshair", y1: m.t, y2: m.t + ih, opacity: "0" });
  svg.append(chair);
  const markers = cfg.series.map(s =>
    el("circle", { r: 4.5, fill: s.color, class: "dot", opacity: "0" })
  );
  markers.forEach(mk => svg.append(mk));

  const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", style: "cursor:crosshair" });
  svg.append(hit);

  hit.addEventListener("mousemove", ev => {
    const box = svg.getBoundingClientRect();
    const px = ((ev.clientX - box.left) / box.width) * W;
    let i = Math.round(((px - m.l) / iw) * (cfg.labels.length - 1));
    i = Math.max(0, Math.min(cfg.labels.length - 1, i));

    chair.setAttribute("x1", x(i));
    chair.setAttribute("x2", x(i));
    chair.setAttribute("opacity", "1");
    markers.forEach((mk, si) => {
      mk.setAttribute("cx", x(i));
      mk.setAttribute("cy", y(cfg.series[si].values[i]));
      mk.setAttribute("opacity", "1");
    });

    const rows = cfg.series.map(s =>
      `<span style="display:flex;gap:7px;align-items:center;justify-content:space-between;gap:14px">
         <span style="display:flex;gap:6px;align-items:center">
           <i style="width:8px;height:8px;border-radius:2px;background:${s.color};display:inline-block"></i>${s.name}
         </span><b>${fmt(s.values[i])}${cfg.unit || ""}</b>
       </span>`).join("");
    window.__tip.show(ev.clientX, ev.clientY, `<strong>${cfg.labels[i]}</strong>${rows}`);
  });

  hit.addEventListener("mouseleave", () => {
    chair.setAttribute("opacity", "0");
    markers.forEach(mk => mk.setAttribute("opacity", "0"));
    window.__tip.hide();
  });

  mount.innerHTML = "";
  mount.append(svg);
  requestAnimationFrame(() => {
    strokes.forEach(p => { try { p.style.setProperty("--len", p.getTotalLength()); } catch (e) {} });
  });
}

/* ====================================================================== */
/*  GROUPED BAR — tell distinct entities apart across shared measures.     */
/*  Adjacent pairlist; 2px surface gap between bars; direct-labelled.      */
/* ====================================================================== */
function groupedBars(mount, cfg) {
  const W = Math.round(mount.clientWidth) || 760;
  const H = cfg.height || 300;
  const m = { t: 14, r: 14, b: 54, l: 40 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;

  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`, width: "100%", height: H,
    class: "chart", role: "img", "aria-label": cfg.ariaLabel || "Grouped comparison"
  });
  svg.style.height = H + "px";

  const yMax = 100;
  const y = v => m.t + ih - (v / yMax) * ih;

  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i, yy = y(v);
    svg.append(el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "grid-line" }));
    const t = el("text", { x: m.l - 9, y: yy + 3.5, class: "axis-text", "text-anchor": "end" });
    t.textContent = v;
    svg.append(t);
  }

  const groups = cfg.labels.length;
  const gw = iw / groups;
  const n = cfg.entities.length;
  const GAP = 2;                                  // 2px surface gap
  const bw = Math.max(6, Math.min(44, (gw * 0.68 - GAP * (n - 1)) / n));

  cfg.labels.forEach((lab, gi) => {
    const gx = m.l + gi * gw + (gw - (bw * n + GAP * (n - 1))) / 2;

    cfg.entities.forEach((ent, ei) => {
      const v = ent.scores[gi];
      const bx = gx + ei * (bw + GAP);
      const by = y(v);
      const bh = m.t + ih - by;

      const bar = el("path", {
        d: barPath(bx, by, bw, bh),
        fill: ent.color,
        class: "bar",
        style: `animation-delay:${gi * 70 + ei * 35}ms`
      });
      bar.addEventListener("mouseenter", ev =>
        window.__tip.show(ev.clientX, ev.clientY,
          `<strong>${ent.name}</strong>${lab.replace(/\n/g, " ")}: <b>${v}/100</b>`));
      bar.addEventListener("mousemove", ev => window.__tip.move(ev.clientX, ev.clientY));
      bar.addEventListener("mouseleave", () => window.__tip.hide());
      svg.append(bar);

      /* Direct label on the client's bars — identity is never color-alone. */
      if (ent.isClient) {
        const t = el("text", {
          x: bx + bw / 2, y: by - 6,
          class: "axis-text", "text-anchor": "middle",
          style: "font-weight:700"
        });
        t.textContent = v;
        svg.append(t);
      }
    });

    /* x label (supports a \n for two-line captions) */
    const lines = lab.split("\n");
    lines.forEach((ln, li) => {
      const t = el("text", {
        x: m.l + gi * gw + gw / 2,
        y: H - 34 + li * 12,
        class: "axis-text", "text-anchor": "middle"
      });
      t.textContent = ln;
      svg.append(t);
    });
  });

  mount.innerHTML = "";
  mount.append(svg);
}

/* ====================================================================== */
/*  COLUMN CHART — single-series magnitude over time (sequential hue).     */
/* ====================================================================== */
function columns(mount, cfg) {
  const W = Math.round(mount.clientWidth) || 420;
  const H = cfg.height || 240;
  const m = { t: 18, r: 10, b: 28, l: 38 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;

  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`, width: "100%", height: H,
    class: "chart", role: "img", "aria-label": cfg.ariaLabel || "Column chart"
  });
  svg.style.height = H + "px";

  const yMax = niceCeil(Math.max(...cfg.values) * 1.15);
  const y = v => m.t + ih - (v / yMax) * ih;

  // 4 divisions, so a "nice" max always yields whole-number ticks
  // (3 divisions turns 200 into 0 / 66.7 / 133.3 / 200).
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i, yy = y(v);
    svg.append(el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "grid-line" }));
    const t = el("text", { x: m.l - 7, y: yy + 3.5, class: "axis-text", "text-anchor": "end" });
    t.textContent = fmt(Math.round(v), true);
    svg.append(t);
  }

  // Cap the bar width — a 6-bar chart in a 1400px card would otherwise render
  // 230px-wide slabs. Narrower bars are also the correct mark spec.
  const GAP = 2;
  const slot = iw / cfg.values.length;
  const bw = Math.min(slot - GAP, 72);
  const lead = m.l + (slot - bw) / 2;

  cfg.values.forEach((v, i) => {
    const bx = lead + i * slot;
    const by = y(v);
    const bar = el("path", {
      d: barPath(bx, by, bw, m.t + ih - by),
      fill: cfg.color || "var(--series-1)",
      class: "bar",
      style: `animation-delay:${i * 70}ms`
    });
    bar.addEventListener("mouseenter", ev =>
      window.__tip.show(ev.clientX, ev.clientY, `<strong>${cfg.labels[i]}</strong>${cfg.unit || ""}: <b>${fmt(v)}</b>`));
    bar.addEventListener("mousemove", ev => window.__tip.move(ev.clientX, ev.clientY));
    bar.addEventListener("mouseleave", () => window.__tip.hide());
    svg.append(bar);

    const t = el("text", { x: bx + bw / 2, y: H - 9, class: "axis-text", "text-anchor": "middle" });
    t.textContent = cfg.labels[i];
    svg.append(t);
  });

  /* Direct-label the final value only — never a number on every bar. */
  const last = cfg.values.length - 1;
  const lt = el("text", {
    x: lead + last * slot + bw / 2,
    y: y(cfg.values[last]) - 7,
    class: "axis-text", "text-anchor": "middle",
    style: "font-weight:700"
  });
  lt.textContent = fmt(cfg.values[last]);
  svg.append(lt);

  mount.innerHTML = "";
  mount.append(svg);
}

window.Charts = { sparkline, lineChart, groupedBars, columns, fmt };
