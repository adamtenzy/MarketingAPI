# Urban District — Marketing Dashboard

A customizable marketing dashboard for Urban District covering **Shopify, Google Ads,
Meta Ads, and Google Analytics 4**, pulling live data through the Supermetrics MCP
connection.

## How it's organized

```
design/
  tokens.css      ← the entire look lives here (colors, type, spacing, components)
  charts.js       ← tiny dependency-free SVG chart library (lines, bars, sparklines, tiles)
  partials/       ← shared page chrome (top bar / nav)
  pages/          ← page templates, one per dashboard section
  dist/           ← built, self-contained pages (open these in a browser)
scripts/
  build.js        ← inlines tokens + charts + chrome into each page
```

Build with:

```sh
node scripts/build.js
```

## Restyling

Every page is built from `design/tokens.css` — one file controls surfaces, ink,
chart series colors, radii, and type for all pages, in both light and dark mode.
Edit it (or ask Claude to), rebuild, and every page updates. The design is also
mirrored to a **Claude Design** project so pages can be reviewed and restyled at
claude.ai/design.

The chart palette is validated for colorblind safety and contrast (see the
`dataviz` procedure). If you swap in brand colors, keep the fixed series order
and re-validate.

## Phases

1. **Design (this repo state)** — pages render with clearly-labeled sample data
   so layout and style can be approved first.
2. **Live data** — each page's sample arrays are replaced by Supermetrics
   queries (`smQuery`) against the connected accounts:
   - Shopify `SHP` — Urban District
   - Google Ads `AW` — UD Canada `5242837388`, UD US `1824136649`
   - Meta Ads `FA` — Urban District Tiles `act_1626636065274894`, Adam Tenzy `act_1312158710772345`
   - Google Analytics 4 `GAWA` — requires one-time Supermetrics login
   The pages are then published to Supermetrics Studio, which re-queries on each
   view so a shared link always shows current numbers.
