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

  // Pinning is done with CSS position:sticky (compositor-driven, so it never
  // jumps on phones the way a JS pin can). JS only translates the track, 1:1
  // with scroll (no scrub lag), then the last card holds before release.
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    section.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const setDist = () => section.style.setProperty("--dist", dist() + "px");
    setDist();
    ScrollTrigger.addEventListener("refreshInit", setDist);
    const tw = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: section, start: "top top", end: () => "+=" + dist(),
        scrub: true, invalidateOnRefresh: true,
        onUpdate: (st) => gsap.set(bar, { scaleX: st.progress }),
      },
    });
    cards.forEach((card) => {
      const blob = card.querySelector(".flavor__blob");
      const name = card.querySelector(".flavor__name");
      const st = { containerAnimation: tw, trigger: card, start: "left right", end: "right left", scrub: true };
      gsap.fromTo(blob, { rotate: -30, scale: 0.7, xPercent: 30 }, { rotate: 20, scale: 1.08, xPercent: -10, ease: "none", scrollTrigger: st });
      gsap.fromTo(name, { xPercent: 25 }, { xPercent: -5, ease: "none", scrollTrigger: { ...st } });
    });
    return () => {
      ScrollTrigger.removeEventListener("refreshInit", setDist);
      section.classList.remove("is-pinned");
      section.style.removeProperty("--dist");
      gsap.set(track, { clearProps: "transform" });
    };
  });
  ScrollTrigger.refresh();
}
