import "./kit/style/kit.css";
import "./kit/motion/motion.css";
import { createCursor, createTransition, reveal, scrubWords, magnetic, squish, textRoll } from "./kit/motion/index.js";

const css = `
.kitpage{margin:0;background:var(--k-paper);color:var(--k-ink);font:400 var(--k-step-0)/1.5 var(--k-font);padding:0 var(--k-gutter) var(--k-space-xl)}
.kp-head{display:grid;gap:var(--k-space-s);padding:var(--k-space-xl) 0;justify-items:start;max-width:70ch}
.kp-sec{padding:var(--k-space-l) 0;border-top:2px solid var(--k-ink);display:grid;gap:var(--k-space-m)}
.kp-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
.kp-sw{border:2px solid var(--k-ink);border-radius:var(--k-radius-m);overflow:hidden;font-size:var(--k-step--1)}
.kp-sw i{display:block;height:72px}.kp-sw span{display:block;padding:8px 10px;font-family:var(--k-font-mono)}
.kp-type{display:grid;gap:10px}
.kp-space{display:grid;gap:8px}.kp-space div{display:flex;align-items:center;gap:12px;font:500 var(--k-step--1) var(--k-font-mono)}.kp-space i{height:14px;background:var(--k-accent);border:2px solid var(--k-ink);border-radius:4px}
.kp-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.kp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.kp-card{display:grid;gap:6px;text-align:left;padding:var(--k-space-m);min-height:150px;align-content:end;background:var(--k-white);border:2px solid var(--k-ink);border-radius:var(--k-radius-l);font:inherit;cursor:pointer}
.kp-card span{color:var(--k-mute);font-size:var(--k-step--1)}
.kp-scrub{font:700 var(--k-step-3)/1.15 var(--k-font);letter-spacing:-.02em;max-width:24ch;padding:var(--k-space-xl) 0}
.kp-code{background:var(--k-ink);color:var(--k-paper);padding:var(--k-space-m);border-radius:var(--k-radius-m);overflow:auto;font:400 13px/1.6 var(--k-font-mono)}
code{font-family:var(--k-font-mono);font-size:.9em}`;
document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

const colors = ["ink", "paper", "paper-2", "mute", "white", "tomato", "lime", "grape", "gum", "sky"];
const cs = getComputedStyle(document.documentElement);
document.querySelector("[data-swatches]").innerHTML = colors
  .map((c) => `<div class="kp-sw"><i style="background:var(--k-${c})"></i><span>--k-${c}<br>${cs.getPropertyValue("--k-" + c).trim()}</span></div>`).join("");
document.querySelector("[data-space]").innerHTML = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl"]
  .map((s) => `<div><i style="width:var(--k-space-${s})"></i>--k-space-${s}</div>`).join("");

createCursor();
const t = createTransition({ text: "wobble…" });
document.querySelector("[data-demo-transition]").addEventListener("click", () => t.go(() => new Promise((r) => setTimeout(r, 250))));
document.querySelectorAll("[data-roll]").forEach(textRoll);
document.querySelectorAll("[data-magnetic]").forEach((b) => magnetic(b));
document.querySelectorAll(".k-btn, [data-squish]").forEach((b) => squish(b));
reveal("[data-reveal]");
scrubWords(document.querySelector("[data-scrub]"));
