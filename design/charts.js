/* Urban District dashboard — tiny SVG chart library (no dependencies).
   Marks follow fixed specs: bars ≤24px with 4px rounded data-ends,
   2px lines with round caps, ≥8px end markers with a 2px surface ring,
   hairline solid gridlines, hover tooltips on every chart. */

const UD = (() => {
  const NS = "http://www.w3.org/2000/svg";

  const fmt = {
    num: (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 }),
    cur: (v) => "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 }),
    pct: (v) => Number(v).toFixed(1) + "%",
    compact(v, currency) {
      const a = Math.abs(v);
      let s;
      if (a >= 1e6) s = (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
      else if (a >= 1e3) s = (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
      else s = String(Math.round(v));
      return (currency ? "$" : "") + s;
    },
  };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceTicks(max, count = 4) {
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    return ticks;
  }

  function makeTooltip(root) {
    const t = document.createElement("div");
    t.className = "tooltip";
    root.appendChild(t);
    return t;
  }

  function showTip(tip, root, x, y, title, rows) {
    tip.innerHTML =
      `<div class="t-title">${title}</div>` +
      rows
        .map(
          (r) =>
            `<div class="t-row"><span class="swatch" style="background:${r.color}"></span>` +
            `<span class="t-name">${r.name}</span><span class="t-val">${r.value}</span></div>`
        )
        .join("");
    tip.style.display = "block";
    const rw = root.getBoundingClientRect(), tw = tip.getBoundingClientRect();
    let left = x + 14, top = y - tw.height - 10;
    if (left + tw.width > rw.width - 4) left = x - tw.width - 14;
    if (top < 4) top = y + 14;
    tip.style.left = Math.max(4, left) + "px";
    tip.style.top = Math.max(4, top) + "px";
  }

  /* Line chart with area wash, crosshair + tooltip.
     cfg: { labels:[], series:[{name,color,values:[]}], yFmt, height } */
  function lineChart(root, cfg) {
    const W = 720, H = cfg.height || 260, padL = 46, padR = 16, padT = 14, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    root.classList.add("chart");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, root);
    const max = Math.max(...cfg.series.flatMap((s) => s.values));
    const ticks = niceTicks(max);
    const yMax = ticks[ticks.length - 1];
    const X = (i) => padL + (i / (cfg.labels.length - 1)) * iw;
    const Y = (v) => padT + ih - (v / yMax) * ih;
    const yF = cfg.yFmt || ((v) => fmt.compact(v));

    for (const t of ticks) {
      el("line", { x1: padL, x2: W - padR, y1: Y(t), y2: Y(t),
        stroke: t === 0 ? "var(--baseline)" : "var(--grid)", "stroke-width": 1 }, svg);
      if (t > 0) el("text", { x: padL - 8, y: Y(t) + 3.5, "text-anchor": "end",
        "font-size": 11, fill: "var(--text-muted)", style: "font-variant-numeric:tabular-nums" }, svg).textContent = yF(t);
    }
    const step = Math.ceil(cfg.labels.length / 8);
    cfg.labels.forEach((lb, i) => {
      if (i % step) return;
      el("text", { x: X(i), y: H - 8, "text-anchor": "middle", "font-size": 11,
        fill: "var(--text-muted)" }, svg).textContent = lb;
    });

    cfg.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
      if (si === 0)
        el("polygon", { points: `${padL},${Y(0)} ${pts} ${X(s.values.length - 1)},${Y(0)}`,
          fill: s.color, opacity: 0.1 }, svg);
      el("polyline", { points: pts, fill: "none", stroke: s.color, "stroke-width": 2,
        "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const li = s.values.length - 1;
      el("circle", { cx: X(li), cy: Y(s.values[li]), r: 4.5, fill: s.color,
        stroke: "var(--surface-1)", "stroke-width": 2 }, svg);
    });
    // Direct label on the lead series endpoint only (selective labeling)
    const s0 = cfg.series[0], last = s0.values[s0.values.length - 1];
    el("text", { x: X(s0.values.length - 1) - 8, y: Y(last) - 10, "text-anchor": "end",
      "font-size": 11.5, "font-weight": 600, fill: "var(--text-primary)" }, svg)
      .textContent = yF(last);

    const tip = makeTooltip(root);
    const cross = el("line", { y1: padT, y2: padT + ih, stroke: "var(--baseline)",
      "stroke-width": 1, opacity: 0 }, svg);
    const hover = el("rect", { x: padL, y: padT, width: iw, height: ih, fill: "transparent" }, svg);
    hover.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(cfg.labels.length - 1,
        Math.round(((px - padL) / iw) * (cfg.labels.length - 1))));
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", 1);
      const rr = root.getBoundingClientRect();
      showTip(tip, root, e.clientX - rr.left, e.clientY - rr.top, cfg.labels[i],
        cfg.series.map((s) => ({ name: s.name, color: s.color, value: yF(s.values[i]) })));
    });
    hover.addEventListener("mouseleave", () => { tip.style.display = "none"; cross.setAttribute("opacity", 0); });
  }

  /* Bar chart (single, grouped, or stacked) with 2px surface gaps.
     cfg: { labels:[], series:[{name,color,values:[]}], stacked, yFmt, height } */
  function barChart(root, cfg) {
    const W = 720, H = cfg.height || 260, padL = 46, padR = 16, padT = 14, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    root.classList.add("chart");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, root);
    const totals = cfg.labels.map((_, i) =>
      cfg.stacked ? cfg.series.reduce((a, s) => a + s.values[i], 0)
                  : Math.max(...cfg.series.map((s) => s.values[i])));
    const ticks = niceTicks(Math.max(...totals));
    const yMax = ticks[ticks.length - 1];
    const Y = (v) => padT + ih - (v / yMax) * ih;
    const yF = cfg.yFmt || ((v) => fmt.compact(v));

    for (const t of ticks) {
      el("line", { x1: padL, x2: W - padR, y1: Y(t), y2: Y(t),
        stroke: t === 0 ? "var(--baseline)" : "var(--grid)", "stroke-width": 1 }, svg);
      if (t > 0) el("text", { x: padL - 8, y: Y(t) + 3.5, "text-anchor": "end",
        "font-size": 11, fill: "var(--text-muted)", style: "font-variant-numeric:tabular-nums" }, svg).textContent = yF(t);
    }

    const band = iw / cfg.labels.length;
    const nCols = cfg.stacked ? 1 : cfg.series.length;
    const bw = Math.min(24, (band * 0.6 - (nCols - 1) * 2) / nCols);
    const tip = makeTooltip(root);

    cfg.labels.forEach((lb, i) => {
      const cx = padL + band * (i + 0.5);
      el("text", { x: cx, y: H - 8, "text-anchor": "middle", "font-size": 11,
        fill: "var(--text-muted)" }, svg).textContent = lb;
      let acc = 0;
      cfg.series.forEach((s, si) => {
        const v = s.values[i];
        let x, y, h;
        if (cfg.stacked) {
          x = cx - bw / 2;
          const y0 = Y(acc), y1 = Y(acc + v);
          acc += v;
          y = y1; h = Math.max(0, y0 - y1 - (si < cfg.series.length - 1 ? 2 : 0)); // 2px surface gap
        } else {
          const group = nCols * bw + (nCols - 1) * 2;
          x = cx - group / 2 + si * (bw + 2);
          y = Y(v); h = Y(0) - y;
        }
        const isTop = cfg.stacked ? si === cfg.series.length - 1 : true;
        const r = isTop ? Math.min(4, bw / 2, h) : 0; // rounded data-end, square baseline
        const d = `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${y + h} Z`;
        const bar = el("path", { d, fill: s.color }, svg);
        bar.addEventListener("mousemove", (e) => {
          const rr = root.getBoundingClientRect();
          showTip(tip, root, e.clientX - rr.left, e.clientY - rr.top, lb,
            cfg.series.map((ss) => ({ name: ss.name, color: ss.color, value: yF(ss.values[i]) })));
        });
        bar.addEventListener("mouseleave", () => (tip.style.display = "none"));
      });
    });
  }

  /* Horizontal bars for category rankings.
     cfg: { rows:[{name,value,color}], vFmt, height } */
  function hBars(root, cfg) {
    const W = 720, rowH = 34, padL = 4, padR = 70;
    const H = cfg.rows.length * rowH + 8;
    root.classList.add("chart");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, root);
    const max = Math.max(...cfg.rows.map((r) => r.value));
    const vF = cfg.vFmt || ((v) => fmt.compact(v));
    const labW = 180, iw = W - labW - padL - padR;
    cfg.rows.forEach((r, i) => {
      const y = i * rowH + 8;
      el("text", { x: padL, y: y + 12, "font-size": 12.5, fill: "var(--text-secondary)" }, svg)
        .textContent = r.name;
      const w = Math.max(2, (r.value / max) * iw);
      const bh = 16, rr = 4;
      const d = `M${labW},${y} L${labW + w - rr},${y} Q${labW + w},${y} ${labW + w},${y + rr} L${labW + w},${y + bh - rr} Q${labW + w},${y + bh} ${labW + w - rr},${y + bh} L${labW},${y + bh} Z`;
      el("path", { d, fill: r.color }, svg);
      el("text", { x: labW + w + 8, y: y + 12.5, "font-size": 12, "font-weight": 600,
        fill: "var(--text-primary)", style: "font-variant-numeric:tabular-nums" }, svg)
        .textContent = vF(r.value);
    });
  }

  /* 12-point sparkline for stat tiles */
  function spark(root, values, color) {
    const W = 90, H = 28, p = 3;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, root);
    const min = Math.min(...values), max = Math.max(...values);
    const X = (i) => p + (i / (values.length - 1)) * (W - 2 * p);
    const Y = (v) => p + (1 - (v - min) / (max - min || 1)) * (H - 2 * p);
    el("polyline", { points: values.map((v, i) => `${X(i)},${Y(v)}`).join(" "),
      fill: "none", stroke: "var(--baseline)", "stroke-width": 1.5,
      "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    const li = values.length - 1;
    el("circle", { cx: X(li), cy: Y(values[li]), r: 3, fill: color || "var(--accent)",
      stroke: "var(--surface-1)", "stroke-width": 2 }, svg);
  }

  function legend(root, series) {
    root.classList.add("legend");
    root.innerHTML = series
      .map((s) => `<span class="key"><span class="swatch" style="background:${s.color}"></span>${s.name}</span>`)
      .join("");
  }

  function tile(root, { label, value, delta, vs, sparkValues, color, hero }) {
    root.classList.add("card", "tile");
    if (hero) root.classList.add("hero");
    const dir = delta == null ? null : delta >= 0 ? "up" : "down";
    root.innerHTML =
      `<div class="label">${label}</div><div class="value">${value}</div>` +
      `<div class="meta">` +
      (delta != null ? `<span class="delta ${dir}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%</span>` : "") +
      (vs ? `<span class="vs">vs ${vs}</span>` : "") +
      `<span class="spark"></span></div>`;
    if (sparkValues) spark(root.querySelector(".spark"), sparkValues, color);
  }

  return { fmt, lineChart, barChart, hBars, spark, legend, tile };
})();
