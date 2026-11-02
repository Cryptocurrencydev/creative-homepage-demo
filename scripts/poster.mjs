// Renders the real WebGL hero at mobile + desktop layouts, crops the blob,
// and writes transparent AVIF/WebP posters used for instant first paint.
import { chromium } from "playwright";
import sharp from "sharp";
const base = process.argv[2] || "http://localhost:4173";
const shots = [
  { name: "m", vw: 390, vh: 844, dpr: 2 },
  { name: "d", vw: 1440, vh: 900, dpr: 1.5 },
];
const browser = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.vw, height: s.vh }, deviceScaleFactor: s.dpr });
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  await page.goto(`${base}/?capture=1&t=2.4`);
  await page.waitForFunction(() => window.__captureReady === true, null, { timeout: 30000 });
  const { data, box } = await page.evaluate(() => {
    const c = document.querySelector(".hero__canvas");
    const st = document.querySelector("[data-hero-stage]").getBoundingClientRect();
    const p = document.querySelector("[data-hero-poster]").getBoundingClientRect();
    const k = c.width / st.width;
    return { data: c.toDataURL("image/png"), box: { left: (p.left - st.left) * k, top: (p.top - st.top) * k, size: p.width * k } };
  });
  const png = Buffer.from(data.split(",")[1], "base64");
  const meta = await sharp(png).metadata();
  const left = Math.max(0, Math.round(box.left)), top = Math.max(0, Math.round(box.top));
  const size = Math.min(Math.round(box.size), meta.width - left, meta.height - top);
  const out = Math.min(size, s.name === "m" ? 720 : 960);
  const img = sharp(png).extract({ left, top, width: size, height: size }).resize(out, out);
  await img.clone().webp({ quality: 78, alphaQuality: 80, effort: 6 }).toFile(`public/poster/blob-${s.name}.webp`);
  await img.clone().avif({ quality: 52, effort: 6 }).toFile(`public/poster/blob-${s.name}.avif`);
  console.log(s.name, { size, out, gpu: await page.evaluate(() => window.__wobl.gpu) });
  await page.close();
}
await browser.close();
