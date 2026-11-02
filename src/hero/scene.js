// WOBL hero: a jelly blob that refracts the headline behind it.
// Loaded lazily (dynamic import) after first paint. Everything here is
// self-contained: geometry, custom shader, spring physics, adaptive quality,
// and pause-when-hidden.
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, SphereGeometry, ShaderMaterial,
  CanvasTexture, Vector2, Vector3, Quaternion, Euler, LinearFilter,
} from "three";
import vert from "./blob.vert.glsl?raw";
import frag from "./blob.frag.glsl?raw";

// Quality tiers. The FPS sampler walks down this list until frames are smooth.
const TIERS = [
  { name: "high", seg: [200, 140], dpr: 2, aa: true },
  { name: "medium", seg: [128, 90], dpr: 1.5, aa: false },
  { name: "low", seg: [72, 52], dpr: 1, aa: false },
  { name: "potato", seg: [44, 32], dpr: 0.75, aa: false },
];

const hexToVec3 = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// Sum offsetLeft/Top up to `root`: layout position that ignores transforms
// (the offsetParent can be any transformed ancestor, e.g. during the intro).
function offsetIn(el, root) {
  let x = 0, y = 0;
  while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
  return { x, y };
}

export async function createHero({ stage, title, poster, flavor, capture = false }) {
  const stats = (window.__wobl = window.__wobl || {});
  stats.heroStart = performance.now();

  const coarse = matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  let tierIndex = coarse || innerWidth < 768 || cores <= 4 ? 1 : 0;

  const canvas = document.createElement("canvas");
  canvas.className = "hero__canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.appendChild(canvas);

  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas, alpha: true, antialias: TIERS[tierIndex].aa, powerPreference: "high-performance",
      preserveDrawingBuffer: capture, premultipliedAlpha: true,
    });
  } catch (e) {
    canvas.remove();
    stats.webgl = "unavailable";
    return null; // poster stays. Nothing else breaks.
  }
  renderer.setClearColor(0x000000, 0);
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  stats.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
  camera.position.z = 1000;

  // --- Background texture: the headline, redrawn to match the DOM exactly.
  const bgCanvas = document.createElement("canvas");
  const bgCtx = bgCanvas.getContext("2d");
  const bgTex = new CanvasTexture(bgCanvas);
  bgTex.minFilter = LinearFilter;
  bgTex.generateMipmaps = false;

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uBg: { value: bgTex },
    uTint: { value: hexToVec3(flavor.accent) },
    uLight: { value: new Vector3(0.5, 0.7, 1) },
    uPoke: { value: new Vector3(0, 0, 1) },
    uPokeAmp: { value: 0 },
    uWobble: { value: 0 },
    uRipple: { value: new Vector3(0, 0, 1) },
    uRippleT: { value: 10 },
    uRippleAmp: { value: 0 },
    uRefract: { value: 0.075 },
  };
  const material = new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
  const mesh = new Mesh(new SphereGeometry(1, ...TIERS[tierIndex].seg), material);
  scene.add(mesh);

  // --- Layout ---------------------------------------------------------------
  let W = 1, H = 1, R = 100, cx = 0, cy = 0, dpr = 1;
  function layout() {
    // offset* metrics ignore CSS transforms (scroll scrub, intro), so the
    // texture and blob always match the untransformed layout.
    W = Math.max(1, stage.offsetWidth); H = Math.max(1, stage.offsetHeight);
    R = poster.offsetWidth / 2.36;             // matches CSS: poster = 2.36 * blob radius
    const po = offsetIn(poster, stage);
    cx = po.x + poster.offsetWidth / 2 - W / 2;
    cy = -(po.y + poster.offsetHeight / 2 - H / 2);
    dpr = Math.min(devicePixelRatio || 1, TIERS[tierIndex].dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    mesh.position.set(cx, cy, 0);
    mesh.scale.setScalar(R);
    const buf = renderer.getDrawingBufferSize(new Vector2());
    uniforms.uRes.value.copy(buf);
    drawBackground();
  }

  function drawBackground() {
    const buf = uniforms.uRes.value;
    bgCanvas.width = buf.x; bgCanvas.height = buf.y;
    const s = buf.x / W;
    const ctx = bgCtx;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = flavor.bg;
    ctx.fillRect(0, 0, W, H);
    const cs = getComputedStyle(title);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = "alphabetic";
    const ascent = ctx.measureText("W").fontBoundingBoxAscent;
    title.querySelectorAll(".hero__line > span").forEach((sp) => {
      // inline spans: offsetTop is the top of the content area, like canvas ascent
      const o = offsetIn(sp, stage);
      ctx.fillText(sp.textContent, o.x, o.y + ascent);
    });
    bgTex.needsUpdate = true;
  }

  // --- Interaction: pointer, touch, tilt -------------------------------------
  const pointer = { x: 0, y: 0, inside: false, down: false, active: false };
  const lean = new Vector2();            // smoothed lean toward pointer/tilt
  const leanTarget = new Vector2();
  const tilt = new Vector2();
  let hasTilt = false;
  const invQ = new Quaternion();
  const tmp = new Vector3();

  function hitTest(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    const sc = r.width / W || 1;
    const x = (clientX - r.left) / sc - W / 2 - cx;
    const y = -((clientY - r.top) / sc - H / 2) - cy;
    leanTarget.set(x / (W / 2), y / (H / 2));
    const d2 = (x * x + y * y) / (R * R);
    pointer.inside = d2 < 1.15;
    if (d2 < 1) {
      tmp.set(x / R, y / R, Math.sqrt(1 - d2));
      invQ.copy(mesh.quaternion).invert();
      tmp.applyQuaternion(invQ);
      return tmp;
    }
    return null;
  }
  const onMove = (e) => {
    pointer.active = true;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) uniforms.uPoke.value.lerp(hit, 0.5).normalize();
  };
  const onDown = (e) => {
    pointer.down = true;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      uniforms.uPoke.value.copy(hit);
      uniforms.uRipple.value.copy(hit);
      uniforms.uRippleT.value = 0;
      uniforms.uRippleAmp.value = 0.07;
      springV += 0.6;
    }
  };
  const onUp = () => { pointer.down = false; };
  const onLeave = () => { pointer.inside = false; pointer.down = false; leanTarget.set(0, 0); };
  stage.addEventListener("pointermove", onMove, { passive: true });
  stage.addEventListener("pointerdown", onDown, { passive: true });
  addEventListener("pointerup", onUp, { passive: true });
  stage.addEventListener("pointerleave", onLeave, { passive: true });

  const onTilt = (e) => {
    if (e.gamma == null) return;
    hasTilt = true;
    tilt.set(Math.max(-1, Math.min(1, e.gamma / 35)), Math.max(-1, Math.min(1, (e.beta - 45) / 35)));
  };
  addEventListener("deviceorientation", onTilt, { passive: true });

  // --- Springs ---------------------------------------------------------------
  let springX = 0, springV = 0;          // poke depth spring (underdamped = jiggle)
  let wobble = 0, lastScroll = scrollY;
  const rot = new Euler();

  function step(dt, t) {
    // Poke depth: hover = soft dent, press = deep dent, release = jiggle back.
    const target = pointer.down && pointer.inside ? 0.26 : pointer.inside ? 0.1 : 0;
    const k = 120, c = 9;
    springV += (-(springX - target) * k - springV * c) * dt;
    springX += springV * dt;
    uniforms.uPokeAmp.value = springX;

    // Scroll velocity shakes the jelly.
    const v = Math.abs(scrollY - lastScroll) / Math.max(dt, 1 / 120);
    lastScroll = scrollY;
    wobble += (Math.min(v / 2500, 1) - wobble) * Math.min(1, dt * (v / 2500 > wobble ? 10 : 1.6));
    uniforms.uWobble.value = wobble;

    uniforms.uRippleT.value += dt;

    // Lean + light: pointer on desktop, tilt on phones (if available).
    const src = hasTilt && !pointer.active ? tilt : leanTarget;
    lean.lerp(src, 1 - Math.exp(-dt * 4));
    rot.set(-lean.y * 0.5 + Math.sin(t * 0.3) * 0.15, lean.x * 0.7 + t * 0.12, 0);
    mesh.quaternion.setFromEuler(rot);
    uniforms.uLight.value.set(0.45 + lean.x * 0.6, 0.65 + lean.y * 0.5, 1).normalize();
    uniforms.uTime.value = t;
  }

  // --- Loop with adaptive quality + pause --------------------------------------
  let running = false, raf = 0, last = 0, t = 0;
  let sampling = { frames: 0, acc: 0, warm: 20 };
  const frameLog = [];
  stats.tierHistory = [TIERS[tierIndex].name];

  function setTier(i) {
    tierIndex = i;
    mesh.geometry.dispose();
    mesh.geometry = new SphereGeometry(1, ...TIERS[i].seg);
    layout();
    stats.tierHistory.push(TIERS[i].name);
    sampling = { frames: 0, acc: 0, warm: 15 };
  }

  // Test hook: ?simslow=<ms> burns <ms> per frame on the high tier, scaled by
  // each tier's vertex x pixel load, to exercise the step-down path on fast
  // machines. Off unless the query param is present.
  const simslow = +new URLSearchParams(location.search).get("simslow") || 0;
  const load = (i) => TIERS[i].seg[0] * TIERS[i].seg[1] * TIERS[i].dpr * TIERS[i].dpr;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (simslow) { const end = performance.now() + simslow * (load(tierIndex) / load(0)); while (performance.now() < end); }
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    t += dt;
    step(dt, t);
    renderer.render(scene, camera);

    // FPS sampling: after warm-up, average 45 frames; drop a tier if slow.
    const ms = dt * 1000;
    frameLog.push(ms); if (frameLog.length > 240) frameLog.shift();
    if (sampling) {
      if (sampling.warm > 0) sampling.warm--;
      else {
        sampling.acc += ms; sampling.frames++;
        if (sampling.frames >= 45) {
          const avg = sampling.acc / sampling.frames;
          stats.sampledFps = Math.round(1000 / avg);
          if (avg > 21 && tierIndex < TIERS.length - 1) setTier(tierIndex + 1);
          else sampling = null; // settled
        }
      }
    }
  }

  function start() {
    if (running || document.hidden) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 });
  io.observe(stage);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  let rsT = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rsT); rsT = setTimeout(layout, 120); });
  ro.observe(stage);

  await document.fonts.ready;
  layout();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  stats.heroReady = performance.now();
  stats.tier = () => TIERS[tierIndex].name;
  stats.dpr = () => dpr;
  stats.running = () => running;
  stats.fps = () => {
    const n = frameLog.length; if (!n) return 0;
    return Math.round(1000 / (frameLog.reduce((a, b) => a + b, 0) / n));
  };
  stats.resetFrames = () => { frameLog.length = 0; };

  return {
    canvas,
    start,
    stop,
    setFlavor(f) {
      flavor = f;
      uniforms.uTint.value.copy(hexToVec3(f.accent));
      // the hero background colour transitions in CSS; follow it in the texture
      drawBackground();
      springV += 1.2; // celebratory wobble
    },
    poke() { springV += 1; uniforms.uRippleT.value = 0; uniforms.uRippleAmp.value = 0.06; },
    freeze(time) { stop(); t = time; step(1 / 60, t); renderer.render(scene, camera); },
    destroy() {
      stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      removeEventListener("deviceorientation", onTilt);
      renderer.dispose(); canvas.remove();
    },
  };
}
