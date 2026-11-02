# WOBL: interactive homepage concept

**Live:** https://creative-homepage-demo.vercel.app · **Kit page:** https://creative-homepage-demo.vercel.app/kit

A one-page homepage for **WOBL**, a fictional jelly-soda brand. It was built as a creative-dev pitch: something people post about and send to a friend, and it still runs smoothly on a mid-range Android phone.

Demo by DC Tech.

## The moments

1. **Hero: poke the jelly.** A three.js blob with a custom GLSL shader. It does screen-space refraction of the real HTML headline behind it, with chromatic split, a thin-film rim and a glint. The cursor dents it and the dent jiggles back on a spring. A tap sends a ripple and pours the next flavor, which re-themes the whole page. Scroll speed shakes it, and tilting a phone leans it and moves the light.
2. **Manifesto.** Words light up as you scroll.
3. **Flavors.** A horizontal track pinned with CSS `position: sticky` (compositor-smooth on phones), driven 1:1 by ScrollTrigger + `containerAnimation`, with a short hold on the last card before release. Tap a card to pour that flavor.
4. **Kinetic.** A marquee that speeds up with scroll velocity and flips direction, plus count-up stats.
5. **Interactive map.** Port Sundermouth is a fictional city drawn as SVG generated in code. It supports drag and flick with inertia, pinch, +/− buttons and arrow keys. Rivers and roads draw in on scroll, the pins drop and bounce, and tapping a pin opens a card with next/close.
6. **Footer.** Brush across the giant WOBL letters with a mouse or finger and they squash in the direction you moved; tap one and it hops. **Send a wobble** shares `/?flavor=grape&from=friend`, so your friend lands on the page already poured in your flavor, with a toast.

Also included: a custom cursor with contextual labels (`poke`, `drag`, `open`, `pick`, `send`), a blob-wipe transition on nav links, magnetic and squishy buttons, and Lenis smooth scroll (desktop only).

## Performance design

- **Instant first paint:** the HTML, the CSS (inlined, 4.9 KB gz) and a real-shader poster of the blob all render first. The mobile poster is an 8 KB AVIF inlined in the HTML. three.js loads with a dynamic `import()` after `load` + `requestIdleCallback`, or immediately on a first tap. The canvas cross-fades over the poster.
- **Adaptive quality:** devicePixelRatio is capped per tier (2 / 1.5 / 1 / 0.75). Touch devices and machines with 4 or fewer cores start on `medium`. An FPS sampler averages 45 frames and steps down a tier (fewer segments, lower DPR, no MSAA) while the average frame is over 21 ms. The silhouette is alpha-smoothed in the shader, so tiers without MSAA still look clean.
- **Pausing:** rendering stops when the hero is offscreen (IntersectionObserver) or the tab is hidden (`visibilitychange`). The marquee ticker also stops offscreen.
- **`prefers-reduced-motion`:** three.js is never downloaded and the static poster stays. There's no Lenis, no pinning (the flavors become a vertical stack) and no parallax; reveals become plain fades. Everything stays readable and usable, including the map.
- **Slow connection / Save-Data:** text and poster come first and the 3D streams in afterwards. With `saveData` on, the 3D is skipped entirely.
- The font is self-hosted and subset, with the optical-size axis pinned: 77 KB down to 32 KB. Map code and SVG are lazy-loaded near the section (4.6 KB).

### Measured (live URL, Playwright, CPU 4x + Slow 3G)

| | FCP | LCP | CLS | TBT | 3D ready | initial transfer | 3D streamed later |
|---|---|---|---|---|---|---|---|
| Mobile 390px | 2.7 s | 2.9 s | 0.003 | 110 ms | 11.0 s | 106 KB | 126 KB |
| Desktop 1440px | 2.8 s | 2.8 s | 0.004 | 126 ms | 11.4 s | 122 KB | 126 KB |
| Mobile, reduced motion | 2.7 s | 2.9 s | 0.003 | 3 ms | never (poster) | 106 KB | 5 KB |

Zero console errors in every run. Full table, FPS and behaviour checks: [`perf/REPORT.md`](perf/REPORT.md). Raw data: [`perf/results.json`](perf/results.json).

## Deliverable kits

- **Style kit:** [`src/kit/style/kit.css`](src/kit/style/kit.css) covers color tokens, a fluid type scale, spacing, buttons and chips.
- **Motion kit:** [`src/kit/motion/`](src/kit/motion) holds the cursor, page transition, scroll reveal / word scrub, and hover (magnetic, squish, text roll).
- Docs: [`src/kit/README.md`](src/kit/README.md). Live reference: `/kit`.

## Run it

```bash
npm install
npm run dev                 # local dev
npm run build && npm run preview
npm run poster              # re-render hero posters from the real shader (needs preview running)
npm run perf -- https://creative-homepage-demo.vercel.app && npm run report
node scripts/scrolljank.mjs <url> 4             # touch-fling frame times + pin drift
node scripts/scrollvideo.mjs <url> <dir>        # record composited frames of a fling
```

Stack: Vite 5, three.js r170 (ShaderMaterial, custom GLSL), GSAP 3.12 + ScrollTrigger, Lenis, Playwright. Hosting: Vercel.

## Notes

- The hero asset is procedural (a displaced sphere in the vertex shader), not a GLB. No Blender MCP was connected for this build, and a shader-displaced sphere weighs 0 KB compared with any exported mesh.
- WOBL, Port Sundermouth and every location are invented.
- Build timings are in [`TIMELOG.md`](TIMELOG.md).
