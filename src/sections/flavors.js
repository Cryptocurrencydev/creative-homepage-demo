// Pinned horizontal flavor track. Only pins when motion is allowed;
// otherwise the CSS default (a vertical stack) is used, no scroll-jacking.
import { gsap, ScrollTrigger } from "../kit/motion/reveal.js";

export function initFlavors({ onPick }) {
  const section = document.querySelector(".flavors");
  const pin = section.querySelector("[data-flavors-pin]");
  const track = section.querySelector("[data-flavors-track]");
  const bar = section.querySelector("[data-flavors-bar]");
  const cards = [...track.children];

  cards.forEach((card, i) => {
    card.setAttribute("data-cursor", "pick");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Pour ${card.querySelector(".flavor__name").textContent}`);
    const pick = () => onPick(i);
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
  });

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    section.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: pin, pin: true, start: "top top", end: () => "+=" + dist(),
        scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => gsap.set(bar, { scaleX: st.progress }),
      },
    });
    cards.forEach((card) => {
      const blob = card.querySelector(".flavor__blob");
      const name = card.querySelector(".flavor__name");
      gsap.fromTo(blob, { rotate: -30, scale: 0.7, xPercent: 30 }, {
        rotate: 20, scale: 1.08, xPercent: -10, ease: "none",
        scrollTrigger: { containerAnimation: tw, trigger: card, start: "left right", end: "right left", scrub: true },
      });
      gsap.fromTo(name, { xPercent: 25 }, {
        xPercent: -5, ease: "none",
        scrollTrigger: { containerAnimation: tw, trigger: card, start: "left right", end: "right left", scrub: true },
      });
    });
    return () => { section.classList.remove("is-pinned"); gsap.set(track, { clearProps: "transform" }); };
  });
  ScrollTrigger.refresh();
}
