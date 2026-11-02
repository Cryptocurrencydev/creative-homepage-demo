import "./kit/style/kit.css";
import "./kit/motion/motion.css";
import "./styles/site.css";
import Lenis from "lenis";
import { gsap, ScrollTrigger, reveal, scrubWords } from "./kit/motion/reveal.js";
import { createCursor } from "./kit/motion/cursor.js";
import { createTransition } from "./kit/motion/transition.js";
import { magnetic, squish } from "./kit/motion/hover.js";
import { prefersReducedMotion, hasFinePointer } from "./kit/motion/env.js";
import { FLAVORS } from "./data.js";
import { initFlavors } from "./sections/flavors.js";
import { initKinetic } from "./sections/kinetic.js";
import { initFooter } from "./sections/footer.js";

const stats = (window.__wobl = window.__wobl || {});
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const capture = params.has("capture");
const reduced = prefersReducedMotion();
if (capture) root.classList.add("capture");

// ---- Flavor state -------------------------------------------------------------
let fi = Math.max(0, FLAVORS.findIndex((f) => f.id === root.dataset.flavor));
let hero = null;
const themeMeta = document.querySelector('meta[name="theme-color"]');
function applyFlavor(i) {
  fi = (i + FLAVORS.length) % FLAVORS.length;
  const f = FLAVORS[fi];
  root.style.setProperty("--k-accent", f.accent);
  root.style.setProperty("--flavor-bg", f.bg);
  root.dataset.flavor = f.id;
  themeMeta.content = f.bg;
  document.querySelectorAll("[data-flavor-label]").forEach((el) => (el.textContent = f.short));
  document.querySelectorAll("[data-flavor-name]").forEach((el) => (el.textContent = f.name));
  hero?.setFlavor(f);
}
applyFlavor(fi);

// tap on the jelly (or the nav swatch) pours the next flavor; ignore drags
let downAt = null;
document.querySelectorAll("[data-flavor-next]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
  b.addEventListener("click", (e) => {
    if (downAt && e.detail && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) return;
    applyFlavor(fi + 1);
    if (b.classList.contains("nav__flavor")) hero?.poke();
  });
});

// ---- Smooth scroll (desktop, motion allowed only) -------------------------------
let lenis = null;
if (!reduced && hasFinePointer() && !capture) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ---- Motion kit wiring ----------------------------------------------------------
createCursor();
const transition = createTransition({ text: "wobble…" });
transition.bindLinks('a[href^="#"][data-transition]', (t) =>
  lenis ? lenis.scrollTo(t, { immediate: true, force: true }) : t.scrollIntoView({ behavior: "instant" }));
document.querySelectorAll(".k-btn, .nav__logo").forEach((el) => { magnetic(el, 0.25); squish(el); });

reveal("[data-reveal]", { split: "words" });
scrubWords(document.querySelector("[data-scrub]"));

// ---- Hero: scroll choreography + lazy 3D ------------------------------------------
const heroEl = document.querySelector(".hero");
const stage = heroEl.querySelector("[data-hero-stage]");
if (!reduced && !capture) {
  gsap.to(stage, { yPercent: 16, scale: 0.84, ease: "none", scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__tag, .hero__now, .hero__eyebrow", { y: -60, opacity: 0, ease: "none", scrollTrigger: { trigger: heroEl, start: "top top", end: "45% top", scrub: true } });
  gsap.from(".hero__title", { scale: 0.9, opacity: 0, duration: 1.2, ease: "expo.out" });
  gsap.from(".hero__poster", { scale: 0.5, duration: 1.6, ease: "elastic.out(1, 0.45)", delay: 0.1 });
}

const can3D = !reduced && !navigator.connection?.saveData && !!window.WebGLRenderingContext && !params.has("no3d");
let heroLoading = false;
function loadHero() {
  if (heroLoading || !can3D) return;
  heroLoading = true;
  stats.heroImport = performance.now();
  import("./hero/scene.js")
    .then(({ createHero }) => createHero({
      stage,
      title: stage.querySelector("[data-hero-title]"),
      poster: stage.querySelector("[data-hero-poster]"),
      flavor: FLAVORS[fi],
      capture,
    }))
    .then((h) => {
      if (!h) return;
      hero = h;
      if (capture) { h.freeze(+params.get("t") || 2.2); window.__captureReady = true; return; }
      h.start();
      requestAnimationFrame(() => heroEl.classList.add("is-live"));
    })
    .catch((e) => { stats.heroError = String(e); });
}
if (capture) loadHero();
else if (can3D) {
  // after first paint + load, when the main thread is idle; or immediately on intent
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  const kick = () => idle(loadHero, { timeout: 1500 });
  if (document.readyState === "complete") kick(); else addEventListener("load", kick, { once: true });
  stage.addEventListener("pointerdown", loadHero, { once: true, passive: true });
}

// iOS needs a gesture before deviceorientation; Android just works
stage.addEventListener("click", () => {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
}, { once: true });

if (params.get("from") === "friend") {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status");
  t.textContent = `A friend poured you ${FLAVORS[fi].name}. Poke it.`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4800);
}

const nav = document.querySelector("[data-nav]");
ScrollTrigger.create({ start: () => innerHeight * 0.85, end: "max", onToggle: (st) => nav.classList.toggle("is-solid", st.isActive) });

// ---- Sections ------------------------------------------------------------------------
initFlavors({ onPick: (i) => applyFlavor(i) });
initKinetic();
initFooter({ getFlavor: () => FLAVORS[fi] });

// Map code + SVG are only fetched when the section gets close.
const mapEl = document.querySelector("[data-map]");
const mio = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  mio.disconnect();
  import("./sections/map.js").then((m) => { m.initMap(); ScrollTrigger.refresh(); stats.mapReady = performance.now(); });
}, { rootMargin: "1200px 0px" });
mio.observe(mapEl);

addEventListener("load", () => ScrollTrigger.refresh());
