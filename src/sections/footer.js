// Footer micro-interaction: the giant WOBL letters are jelly. Brush across
// them (mouse or finger) and they squash in the direction you moved; tap one
// and it hops. Plus "send a wobble": share a link that opens in your flavor.
import { gsap } from "../kit/motion/reveal.js";
import { prefersReducedMotion } from "../kit/motion/env.js";

export function initFooter({ getFlavor }) {
  const word = document.querySelector("[data-jiggle]");
  const letters = [...word.children];
  const reduced = prefersReducedMotion();
  let lastX = 0, lastT = 0, vx = 0;
  const cool = new WeakMap();

  const jiggle = (el, v) => {
    if (reduced) return;
    const now = performance.now();
    if (now - (cool.get(el) || 0) < 180) return;
    cool.set(el, now);
    const a = Math.min(Math.abs(v) / 2.2, 1) * 0.6 + 0.4;
    const dir = Math.sign(v) || 1;
    gsap.killTweensOf(el, "scaleX,scaleY,skewX");
    gsap.fromTo(el,
      { scaleY: 1 - 0.32 * a, scaleX: 1 + 0.22 * a, skewX: -14 * a * dir },
      { scaleY: 1, scaleX: 1, skewX: 0, duration: 1.3, ease: "elastic.out(1.25, 0.22)" });
  };
  const track = (x) => {
    const t = performance.now();
    vx = (x - lastX) / Math.max(t - lastT, 1);
    lastX = x; lastT = t;
  };

  letters.forEach((el) => {
    el.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && jiggle(el, vx));
    el.addEventListener("click", () => {
      if (reduced) return;
      gsap.timeline()
        .to(el, { y: "-28%", scaleY: 1.12, scaleX: 0.92, duration: 0.28, ease: "power2.out" })
        .to(el, { y: 0, scaleY: 1, scaleX: 1, duration: 0.9, ease: "bounce.out" });
    });
  });
  word.addEventListener("pointermove", (e) => track(e.clientX), { passive: true });
  word.addEventListener("touchmove", (e) => {
    const p = e.touches[0];
    track(p.clientX);
    const el = document.elementFromPoint(p.clientX, p.clientY);
    if (letters.includes(el)) jiggle(el, vx);
  }, { passive: true });

  // ---- Send a wobble ---------------------------------------------------------
  const btn = document.querySelector("[data-share]");
  const label = btn.querySelector("[data-share-label]");
  const original = label.textContent;
  btn.addEventListener("click", async () => {
    const f = getFlavor();
    const url = `${location.origin}/?flavor=${f.id}&from=friend`;
    const text = `I'm drinking ${f.name}. Poke it.`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "WOBL", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      label.textContent = "Link copied. Go wobble someone.";
    } catch {
      label.textContent = url.replace(/^https?:\/\//, "");
    }
    setTimeout(() => (label.textContent = original), 2800);
  });
}
