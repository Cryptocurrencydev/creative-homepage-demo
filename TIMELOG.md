# Timestamp log — creative-homepage-demo

| Phase | Start | End | Notes |
|---|---|---|---|
| 0. Setup & toolchain | 22:38:52 | 22:42:47 | vite 5, three 0.170, gsap 3.12, lenis, playwright; font self-hosted. No Blender MCP connected, so hero asset is procedural |
| 1. Kits + page scaffold | 22:42:47 | 22:52:30 | style kit, motion kit, HTML, CSS, sections, map, hero shader |
| 2. Hero poster + visual QA | 22:52:30 | 23:02:25 | real-shader posters captured via Playwright (WebGL on Metal); fixed mobile stacking + refraction alignment |
| 3. Deploy + perf harness + optimisation | 23:02:25 | 23:15:18 | Vercel prod; CPU 4x + Slow 3G runs; inlined CSS (FCP 5.0s to 2.8s), inlined mobile poster (LCP 5.25s to 2.94s), font 77KB to 32KB, dedup font/CSS |
| 4. QA states, nav fix, docs, final perf run | 23:15:18 | 23:19:44 | interaction + reduced-motion screenshots, solid nav, kit README, perf/REPORT.md |
| 5. Secret scan + publish | 23:19:44 | 23:20:06 | gitleaks dir: no leaks; public GitHub repo; final prod deploy |
