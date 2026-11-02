// Shared environment checks for the motion kit.
const rmq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
const fine = typeof matchMedia !== "undefined" ? matchMedia("(hover: hover) and (pointer: fine)") : null;

export const prefersReducedMotion = () => !!rmq?.matches;
export const hasFinePointer = () => !!fine?.matches;

/** Calls fn(isReduced) now and whenever the OS setting changes. Returns unsubscribe. */
export function onReducedMotionChange(fn) {
  fn(prefersReducedMotion());
  const h = (e) => fn(e.matches);
  rmq?.addEventListener("change", h);
  return () => rmq?.removeEventListener("change", h);
}
