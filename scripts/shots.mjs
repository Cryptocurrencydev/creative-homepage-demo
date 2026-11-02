// Quick visual check: full-page screenshots at phone + desktop.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:4173";
const out = process.argv[3] || ".";
const q = process.argv[4] || "";
const browser = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const [n, w, h, m] of [["m", 390, 844, true], ["d", 1440, 900, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: m ? 2 : 1, isMobile: m, hasTouch: m, reducedMotion: q.includes("rm") ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (x) => x.type() === "error" && errs.push(x.text()));
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(base + "/" + (q.includes("?") ? q.slice(q.indexOf("?")) : ""));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/hero-${n}.png` });
  // scroll through so scroll-triggered things fire
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += h / 2) { await page.mouse.wheel(0, h / 2); await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(120); }
  await page.waitForTimeout(1500);
  for (const sel of [".manifesto", ".flavors", ".kinetic", ".houses", ".footer"]) {
    await page.evaluate((s) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY + (s === ".flavors" ? 600 : 0)); }, sel);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${sel.slice(1)}-${n}.png` });
  }
  console.log(n, "errors:", errs, await page.evaluate(() => ({ tier: window.__wobl.tier?.(), live: document.querySelector(".hero").classList.contains("is-live") })));
  await ctx.close();
}
await browser.close();
