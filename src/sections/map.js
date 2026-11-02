// Interactive map of the fictional Port Sundermouth.
// SVG is generated here (seeded, deterministic), pins are real <button>s.
// Drag / flick with inertia, pinch or +/- to zoom, arrow keys to pan,
// tap a pin for a card. Reduced motion: no drop-in, no animated pan.
import { gsap, ScrollTrigger } from "../kit/motion/reveal.js";
import { prefersReducedMotion } from "../kit/motion/env.js";
import { HOUSES } from "../data.js";

const MW = 1600, MH = 1100;
const C = { land: "#f4ead3", block: "#e4d6b8", block2: "#eadfc6", water: "#9fd8f5", water2: "#c6ebfb", park: "#c4f135", road: "#fffdf8", ink: "#16110f" };

// --- geometry helpers --------------------------------------------------------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const coastY = (x) => 640 + x * 0.6 + 22 * Math.sin(x / 55);
const RIVER = [[1640, 170], [1380, 230], [1160, 360], [960, 470], [800, 580], [690, 730], [600, 860], [560, 1000]];
const CANAL = [[800, 580], [930, 690], [1100, 720], [1300, 650], [1450, 690]];
const PARKS = [[1008, 300, 120], [300, 330, 78], [1360, 860, 86], [610, 600, 46]];
const ROADS = [
  [[0, 150], [500, 190], [900, 160], [1600, 110]],
  [[120, 420], [520, 470], [880, 380], [1240, 470], [1600, 430]],
  [[420, 0], [460, 300], [520, 560], [430, 760]],
  [[1240, 0], [1210, 300], [1280, 560], [1200, 900], [1240, 1100]],
  [[760, 0], [740, 260], [700, 440]],
  [[700, 1100], [900, 860], [1200, 820], [1600, 780]],
];
const RAIL = [[640, 1100], [900, 940], [1150, 890], [1600, 900]];

function catmull(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function distToPoly(x, y, pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return m;
}

function buildSVG() {
  seed = 7;
  const coast = [];
  for (let x = 0; x <= 760; x += 20) coast.push(`${x},${coastY(x).toFixed(1)}`);
  const blocks = [];
  for (let gy = 20; gy < MH; gy += 58) {
    for (let gx = 20; gx < MW; gx += 66) {
      const w = 38 + rnd() * 20, h = 32 + rnd() * 16;
      const x = gx + rnd() * 6, y = gy + rnd() * 6, mx = x + w / 2, my = y + h / 2;
      if (my > coastY(mx) - 26) continue;
      if (distToPoly(mx, my, RIVER) < 62 || distToPoly(mx, my, CANAL) < 40) continue;
      if (PARKS.some(([px, py, r]) => Math.hypot(mx - px, my - py) < r + 18)) continue;
      if (ROADS.some((r) => distToPoly(mx, my, r) < 26) || distToPoly(mx, my, RAIL) < 26) continue;
      blocks.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="7" fill="${rnd() > 0.5 ? C.block : C.block2}"/>`);
    }
  }
  const trees = PARKS.flatMap(([px, py, r]) =>
    Array.from({ length: Math.round(r / 9) }, () => {
      const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 18);
      return `<circle cx="${(px + Math.cos(a) * d).toFixed(0)}" cy="${(py + Math.sin(a) * d).toFixed(0)}" r="${(6 + rnd() * 6).toFixed(0)}" fill="#9fcb1c" stroke="${C.ink}" stroke-width="2"/>`;
    }));
  const waves = Array.from({ length: 9 }, (_, i) => {
    const x = 40 + (i % 3) * 170 + rnd() * 60, y = 900 + Math.floor(i / 3) * 60 + rnd() * 20;
    return `<path d="M${x},${y} q10,-10 20,0 t20,0 t20,0" fill="none" stroke="${C.water2}" stroke-width="4" stroke-linecap="round"/>`;
  });
  const roadD = ROADS.map(catmull);
  const label = (x, y, t, s = 18) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" class="map-label">${t}</text>`;

  return `<svg viewBox="0 0 ${MW} ${MH}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <style>.map-label{font:700 18px var(--k-font-mono);letter-spacing:.18em;fill:${C.ink};opacity:.55;text-transform:uppercase}</style>
  <rect width="${MW}" height="${MH}" fill="${C.land}"/>
  <g data-map-blocks>${blocks.join("")}</g>
  <path d="M0,${coastY(0)} L${coast.join(" L")} L760,${MH} L0,${MH} Z" fill="${C.water}" stroke="${C.ink}" stroke-width="3"/>
  ${waves.join("")}
  <path d="M60,1060 C200,980 300,1000 420,940" fill="none" stroke="${C.ink}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".6"/>
  <g data-map-water fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${catmull(RIVER)}" stroke="${C.ink}" stroke-width="60"/>
    <path d="${catmull(RIVER)}" stroke="${C.water}" stroke-width="54"/>
    <path d="${catmull(CANAL)}" stroke="${C.ink}" stroke-width="28"/>
    <path d="${catmull(CANAL)}" stroke="${C.water}" stroke-width="22"/>
  </g>
  <g fill="${C.park}" stroke="${C.ink}" stroke-width="3">${PARKS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>
  ${trees.join("")}
  <g data-map-roads fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${roadD.map((d) => `<path d="${d}" stroke="${C.ink}" stroke-width="20"/>`).join("")}
    ${roadD.map((d) => `<path d="${d}" stroke="${C.road}" stroke-width="15"/>`).join("")}
  </g>
  <path d="${catmull(RAIL)}" fill="none" stroke="${C.ink}" stroke-width="5"/>
  <path d="${catmull(RAIL)}" fill="none" stroke="${C.ink}" stroke-width="16" stroke-dasharray="3 14"/>
  <g transform="translate(1100 850)"><rect x="0" y="0" width="110" height="54" rx="10" fill="#ff8bd0" stroke="${C.ink}" stroke-width="3"/><text x="55" y="34" text-anchor="middle" font-size="16" font-weight="800" font-family="var(--k-font)">STATION</text></g>
  <g transform="translate(130 860)"><path d="M0,0 L14,-70 L28,0 Z" fill="#fffdf8" stroke="${C.ink}" stroke-width="3"/><rect x="4" y="-30" width="20" height="10" fill="#ff4b2b"/><circle cx="14" cy="-74" r="7" fill="#ffd34a" stroke="${C.ink}" stroke-width="3"/></g>
  <g transform="translate(1500 110)"><circle r="44" fill="#fffdf8" stroke="${C.ink}" stroke-width="3"/><path d="M0,-34 L10,0 L0,34 L-10,0 Z" fill="${C.ink}"/><path d="M0,-34 L10,0 L-10,0 Z" fill="#ff4b2b"/><text y="-50" text-anchor="middle" font-size="16" font-weight="800">N</text></g>
  ${label(330, 700, "Harbourside")}${label(640, 400, "Old Town")}${label(1008, 160, "Mill Park")}
  ${label(980, 780, "Canal Quarter")}${label(1330, 520, "University Hill")}${label(330, 215, "Downtown")}${label(1160, 1000, "Central Station")}
  ${label(230, 1010, "Sunder Bay", 22)}
</svg>`;
}

// --- component -----------------------------------------------------------------
export function initMap() {
  const root = document.querySelector("[data-map]");
  const vp = root.querySelector("[data-map-viewport]");
  const layer = root.querySelector("[data-map-layer]");
  const card = root.querySelector("[data-map-card]");
  const reduced = prefersReducedMotion();

  layer.style.width = MW + "px";
  layer.style.height = MH + "px";
  layer.innerHTML = buildSVG();
  vp.tabIndex = 0;
  vp.setAttribute("role", "application");
  vp.setAttribute("aria-label", "Map of Port Sundermouth. Use arrow keys to pan, tab to the pins.");

  const pins = HOUSES.map((h, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pin";
    b.style.left = h.x + "%";
    b.style.top = h.y + "%";
    b.setAttribute("aria-label", `${h.name}, ${h.district}`);
    b.dataset.cursor = "open";
    b.innerHTML = `<span class="pin__inv"><span class="pin__shadow"></span><span class="pin__body"><span class="pin__drop"></span></span><span class="pin__label">${h.name}</span></span>`;
    b.addEventListener("click", () => { if (!dragged) open(i); });
    layer.appendChild(b);
    return b;
  });

  // ---- pan/zoom state ----------------------------------------------------------
  const st = { x: 0, y: 0, s: 1 };
  let sMin = 1, sMax = 3, vw = 1, vh = 1;
  const apply = () => {
    layer.style.transform = `translate3d(${st.x}px,${st.y}px,0) scale(${st.s})`;
    layer.style.setProperty("--inv", 1 / st.s);
  };
  const clampPos = (x, y, s) => ({
    x: Math.min(0, Math.max(vw - MW * s, x)),
    y: Math.min(0, Math.max(vh - MH * s, y)),
  });
  const clamp = () => {
    st.s = Math.max(sMin, Math.min(sMax, st.s));
    st.x = Math.min(0, Math.max(vw - MW * st.s, st.x));
    st.y = Math.min(0, Math.max(vh - MH * st.s, st.y));
  };
  const fit = (first) => {
    vw = vp.clientWidth; vh = vp.clientHeight;
    const cover = Math.max(vw / MW, vh / MH);
    sMin = cover;
    sMax = cover * 3.2;
    if (first) {
      st.s = cover * (vw < 700 ? 1.5 : 1.15);
      st.x = (vw - MW * st.s) / 2;
      st.y = (vh - MH * st.s) / 2;
    }
    clamp(); apply();
  };
  fit(true);
  new ResizeObserver(() => fit(false)).observe(vp);

  const zoomAt = (factor, cx = vw / 2, cy = vh / 2, animate = true) => {
    const ns = Math.max(sMin, Math.min(sMax, st.s * factor));
    const k = ns / st.s;
    const target = { s: ns, x: cx - (cx - st.x) * k, y: cy - (cy - st.y) * k };
    if (!animate || reduced) { Object.assign(st, target); clamp(); apply(); return; }
    gsap.to(st, { ...target, duration: 0.5, ease: "expo.out", onUpdate: () => { clamp(); apply(); } });
  };
  root.querySelectorAll("[data-map-zoom]").forEach((b) =>
    b.addEventListener("click", () => zoomAt(+b.dataset.mapZoom > 0 ? 1.4 : 1 / 1.4)));

  // ---- drag + pinch + inertia --------------------------------------------------
  const pointers = new Map();
  let dragged = false, startX = 0, startY = 0, vx = 0, vy = 0, lastT = 0, inertia = 0, pinchD = 0;
  const stopInertia = () => { cancelAnimationFrame(inertia); gsap.killTweensOf(st); };

  vp.addEventListener("pointerdown", (e) => {
    stopInertia();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { dragged = false; startX = e.clientX; startY = e.clientY; vx = vy = 0; lastT = performance.now(); }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchD = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  vp.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = vp.getBoundingClientRect();
      if (pinchD) zoomAt(d / pinchD, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false);
      pinchD = d;
      dragged = true;
      return;
    }
    if (!dragged && Math.hypot(e.clientX - startX, e.clientY - startY) > 6) {
      dragged = true;
      vp.setPointerCapture(e.pointerId);
      vp.classList.add("is-dragging");
      layer.style.willChange = "transform";
    }
    if (!dragged) return;
    const now = performance.now(), dt = Math.max(now - lastT, 1);
    vx = vx * 0.6 + (dx / dt) * 0.4; vy = vy * 0.6 + (dy / dt) * 0.4; lastT = now;
    st.x += dx; st.y += dy; clamp(); apply();
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size) return;
    pinchD = 0;
    vp.classList.remove("is-dragging");
    layer.style.willChange = "";
    if (dragged && !reduced) {
      let fx = vx * 16, fy = vy * 16;
      const glide = () => {
        fx *= 0.93; fy *= 0.93;
        st.x += fx; st.y += fy; clamp(); apply();
        if (Math.abs(fx) + Math.abs(fy) > 0.3) inertia = requestAnimationFrame(glide);
      };
      inertia = requestAnimationFrame(glide);
    }
    setTimeout(() => (dragged = false), 0);
  };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
  vp.addEventListener("keydown", (e) => {
    const m = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key];
    if (m) { e.preventDefault(); st.x += m[0]; st.y += m[1]; clamp(); apply(); }
    if (e.key === "+" || e.key === "=") zoomAt(1.4);
    if (e.key === "-") zoomAt(1 / 1.4);
  });

  // ---- card ----------------------------------------------------------------------
  let current = -1;
  function open(i) {
    current = i;
    const h = HOUSES[i];
    const walk = Math.max(2, Math.round(Math.hypot((h.x - 72) * 16, (h.y - 80) * 11) / 70));
    pins.forEach((p, j) => p.classList.toggle("is-active", j === i));
    card.innerHTML = `
      <p class="k-eyebrow">${String(i + 1).padStart(2, "0")} / ${String(HOUSES.length).padStart(2, "0")} · ${h.district}</p>
      <h3>${h.name}</h3>
      <p>${h.line}</p>
      <dl><dt>Signature</dt><dd>${h.sig}</dd><dt>Hours</dt><dd>${h.hours}</dd><dt>From station</dt><dd>${h.id === "kiosk" ? "you're there" : walk + " min walk"}</dd></dl>
      <button class="k-btn" type="button" data-next>Next house →</button>
      <button class="k-btn k-btn--icon k-btn--ghost map__close" type="button" data-close aria-label="Close">×</button>`;
    card.hidden = false;
    card.querySelector("[data-next]").onclick = () => open((current + 1) % HOUSES.length);
    card.querySelector("[data-close]").onclick = close;
    if (!reduced) gsap.fromTo(card, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" });
    if (!reduced) gsap.fromTo(pins[i].querySelector(".pin__body"), { scaleY: 0.6, scaleX: 1.3 }, { scaleY: 1, scaleX: 1, duration: 0.9, ease: "elastic.out(1.2,0.3)" });

    // pan so the pin sits in the open area above/left of the card
    const px = (h.x / 100) * MW, py = (h.y / 100) * MH;
    const mobile = vw < 768;
    const target = { x: (mobile ? vw / 2 : (vw - 400) / 2) - px * st.s, y: (mobile ? vh * 0.3 : vh / 2) - py * st.s };
    const c = clampPos(target.x, target.y, st.s);
    if (reduced) { st.x = c.x; st.y = c.y; apply(); }
    else gsap.to(st, { x: c.x, y: c.y, duration: 0.8, ease: "expo.inOut", onUpdate: apply });
  }

  function close() {
    pins.forEach((p) => p.classList.remove("is-active"));
    card.hidden = true;
    pins[current]?.focus();
    current = -1;
  }
  root.addEventListener("keydown", (e) => e.key === "Escape" && current >= 0 && close());

  // ---- scroll-in choreography ------------------------------------------------------
  if (!reduced) {
    const bodies = pins.map((p) => p.querySelector(".pin__body"));
    const shadows = pins.map((p) => p.querySelector(".pin__shadow"));
    gsap.set(bodies, { y: -160, opacity: 0 });
    gsap.set(shadows, { scale: 0 });
    gsap.set(layer.querySelector("[data-map-blocks]"), { opacity: 0 });
    const water = layer.querySelectorAll("[data-map-water] path, [data-map-roads] path");
    water.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    ScrollTrigger.create({
      trigger: root, start: "top 75%", once: true,
      onEnter: () => {
        gsap.timeline()
          .to(water, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", stagger: 0.03 })
          .to(layer.querySelector("[data-map-blocks]"), { opacity: 1, duration: 0.8 }, 0.2)
          .to(bodies, { y: 0, opacity: 1, duration: 0.9, ease: "bounce.out", stagger: 0.09 }, 0.7)
          .to(shadows, { scale: 1, duration: 0.6, ease: "back.out(2)", stagger: 0.09 }, 0.75)
          .add(() => water.forEach((p) => (p.style.strokeDasharray = "")));
      },
    });
  }
}
