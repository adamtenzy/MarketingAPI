"use client";

import { Tile, LineChart, BarChart, Legend, fmt } from "@/components/charts/Charts";
import type { Series } from "@/lib/ud-charts";

// Sample data — mirrors design/dist/overview.html. Replaced by warehouse
// queries in Phase 2 (see docs/IMPLEMENTATION_PLAN.md).
const days = Array.from({ length: 30 }, (_, i) =>
  i + 17 <= 30 ? "Jun " + (i + 17) : "Jul " + (i - 13),
);
const revenue = [5.1, 5.6, 4.9, 6.2, 6.8, 7.4, 5.9, 5.4, 6.1, 6.6, 7.9, 8.3, 6.2, 5.8, 6.4, 6.9, 7.2, 8.8, 9.1, 6.6, 6.1, 6.8, 7.4, 7.8, 9.4, 9.9, 7.1, 6.8, 7.6, 8.2].map((v) => v * 1000);
const spend = revenue.map((v, i) => v * 0.24 + (i % 5) * 90);

const revSeries: Series[] = [
  { name: "Revenue", color: "var(--series-1)", values: revenue },
  { name: "Ad spend", color: "var(--series-2)", values: spend },
];
const spendSeries: Series[] = [
  { name: "Google Ads", color: "var(--series-1)", values: [6400, 6900, 7300, 7800] },
  { name: "Meta Ads", color: "var(--series-2)", values: [3600, 3900, 4200, 4500] },
];

const kpis = [
  { label: "Revenue", value: "$186.4K", delta: 12.4, vs: "prior 30d", sparkValues: [128, 132, 129, 138, 141, 139, 148, 152, 150, 161, 168, 186] },
  { label: "Orders", value: "1,284", delta: 8.1, vs: "prior 30d", sparkValues: [92, 95, 91, 99, 104, 101, 108, 112, 109, 117, 121, 128] },
  { label: "Blended ad spend", value: "$44.6K", delta: 4.3, vs: "prior 30d", sparkValues: [38, 39, 37, 40, 41, 40, 42, 41, 43, 43, 44, 44.6] },
  { label: "Blended ROAS", value: "4.18", delta: 7.7, vs: "prior 30d", sparkValues: [3.4, 3.5, 3.5, 3.6, 3.7, 3.6, 3.8, 3.9, 3.8, 4.0, 4.1, 4.18] },
  { label: "Sessions", value: "96.2K", delta: 9.8, vs: "prior 30d", sparkValues: [68, 70, 69, 74, 76, 75, 79, 82, 81, 86, 90, 96] },
];

const campaigns = [
  { name: "UD-US · PMax · Bestsellers", sw: "--series-1", platform: "Google Ads", spend: "$6,840", conv: 214, rev: "$34,120", roas: "4.99", health: "good", label: "Healthy" },
  { name: "Prospecting · Advantage+ Shopping", sw: "--series-2", platform: "Meta Ads", spend: "$5,210", conv: 168, rev: "$23,460", roas: "4.50", health: "good", label: "Healthy" },
  { name: "UD-CA · Search · Brand", sw: "--series-1", platform: "Google Ads", spend: "$1,930", conv: 142, rev: "$19,870", roas: "10.30", health: "good", label: "Healthy" },
  { name: "Retargeting · Catalog sales", sw: "--series-2", platform: "Meta Ads", spend: "$3,480", conv: 121, rev: "$15,240", roas: "4.38", health: "warn", label: "Fatiguing" },
  { name: "UD-US · Search · Zellige tile", sw: "--series-1", platform: "Google Ads", spend: "$2,610", conv: 87, rev: "$11,930", roas: "4.57", health: "good", label: "Healthy" },
  { name: "Prospecting · Reels · Spring lookbook", sw: "--series-2", platform: "Meta Ads", spend: "$2,940", conv: 54, rev: "$6,410", roas: "2.18", health: "crit", label: "Below target" },
];

export default function OverviewPage() {
  const yFmt = (v: number) => fmt.compact(v, true);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <div className="sub">All channels · Shopify, Google Ads, Meta Ads &amp; GA4 combined</div>
        </div>
        <div className="filters">
          <div className="chip-row">
            {["Today", "7D", "30D", "90D", "MTD"].map((c) => (
              <button key={c} className={c === "30D" ? "chip active" : "chip"}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid kpis">
        {kpis.map((k) => (
          <Tile key={k.label} {...k} color="var(--series-1)" />
        ))}
      </div>

      <div className="grid two">
        <section className="card">
          <div className="card-head">
            <div><h2>Revenue vs ad spend</h2><div className="card-sub">Last 30 days, daily</div></div>
            <div className="spacer" />
            <Legend series={revSeries} />
          </div>
          <LineChart labels={days} series={revSeries} yFmt={yFmt} />
        </section>
        <section className="card">
          <div className="card-head">
            <div><h2>Ad spend by channel</h2><div className="card-sub">Weekly totals</div></div>
            <div className="spacer" />
            <Legend series={spendSeries} />
          </div>
          <BarChart labels={["Wk 25", "Wk 26", "Wk 27", "Wk 28"]} series={spendSeries} stacked yFmt={yFmt} />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div><h2>Top campaigns</h2><div className="card-sub">By revenue, all platforms</div></div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Campaign</th><th>Platform</th><th className="num">Spend</th>
              <th className="num">Conversions</th><th className="num">Revenue</th>
              <th className="num">ROAS</th><th>Health</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name}>
                <td className="cell-key"><span className="swatch" style={{ background: `var(${c.sw})` }} />{c.name}</td>
                <td>{c.platform}</td>
                <td className="num">{c.spend}</td>
                <td className="num">{c.conv}</td>
                <td className="num">{c.rev}</td>
                <td className="num">{c.roas}</td>
                <td><span className={`pill ${c.health}`}><span className="dot" />{c.label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="foot">
        Design preview with sample data — live Shopify, Google Ads, Meta Ads &amp; GA4 data is wired in Phase 2.
      </div>
    </>
  );
}
