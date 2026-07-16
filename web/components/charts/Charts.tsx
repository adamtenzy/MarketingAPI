"use client";

import { useEffect, useRef } from "react";
import * as UD from "@/lib/ud-charts";

/** Thin React wrappers over the imperative UD SVG chart library. */

export function Tile(props: UD.TileCfg) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.className = "";
    node.innerHTML = "";
    UD.tile(node, props);
    return () => { if (node) node.innerHTML = ""; };
  });
  return <div ref={ref} />;
}

export function Legend({ series }: { series: UD.Series[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = "";
    UD.legend(node, series);
  }, [series]);
  return <div ref={ref} />;
}

export function LineChart(cfg: UD.ChartCfg) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.className = "";
    node.innerHTML = "";
    UD.lineChart(node, cfg);
    return () => { if (node) node.innerHTML = ""; };
  });
  return <div ref={ref} />;
}

export function BarChart(cfg: UD.ChartCfg) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.className = "";
    node.innerHTML = "";
    UD.barChart(node, cfg);
    return () => { if (node) node.innerHTML = ""; };
  });
  return <div ref={ref} />;
}

export { fmt } from "@/lib/ud-charts";
