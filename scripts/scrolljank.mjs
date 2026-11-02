// Touch-fling the whole page on a throttled "phone" and record, every frame:
// frame time, and whether the flavors panel stays glued to the top while it
// should be pinned (any drift = sections visibly sliding over each other).
//   node scripts/scrolljank.mjs <url> [cpuRate]
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:4173";
const rate = +(process.argv[3] || 4);
const b = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.addInitScript(() => {
  window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => __lt.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }))).observe({ type: "longtask", buffered: true });
});
const cdp = await ctx.newCDPSession(page);
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => window.__wobl?.heroReady, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate });
await page.evaluate(() => {
  window.__lt.length = 0;
  const sec = document.querySelector(".flavors"), pin = sec.querySelector(".flavors__pin");
  window.__s = []; let last = performance.now();
  const tick = (t) => {
    const sr = sec.getBoundingClientRect(), pr = pin.getBoundingClientRect();
    __s.push({ dt: t - last, y: scrollY, secTop: sr.top, secBot: sr.bottom, pinTop: pr.top, pinBot: pr.bottom, vh: innerHeight });
    last = t; if (!window.__stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const H = await page.evaluate(() => document.documentElement.scrollHeight);
// several real touch flings down the page (compositor-driven, like a finger)
for (let i = 0; i < 6; i++) {
  await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 600, yDistance: -Math.round(H / 6), speed: 2400, gestureSourceType: "touch", repeatCount: 1 });
}
await page.waitForTimeout(600);
const r = await page.evaluate(() => {
  window.__stop = true;
  const s = __s.slice(1);
  // pinned phase = the section is taller than the viewport and covers it
  const pinned = s.filter((f) => f.secTop < -2 && f.secBot > f.vh + 2);
  const drift = pinned.filter((f) => Math.abs(f.pinTop) > 2);
  const sorted = s.map((f) => f.dt).sort((a, b) => a - b);
  return {
    frames: s.length, avgFps: +(1000 / (s.reduce((a, f) => a + f.dt, 0) / s.length)).toFixed(1),
    p95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), worstMs: +sorted.at(-1).toFixed(1), over33ms: s.filter((f) => f.dt > 33.4).length,
    pinnedFrames: pinned.length, pinDriftFrames: drift.length, maxDriftPx: Math.round(Math.max(0, ...drift.map((f) => Math.abs(f.pinTop)))),
    longTasks: __lt,
  };
});
console.log(JSON.stringify({ base, cpu: rate + "x", ...r, errors }, null, 1));
await b.close();
