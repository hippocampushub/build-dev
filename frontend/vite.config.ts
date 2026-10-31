import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, normalize, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Folder written by the backend's fetch_all.py
const DATA_DIR = resolve(process.env.HH_DATA_DIR ?? "../backend/data");
// Public path the site is deployed under, e.g. "/build/"
const BASE = process.env.HH_BASE ?? "/";
// VITE_STAGING=1 marks a test deployment: "test version" banner and no search-engine indexing
const STAGING = Boolean(process.env.VITE_STAGING);

/** In development, serve the backend's data folder at <base>data/ (copied into dist/ on build). */
function serveData(): Plugin {
  return {
    name: "hh-serve-data",
    configureServer(server) {
      server.middlewares.use(`${BASE}data`, (req, res, next) => {
        const path = normalize(resolve(DATA_DIR, "." + decodeURIComponent((req.url ?? "/").split("?")[0])));
        if (!path.startsWith(DATA_DIR + sep) || !existsSync(path) || !statSync(path).isFile()) return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        createReadStream(path).pipe(res);
      });
    },
  };
}

/** Keep test deployments out of search engines. */
function noIndex(): Plugin {
  return {
    name: "hh-noindex",
    transformIndexHtml: () => (STAGING ? [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" }, injectTo: "head" }] : []),
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), serveData(), noIndex()],
  server: { port: 5173, host: "127.0.0.1" },
});
