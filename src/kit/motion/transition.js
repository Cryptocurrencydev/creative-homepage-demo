// Page / section transition: a blob-edged panel wipes up, you swap content
// (navigate, scroll-jump, re-render), then it wipes away.
// go(swap) returns a Promise. Reduced motion: swap runs instantly, no wipe.
import { gsap } from "gsap";
import { prefersReducedMotion } from "./env.js";

export function createTransition({ color = "var(--k-ink)", text = "" } = {}) {
  const el = document.createElement("div");
  el.className = "k-transition";
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--k-transition-bg", color);
  el.innerHTML = `<div class="k-transition__panel"><span class="k-transition__text">${text}</span></div>`;
  document.body.appendChild(el);
  const panel = el.firstChild;
  let busy = false;

  async function go(swap) {
    if (prefersReducedMotion()) { await swap?.(); return; }
    if (busy) return;
    busy = true;
    el.classList.add("is-active");
    await gsap.fromTo(panel, { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: "expo.inOut" });
    await swap?.();
    await gsap.to(panel, { yPercent: -105, duration: 0.6, ease: "expo.inOut", delay: 0.05 });
    el.classList.remove("is-active");
    busy = false;
  }

  /** Wire in-page anchor links (or any [data-transition] link) to use the wipe. */
  function bindLinks(selector = 'a[href^="#"][data-transition]', scrollTo = (t) => t.scrollIntoView()) {
    const onClick = (e) => {
      const a = e.target.closest(selector);
      if (!a) return;
      const href = a.getAttribute("href");
      const target = href.startsWith("#") ? document.querySelector(href) : null;
      e.preventDefault();
      go(() => (target ? scrollTo(target) : (location.href = href))).then(() => {
        target?.setAttribute("tabindex", "-1");
        target?.focus({ preventScroll: true });
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }

  return { go, bindLinks, el };
}
