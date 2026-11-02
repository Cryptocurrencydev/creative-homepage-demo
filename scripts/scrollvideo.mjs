// Record what is actually composited during a touch fling (CPU throttled).
//   node scripts/scrollvideo.mjs <url> <outDir> [startSelector]
import { chromium } from "playwright";
const [base, out, sel = ".manifesto"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: out, size: { width: 390, height: 844 } } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => window.__wobl?.heroReady, null, { timeout: 60000 });
await page.evaluate((s) => scrollTo(0, document.querySelector(s).offsetTop), sel);
await page.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
for (let i = 0; i < 4; i++) await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 700, yDistance: -900, speed: 3000, gestureSourceType: "touch" });
await page.waitForTimeout(500);
await ctx.close(); await b.close();
