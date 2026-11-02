import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu"] });
const mk = (w, h) => b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
// 1) load directly in landscape
for (const [w, h] of [[844, 390], [740, 340]]) {
  const c = await mk(w, h); const p = await c.newPage();
  await p.goto((process.argv[3] || "https://creative-homepage-demo.vercel.app") + "/"); await p.waitForFunction(() => window.__wobl?.heroReady); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/land-${w}.png` });
  console.log(w, h, await p.evaluate(() => { const s = document.querySelector("[data-hero-stage]"), po = document.querySelector("[data-hero-poster]"); return { stageH: s.offsetHeight, posterW: po.offsetWidth, blobR: po.offsetWidth / 2.36, heroH: document.querySelector(".hero").offsetHeight }; }));
  await c.close();
}
// 2) load portrait, then rotate
const c = await mk(390, 844); const p = await c.newPage();
await p.goto((process.argv[3] || "https://creative-homepage-demo.vercel.app") + "/"); await p.waitForFunction(() => window.__wobl?.heroReady); await p.waitForTimeout(1200);
await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/rotated.png` });
await b.close();
