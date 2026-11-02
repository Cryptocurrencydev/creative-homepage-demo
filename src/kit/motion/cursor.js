// Custom cursor: a dot that tracks 1:1 and a ring that lerps behind it.
// Any element with [data-cursor="label"] grows the ring and shows the label.
// Auto-disabled on touch / coarse pointers. No dependencies.
import { hasFinePointer, prefersReducedMotion } from "./env.js";

export function createCursor({ root = document.body, selector = "[data-cursor], a, button", lerp = 0.18 } = {}) {
  if (!hasFinePointer()) return { destroy() {} };

  const el = document.createElement("div");
  el.className = "k-cursor";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="k-cursor__ring"><span class="k-cursor__label"></span></div><div class="k-cursor__dot"></div>';
  root.appendChild(el);
  const ring = el.firstChild, dot = el.lastChild, label = ring.firstChild;
  document.documentElement.classList.add("has-k-cursor");

  const k = prefersReducedMotion() ? 1 : lerp;
  let mx = -100, my = -100, rx = -100, ry = -100, raf = 0, visible = false;

  const move = (e) => {
    mx = e.clientX; my = e.clientY;
    if (!visible) { visible = true; rx = mx; ry = my; el.classList.add("is-visible"); }
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const tick = () => {
    rx += (mx - rx) * k; ry += (my - ry) * k;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = Math.abs(mx - rx) + Math.abs(my - ry) > 0.1 ? requestAnimationFrame(tick) : 0;
  };
  const over = (e) => {
    const t = e.target.closest?.(selector);
    el.classList.toggle("is-hover", !!t);
    const text = t?.getAttribute("data-cursor") || "";
    label.textContent = text;
    el.classList.toggle("has-label", !!text);
  };
  const down = () => el.classList.add("is-down");
  const up = () => el.classList.remove("is-down");
  const leave = () => { visible = false; el.classList.remove("is-visible"); };

  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerover", over, { passive: true });
  addEventListener("pointerdown", down, { passive: true });
  addEventListener("pointerup", up, { passive: true });
  document.addEventListener("pointerleave", leave);

  return {
    el,
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("pointerover", over);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-k-cursor");
      el.remove();
    },
  };
}
