// Hover states with physical feel.
//   magnetic(el, strength)  -> element leans toward the cursor, springs back
//   squish(el)              -> jelly squash on press, overshoot on release
//   textRoll(el)            -> label rolls up to a duplicate on hover
// All are no-ops for touch-only devices where hover makes no sense
// (squish still works on press), and they respect reduced motion.
import { gsap } from "gsap";
import { hasFinePointer, prefersReducedMotion } from "./env.js";

export function magnetic(el, strength = 0.35) {
  if (!hasFinePointer() || prefersReducedMotion()) return () => {};
  const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => { xTo(0); yTo(0); };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", leave);
  return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
}

export function squish(el, { amount = 0.12 } = {}) {
  if (prefersReducedMotion()) return () => {};
  const down = () => gsap.to(el, { scaleX: 1 + amount, scaleY: 1 - amount, duration: 0.12, ease: "power2.out" });
  const up = () => gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.9, ease: "elastic.out(1.1, 0.3)" });
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointerup", up); el.removeEventListener("pointerleave", up); };
}

export function textRoll(el) {
  if (el.dataset.kRoll) return;
  const text = el.textContent.trim();
  el.dataset.kRoll = "1";
  el.innerHTML = `<span class="k-roll" aria-hidden="true"><span>${text}</span><span>${text}</span></span><span class="k-sr-only">${text}</span>`;
}
