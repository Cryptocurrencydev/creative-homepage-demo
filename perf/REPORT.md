# Performance report

Target: https://creative-homepage-demo.vercel.app  
Run: 2026-11-02T22:50:03.586Z  
Harness: `node scripts/perf.mjs <url>` (Playwright 1.49, Chromium new-headless, GPU via ANGLE/Metal on ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)).

Throttled = Chrome DevTools "Slow 3G" (400 kbit/s, 2000 ms RTT) + 4x CPU slowdown, cache disabled. Mobile = 390x844 @2.625x, touch, Android UA.

| Run | FCP ms | LCP ms | CLS | TBT ms | load ms | 3D ready ms | initial KB | streamed after load KB | hero FPS | scroll FPS | quality tier | console errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mobile · throttled | 2717 | 2867 | 0.0034 | 110 | 6427 | 11016 | 106 | 126.1 | 120.3 | 119.7 / p95 9.1ms | medium @ dpr 1.5 | 0 |
| mobile · unthrottled | 795 | 795 | 0 | 0 | 979 | 1198 | 105.9 | 126.1 | 120.3 | 120.1 / p95 8.9ms | medium @ dpr 1.5 | 0 |
| desktop · throttled | 2804 | 2804 | 0.004 | 126 | 6846 | 11438 | 121.6 | 126.1 | 119.4 | 119.7 / p95 9.1ms | high @ dpr 1 | 0 |
| desktop · unthrottled | 775 | 775 | 0.004 | 0 | 944 | 1140 | 121.6 | 126.1 | 120 | 120.1 / p95 8.9ms | high @ dpr 1 | 0 |
| mobile · reduced motion · throttled | 2714 | 2864 | 0.0034 | 3 | 6369 | poster only | 106 | 5.3 | 120.2 | 119.8 / p95 9.1ms | n/a (poster) @ dpr - | 0 |

## Initial transfer by type (KB, compressed on the wire)

- **mobile · throttled**: {"html":18.2,"js":56.6,"woff2":31.2}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **mobile · unthrottled**: {"html":18.2,"js":56.6,"woff2":31.1}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **desktop · throttled**: {"html":18.2,"js":56.6,"avif":15.7,"woff2":31.1}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **desktop · unthrottled**: {"html":18.2,"avif":15.6,"woff2":31.2,"js":56.6}; after load: {"svg":0.4,"js":125.7}; three.js chunk requested: true
- **mobile · reduced motion · throttled**: {"html":18.2,"js":56.6,"woff2":31.1}; after load: {"svg":0.4,"js":4.9}; three.js chunk requested: false

## Behaviour checks

- **mobile · throttled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"
- **mobile · unthrottled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"
- **desktop · throttled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): true; manifesto fully readable after scroll: true; map pins: 7; map card opened: The Jiggle Dock; footer credit: "Demo by DC Tech"
- **desktop · unthrottled**: hero paused when offscreen: yes; pinned section: true; smooth scroll (Lenis): true; manifesto fully readable after scroll: true; map pins: 7; map card opened: The Jiggle Dock; footer credit: "Demo by DC Tech"
- **mobile · reduced motion · throttled**: hero paused when offscreen: n/a (no WebGL); pinned section: false; smooth scroll (Lenis): false; manifesto fully readable after scroll: true; map pins: 7; map card opened: Lantern Row; footer credit: "Demo by DC Tech"

## Adaptive quality (simulated GPU load) and tab visibility

`?simslow=<ms>` adds <ms> of work per frame on the high tier, scaled by each tier's vertices x pixels, to force the FPS sampler to step down on a fast machine.

- **desktop simslow=40**: {"tierHistory":["high","medium"],"settledFps":106.9,"dpr":1}
- **desktop simslow=120**: {"tierHistory":["high","medium","low"],"settledFps":99.3,"dpr":1}
- **mobile simslow=60**: {"tierHistory":["medium"],"settledFps":71.9,"dpr":1.5}
- **visibility**: {"runningVisible":true,"runningWhenHidden":false,"runningAfterReturn":true}

## Caveat

GPU throttling can't be emulated: the 120 fps figures come from an M4 Pro GPU with 4x CPU throttling. On a mid-range Android phone the FPS sampler takes over and steps down from `medium` (128x90 segments, dpr 1.5) to `low` (dpr 1) or `potato` (dpr 0.75) when a 45-frame average drops under ~48 fps. Test on the client's actual phone before the pitch.
