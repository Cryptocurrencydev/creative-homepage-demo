// perf/results.json -> perf/REPORT.md
import { readFileSync, writeFileSync } from "node:fs";
const { base, date, results, extra } = JSON.parse(readFileSync("perf/results.json", "utf8"));
const row = (r) => `| ${r.name} | ${r.paint.fcp} | ${r.paint.lcp} | ${r.paint.cls} | ${r.paint.tbt} | ${r.nav.load} | ${r.heroReadyMs ?? "poster only"} | ${r.bytes.initialKB} | ${r.bytes.afterLoadKB} | ${r.fps.heroIdle.fps} | ${r.fps.scroll.fps} / p95 ${r.fps.scroll.p95ms}ms | ${r.hero.tier} @ dpr ${r.hero.dpr ?? "-"} | ${r.consoleErrors.length} |`;
let md = `# Performance report\n\nTarget: ${base}  \nRun: ${date}  \nHarness: \`node scripts/perf.mjs <url>\` (Playwright 1.49, Chromium new-headless, GPU via ANGLE/Metal on ${results[0].hero.gpu}).\n\n`;
md += `Throttled = Chrome DevTools "Slow 3G" (400 kbit/s, 2000 ms RTT) + 4x CPU slowdown, cache disabled. Mobile = 390x844 @2.625x, touch, Android UA.\n\n`;
md += `| Run | FCP ms | LCP ms | CLS | TBT ms | load ms | 3D ready ms | initial KB | streamed after load KB | hero FPS | scroll FPS | quality tier | console errors |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
md += results.map(row).join("\n") + "\n\n";
md += `## Initial transfer by type (KB, compressed on the wire)\n\n` + results.map((r) => `- **${r.name}**: ${JSON.stringify(r.bytes.initialByType)}; after load: ${JSON.stringify(r.bytes.afterLoadByType)}; three.js chunk requested: ${r.bytes.sceneChunkRequested}`).join("\n") + "\n\n";
md += `## Behaviour checks\n\n` + results.map((r) => `- **${r.name}**: hero paused when offscreen: ${r.after.heroRunningOffscreen === false ? "yes" : r.after.heroRunningOffscreen === null ? "n/a (no WebGL)" : "NO"}; pinned section: ${r.after.flavorsPinned}; smooth scroll (Lenis): ${r.after.lenis}; manifesto fully readable after scroll: ${r.after.manifestoMinOpacity === 1}; map pins: ${r.after.mapPins}; map card opened: ${r.mapCard}; footer credit: "${r.after.footerCredit}"`).join("\n") + "\n\n";
md += `## Adaptive quality (simulated GPU load) and tab visibility\n\n\`?simslow=<ms>\` adds <ms> of work per frame on the high tier, scaled by each tier's vertices x pixels, to force the FPS sampler to step down on a fast machine.\n\n`;
for (const [k, v] of Object.entries(extra)) md += `- **${k}**: ${JSON.stringify(v)}\n`;
md += `\n## Caveat\n\nGPU throttling can't be emulated: the 120 fps figures come from an M4 Pro GPU with 4x CPU throttling. On a mid-range Android phone the FPS sampler takes over and steps down from \`medium\` (128x90 segments, dpr 1.5) to \`low\` (dpr 1) or \`potato\` (dpr 0.75) when a 45-frame average drops under ~48 fps. Test on the client's actual phone before the pitch.\n`;
writeFileSync("perf/REPORT.md", md);
console.log(md);
