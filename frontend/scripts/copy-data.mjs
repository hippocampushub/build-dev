// After `vite build`: copy the backend's JSON data into dist/data and add a 404.html
// fallback so deep links work on static hosts (GitHub Pages and similar).
import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, sep } from "node:path";

const dataDir = resolve(process.env.HH_DATA_DIR ?? "../backend/data");
const dist = resolve("dist");

if (!existsSync(dataDir)) {
  console.error(`Data folder not found: ${dataDir} (set HH_DATA_DIR)`);
  process.exit(1);
}
cpSync(dataDir, resolve(dist, "data"), {
  recursive: true,
  // raw API responses and downloaded .mod files are not needed by the site
  filter: (src) => !src.includes(`${sep}raw`) && !src.includes(`${sep}files`) && !src.endsWith(".tmp"),
});
copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
// The site's pages (src/App.tsx) also get their own copy, so static hosts answer
// them with status 200 instead of serving 404.html with status 404
const PAGES = [
  "data", "data/morphology", "data/electrophysiology", "data/connection", "models", "about",
  "morphologies", "electrophysiology", "connections",
];
for (const page of PAGES) {
  mkdirSync(resolve(dist, page), { recursive: true });
  copyFileSync(resolve(dist, "index.html"), resolve(dist, page, "index.html"));
}
console.log(`Copied ${dataDir} -> dist/data`);
