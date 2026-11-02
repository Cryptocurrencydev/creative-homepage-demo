// Performance harness.
//   node scripts/perf.mjs <baseUrl> [outJson]
// Runs: {mobile 390px, desktop 1440px} x {CPU 4x + Slow 3G}, plus a
// reduced-motion pass. Records paint metrics, bytes before/after the 3D
// streams in, FPS idle + scrolling, pause-offscreen, and console errors.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const outFile = process.argv[3] || "perf/results.json";

// Chrome DevTools "Slow 3G" preset: 400 kbit/s down/up, 2000 ms RTT
const SLOW_3G = { offline: false, latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 };
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const DEVICES = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: ANDROID_UA },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const INIT = () => {
  window.__perf = { fcp: 0, lcp: 0, lcpEl: "", cls: 0, longTasks: [], tbt: 0 };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === "first-contentful-paint") __perf.fcp = e.startTime; })).observe({ type: "paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { __perf.lcp = e.startTime; __perf.lcpEl = (e.element?.tagName || "") + "." + (e.element?.className || ""); })).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) __perf.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { __perf.longTasks.push(Math.round(e.duration)); __perf.tbt += Math.max(0, e.duration - 50); })).observe({ type: "longtask", buffered: true });
  // generic frame meter, independent of the hero's own sampler
  window.__meter = (ms) => new Promise((res) => {
    const f = []; let last = performance.now(); const end = last + ms;
    const tick = (t) => { f.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else {
      const s = [...f].sort((a, b) => a - b); const avg = f.reduce((a, b) => a + b, 0) / f.length;
      res({ fps: +(1000 / avg).toFixed(1), frames: f.length, p95ms: +s[Math.floor(s.length * 0.95)].toFixed(1), worstMs: +s[s.length - 1].toFixed(1), janky: f.filter((x) => x > 33.4).length });
    } };
    requestAnimationFrame(tick);
  });
};

async function run(browser, name, dev, { throttle = true, reduced = false } = {}) {
  const ctx = await browser.newContext({ ...dev, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  await page.addInitScript(INIT);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (throttle) {
    await cdp.send("Network.emulateNetworkConditions", SLOW_3G);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const reqs = new Map(); const done = [];
  const t0 = Date.now();
  cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, start: Date.now() - t0 }));
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) done.push({ ...r, end: Date.now() - t0, bytes: e.encodedDataLength }); });

  await page.goto(base + "/", { waitUntil: "load", timeout: 180000 });
  const loadAt = Date.now() - t0;
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd }; });

  let heroReadyMs = null;
  if (!reduced) {
    try {
      await page.waitForFunction(() => window.__wobl?.heroReady, null, { timeout: 120000, polling: 250 });
      heroReadyMs = await page.evaluate(() => Math.round(window.__wobl.heroReady));
    } catch { heroReadyMs = "timeout"; }
  }
  await page.waitForTimeout(2500);
  const paint = await page.evaluate(() => ({ fcp: Math.round(__perf.fcp), lcp: Math.round(__perf.lcp), lcpEl: __perf.lcpEl, cls: +__perf.cls.toFixed(4), tbt: Math.round(__perf.tbt), longTasks: __perf.longTasks.length }));

  // idle hero FPS, with the pointer/finger interacting on the blob
  const vw = dev.viewport.width, vh = dev.viewport.height;
  const idleP = page.evaluate(() => __meter(3000));
  if (!dev.isMobile) for (let i = 0; i < 30; i++) { await page.mouse.move(vw / 2 + Math.cos(i / 3) * 140, vh * 0.42 + Math.sin(i / 3) * 120); await page.waitForTimeout(90); }
  else { await page.waitForTimeout(400); await page.touchscreen.tap(vw / 2, vh * 0.42); }
  const idle = await idleP;
  const hero = await page.evaluate(() => ({ tier: window.__wobl?.tier?.() ?? "n/a (poster)", tierHistory: window.__wobl?.tierHistory ?? [], dpr: window.__wobl?.dpr?.() ?? null, sampledFps: window.__wobl?.sampledFps ?? null, gpu: window.__wobl?.gpu ?? null, webgl: !!document.querySelector(".hero__canvas"), live: document.querySelector(".hero").classList.contains("is-live") }));

  // scroll the whole page while measuring
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const scrollP = page.evaluate(() => __meter(7000));
  const steps = 70;
  for (let i = 0; i < steps; i++) {
    if (dev.isMobile) await page.evaluate((y) => scrollBy(0, y), H / steps);
    else await page.mouse.wheel(0, H / steps);
    await page.waitForTimeout(95);
  }
  const scroll = await scrollP;
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    heroRunningOffscreen: window.__wobl?.running?.() ?? null,
    flavorsPinned: document.querySelector(".flavors").classList.contains("is-pinned"),
    lenis: document.documentElement.classList.contains("lenis"),
    mapPins: document.querySelectorAll(".pin").length,
    manifestoMinOpacity: Math.min(...[...document.querySelectorAll("[data-scrub] .k-split__inner")].map((e) => +getComputedStyle(e).opacity)),
    footerCredit: document.querySelector(".footer__credit")?.textContent,
  }));

  // map interaction: tap/click first pin, expect a card
  await page.evaluate(() => document.querySelector("[data-map]").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2500);
  const pt = await page.evaluate(() => {
    const vp = document.querySelector("[data-map-viewport]").getBoundingClientRect();
    for (const p of document.querySelectorAll(".pin")) {
      const r = p.querySelector(".pin__drop").getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x > vp.left + 20 && x < vp.right - 70 && y > vp.top + 20 && y < vp.bottom - 20) return { x, y };
    }
    return null;
  });
  if (pt) { if (dev.isMobile) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y); }
  await page.waitForTimeout(900);
  const mapCard = await page.evaluate(() => { const c = document.querySelector("[data-map-card]"); return !c.hidden && c.querySelector("h3")?.textContent; });

  const loadEnd = loadAt;
  const sum = (arr) => arr.reduce((a, r) => a + r.bytes, 0);
  const initial = done.filter((r) => r.end <= loadEnd && !r.url.startsWith("data:"));
  const later = done.filter((r) => r.end > loadEnd && !r.url.startsWith("data:"));
  const byType = (list) => {
    const o = {};
    list.forEach((r) => { const ext = (r.url.split("?")[0].match(/\.(\w+)$/) || [, "html"])[1]; o[ext] = (o[ext] || 0) + r.bytes; });
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / 1024).toFixed(1)]));
  };
  const result = {
    name, throttle: throttle ? "CPU 4x + Slow 3G (400kbps, 2000ms RTT)" : "none", reducedMotion: reduced,
    nav: Object.fromEntries(Object.entries(nav).map(([k, v]) => [k, Math.round(v)])), paint, heroReadyMs, hero,
    fps: { heroIdle: idle, scroll },
    after, mapCard,
    bytes: {
      initialKB: +(sum(initial) / 1024).toFixed(1), initialByType: byType(initial), initialRequests: initial.length,
      afterLoadKB: +(sum(later) / 1024).toFixed(1), afterLoadByType: byType(later),
      sceneChunkRequested: done.some((r) => /scene-.*\.js/.test(r.url)),
    },
    consoleErrors: errors,
  };
  await ctx.close();
  return result;
}

const browser = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = [];
for (const [n, d] of Object.entries(DEVICES)) {
  console.error("running", n, "throttled");
  results.push(await run(browser, `${n} · throttled`, d, { throttle: true }));
  console.error("running", n, "unthrottled");
  results.push(await run(browser, `${n} · unthrottled`, d, { throttle: false }));
}
console.error("running mobile reduced-motion throttled");
results.push(await run(browser, "mobile · reduced motion · throttled", DEVICES.mobile, { throttle: true, reduced: true }));
// ---- adaptive quality + visibility pause (functional checks) -------------------
const extra = {};
for (const [label, ms, dev] of [["desktop simslow=40", 40, DEVICES.desktop], ["desktop simslow=120", 120, DEVICES.desktop], ["mobile simslow=60", 60, DEVICES.mobile]]) {
  const ctx = await browser.newContext(dev);
  const page = await ctx.newPage();
  await page.addInitScript(INIT);
  await page.goto(`${base}/?simslow=${ms}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__wobl?.heroReady, null, { timeout: 60000 });
  await page.waitForTimeout(9000);
  const m = await page.evaluate(() => __meter(2000));
  extra[label] = { tierHistory: await page.evaluate(() => window.__wobl.tierHistory), settledFps: m.fps, dpr: await page.evaluate(() => window.__wobl.dpr()) };
  await ctx.close();
}
{
  const ctx = await browser.newContext(DEVICES.desktop);
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForFunction(() => window.__wobl?.heroReady, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  extra.visibility = await page.evaluate(async () => {
    const before = window.__wobl.running();
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
    const hidden = window.__wobl.running();
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 100));
    return { runningVisible: before, runningWhenHidden: hidden, runningAfterReturn: window.__wobl.running() };
  });
  await ctx.close();
}
console.log("\n## adaptive + visibility", JSON.stringify(extra, null, 1));
await browser.close();
mkdirSync("perf", { recursive: true });
writeFileSync(outFile, JSON.stringify({ base, date: new Date().toISOString(), results, extra }, null, 2));
for (const r of results) {
  console.log(`\n## ${r.name}`);
  console.log(`FCP ${r.paint.fcp}ms · LCP ${r.paint.lcp}ms (${r.paint.lcpEl}) · CLS ${r.paint.cls} · TBT ${r.paint.tbt}ms · load ${r.nav.load}ms · 3D ready ${r.heroReadyMs}ms`);
  console.log(`bytes initial ${r.bytes.initialKB}KB ${JSON.stringify(r.bytes.initialByType)} · after load ${r.bytes.afterLoadKB}KB ${JSON.stringify(r.bytes.afterLoadByType)} · scene chunk: ${r.bytes.sceneChunkRequested}`);
  console.log(`hero: ${JSON.stringify(r.hero)}`);
  console.log(`fps idle ${JSON.stringify(r.fps.heroIdle)} · scroll ${JSON.stringify(r.fps.scroll)}`);
  console.log(`after: ${JSON.stringify(r.after)} · map card: ${r.mapCard}`);
  console.log(`console errors: ${JSON.stringify(r.consoleErrors)}`);
}
