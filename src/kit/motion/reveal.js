// Scroll reveals built on GSAP ScrollTrigger.
//   splitText(el, "words" | "chars" | "lines")  -> wraps text in masked spans
//   reveal(targets, { split, stagger, y })      -> masked rise-in on enter
//   scrubWords(el)                               -> words light up as you scroll
// Reduced motion: no transforms; elements simply fade in (or are shown).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./env.js";

gsap.registerPlugin(ScrollTrigger);

export function splitText(el, mode = "words") {
  if (el.dataset.kSplit) return [...el.querySelectorAll(".k-split__inner")];
  const label = el.textContent.trim().replace(/\s+/g, " ");
  el.setAttribute("aria-label", label);
  const words = label.split(" ");
  el.textContent = "";
  const inners = [];
  words.forEach((w, i) => {
    const outer = document.createElement("span");
    outer.className = "k-split";
    outer.setAttribute("aria-hidden", "true");
    const parts = mode === "chars" ? [...w] : [w];
    parts.forEach((p) => {
      const inner = document.createElement("span");
      inner.className = "k-split__inner";
      inner.textContent = p;
      outer.appendChild(inner);
      inners.push(inner);
    });
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
  el.dataset.kSplit = mode;
  return inners;
}

export function reveal(targets, { split = "words", stagger = 0.04, y = 110, duration = 0.9, start = "top 85%" } = {}) {
  const els = gsap.utils.toArray(targets);
  if (prefersReducedMotion()) {
    els.forEach((el) => {
      gsap.set(el, { opacity: 0 });
      ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => gsap.to(el, { opacity: 1, duration: 0.4 }) });
    });
    return;
  }
  els.forEach((el) => {
    const parts = split === "none" ? [el] : splitText(el, split);
    gsap.set(parts, { yPercent: split === "none" ? 0 : y, y: split === "none" ? 40 : 0, opacity: split === "none" ? 0 : 1 });
    ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () =>
        gsap.to(parts, { yPercent: 0, y: 0, opacity: 1, duration, stagger, ease: "expo.out" }),
    });
  });
}

export function scrubWords(el, { from = 0.12, start = "top 80%", end = "bottom 45%" } = {}) {
  const words = splitText(el, "words");
  if (prefersReducedMotion()) return;
  gsap.set(words, { opacity: from });
  gsap.to(words, {
    opacity: 1,
    stagger: 0.1,
    ease: "none",
    scrollTrigger: { trigger: el, start, end, scrub: 0.6 },
  });
}

export { gsap, ScrollTrigger };
