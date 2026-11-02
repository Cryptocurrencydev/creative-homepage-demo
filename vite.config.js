import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Inline the (small) CSS into the HTML so first paint needs one round trip
// instead of two. On Slow 3G (2s RTT) that is roughly 2s off FCP.
function inlineCss() {
  return {
    name: "inline-css",
    apply: "build",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      for (const f of readdirSync(dist).filter((n) => n.endsWith(".html"))) {
        const p = resolve(dist, f);
        let html = readFileSync(p, "utf8");
        html = html.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (_, href) =>
          `<style>${readFileSync(resolve(dist, "." + href), "utf8")}</style>`);
        // Mobile poster (~8 KB AVIF) goes inline: LCP no longer waits for a round trip.
        if (f === "index.html") {
          const avif = readFileSync(resolve(dist, "poster/blob-m.avif")).toString("base64");
          html = html
            .replace(/<link rel="preload" as="image" href="\/poster\/blob-m\.avif"[^>]*>\s*/, "")
            .replace('srcset="/poster/blob-m.avif"', `srcset="data:image/avif;base64,${avif}"`);
        }
        writeFileSync(p, html);
      }
    },
  };
}

export default defineConfig({
  plugins: [inlineCss()],
  build: {
    target: "es2020",
    modulePreload: { polyfill: false },
    cssCodeSplit: false, // one inlined stylesheet; lazy chunks never re-request CSS
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), kit: resolve(__dirname, "kit.html") } },
  },
});
