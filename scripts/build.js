#!/usr/bin/env node
/* Build self-contained dashboard pages: inlines design/tokens.css,
   design/charts.js, and the shared topbar into each page template,
   writing the result to design/dist/. Pages stay single-source:
   restyle in tokens.css, rebuild, and every page updates. */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = path.join(ROOT, "design", "pages");
const DIST = path.join(ROOT, "design", "dist");

const tokens = fs.readFileSync(path.join(ROOT, "design", "tokens.css"), "utf8");
const charts = fs.readFileSync(path.join(ROOT, "design", "charts.js"), "utf8");
const topbar = fs.readFileSync(path.join(ROOT, "design", "partials", "topbar.html"), "utf8");

fs.mkdirSync(DIST, { recursive: true });

for (const file of fs.readdirSync(PAGES).filter((f) => f.endsWith(".html"))) {
  let html = fs.readFileSync(path.join(PAGES, file), "utf8");

  html = html
    .replace("<!-- @inject:tokens -->", `<style>\n${tokens}\n</style>`)
    .replace("<!-- @inject:charts -->", `<script>\n${charts}\n</script>`)
    .replace(/<!-- @inject:topbar (\w[\w-]*) -->/, (_, active) =>
      topbar.replace(`data-page="${active}"`, `data-page="${active}" class="active"`)
    );

  fs.writeFileSync(path.join(DIST, file), html);
  console.log("built", path.join("design/dist", file));
}
