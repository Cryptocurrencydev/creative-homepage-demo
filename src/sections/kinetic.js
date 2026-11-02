// Velocity marquee + count-up stats.
import { gsap, ScrollTrigger } from "../kit/motion/reveal.js";
import { prefersReducedMotion } from "../kit/motion/env.js";

export function initKinetic() {
  const section = document.querySelector(".kinetic");
  const rows = [...section.querySelectorAll(".marquee__row")];
  const reduced = prefersReducedMotion();

  if (!reduced) {
    const state = rows.map((r) => ({ el: r, x: 0, dir: +r.dataset.dir, w: 0 }));
    const measure = () => state.forEach((s) => (s.w = s.el.firstElementChild.offsetWidth));
    measure();
    addEventListener("resize", measure);
    let boost = 0, scrollDir = 1, last = scrollY;
    const tick = (_, dtMs) => {
      const dy = scrollY - last; last = scrollY;
      if (dy) scrollDir = Math.sign(dy);
      boost += (Math.min(Math.abs(dy) * 0.9, 40) - boost) * 0.12;
      state.forEach((s) => {
        s.x -= s.dir * scrollDir * (0.06 * dtMs + boost);
        if (s.x <= -s.w) s.x += s.w;
        if (s.x > 0) s.x -= s.w;
        s.el.style.transform = `translate3d(${s.x}px,0,0)`;
      });
    };
    ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "bottom top",
      onToggle: (st) => (st.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
    });
  }

  section.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count;
    if (reduced) return;
    const from = to === 0 ? 100 : 0;
    const o = { v: from };
    el.textContent = from;
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: "expo.out", onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
}
