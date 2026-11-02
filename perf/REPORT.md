# Performance report

Target: https://creative-homepage-demo.vercel.app  
Run: 2026-11-02T22:19:18.996Z  
Harness: `node scripts/perf.mjs <url>` (Playwright 1.49, Chromium new-headless, GPU via ANGLE/Metal on ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)).

Throttled = Chrome DevTools "Slow 3G" (400 kbit/s, 2000 ms RTT) + 4x CPU slowdown, cache disabled. Mobile = 390x844 @2.625x, touch, Android UA.

| Run | FCP ms | LCP ms | CLS | TBT ms | load ms | 3D ready ms | initial KB | streamed after load KB | hero FPS | scroll FPS | quality tier | console errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mobile · throttled | 2919 | 3061 | 0.0034 | 229 | 6667 | 11283 | 105.7 | 126.1 | 119.9 | 119.1 / p95 9.2ms | medium @ dpr 1.5 | 0 |
| mobile · unthrottled | 963 | 963 | 0 | 0 | 1209 | 1545 | 105.7 | 126.1 | 120.2 | 120.1 / p95 9ms | medium @ dpr 1.5 | 0 |
| desktop · throttled | 2825 | 2825 | 0.004 | 150 | 6871 | 11468 | 121.3 | 126.1 | 119.4 | 119.4 / p95 9.1ms | high @ dpr 1 | 0 |
| desktop · unthrottled | 975 | 975 | 0.0001 | 0 | 1371 | 1630 | 121.3 | 126.1 | 119.7 | 119.9 / p95 8.8ms | high @ dpr 1 | 0 |
| mobile · reduced motion · throttled | 2770 | 2920 | 0.0034 | 2 | 6428 | poster only | 105.7 | 5.3 | 120.3 | 119.9 / p95 9.1ms | n/a (poster) @ dpr - | 0 |

## Initial transfer by type (KB, compressed on the wire)

- **mobile · throttled**: {"html":18,"js":56.6,"woff2":31.1}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **mobile · unthrottled**: {"html":18,"js":56.5,"woff2":31.1}; after load: {"js":125.7,"svg":0.4}; three.js chunk requested: true
- **desktop · throttled**: {"html":18,"js":56.5,"avif":15.7,"woff2":31.2}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **desktop · unthrottled**: {"html":18,"js":56.6,"woff2":31.1,"avif":15.6}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **mobile · reduced motion · throttled**: {"html":18,"js":56.6,"woff2":31.1}; after load: {"svg":0.4,"js":4.9}; three.js chunk requested: false

## Behaviour checks

- **mobile · throttled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"
- **mobile · unthrottled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"
- **desktop · throttled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): true; manifesto fully readable after scroll: true; map pins: 7; map card opened: The Jiggle Dock; footer credit: "Demo by DC Tech"
- **desktop · unthrottled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): true; manifesto fully readable after scroll: true; map pins: 7; map card opened: The Jiggle Dock; footer credit: "Demo by DC Tech"
- **mobile · reduced motion · throttled**: hero paused when offscreen: n/a (no WebGL); pinned section: false; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"

## Adaptive quality (simulated GPU load) and tab visibility

`?simslow=<ms>` adds <ms> of work per frame on the high tier, scaled by each tier's vertices x pixels, to force the FPS sampler to step down on a fast machine.

- **desktop simslow=40**: {"tierHistory":["high","medium"],"settledFps":106.9,"dpr":1}
- **desktop simslow=120**: {"tierHistory":["high","medium","low"],"settledFps":99.4,"dpr":1}
- **mobile simslow=60**: {"tierHistory":["medium"],"settledFps":72,"dpr":1.5}
- **visibility**: {"runningVisible":true,"runningWhenHidden":false,"runningAfterReturn":true}

## Caveat

GPU throttling can't be emulated: the 120 fps figures come from an M4 Pro GPU with 4x CPU throttling. On a mid-range Android phone the FPS sampler takes over and steps down from `medium` (128x90 segments, dpr 1.5) to `low` (dpr 1) or `potato` (dpr 0.75) when a 45-frame average drops under ~48 fps. Test on the client's actual phone before the pitch.
