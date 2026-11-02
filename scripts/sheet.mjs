// contact sheet helper: node scripts/sheet.mjs <dir>
import sharp from "sharp";
const dir = process.argv[2];
const names = ["manifesto", "flavors", "kinetic", "houses", "footer"];
const d = await Promise.all(names.map((n) => sharp(`${dir}/${n}-d.png`).resize(720, 450).toBuffer()));
await sharp({ create: { width: 1440, height: 1350, channels: 3, background: "#888" } }).composite(d.map((b, i) => ({ input: b, left: (i % 2) * 720, top: Math.floor(i / 2) * 450 }))).png().toFile(`${dir}/grid-d.png`);
const m = await Promise.all(names.map((n) => sharp(`${dir}/${n}-m.png`).resize(260, 563).toBuffer()));
await sharp({ create: { width: 1300, height: 563, channels: 3, background: "#888" } }).composite(m.map((b, i) => ({ input: b, left: i * 260, top: 0 }))).png().toFile(`${dir}/grid-m.png`);
