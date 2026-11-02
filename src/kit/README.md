# WOBL Style Kit + Motion Kit

Two framework-free modules extracted from the homepage. Copy the `kit/` folder into any project.
Live reference page: `/kit`.

## Style kit: `style/kit.css`

| Group | Tokens |
|---|---|
| Color, base | `--k-ink` `--k-paper` `--k-paper-2` `--k-mute` `--k-white` |
| Color, flavors | `--k-tomato` `--k-lime` `--k-grape` `--k-gum` `--k-sky` |
| Color, semantic | `--k-accent` `--k-accent-ink` `--k-surface` `--k-text` `--k-focus` |
| Type | `--k-font` `--k-font-mono`, fluid scale `--k-step--1` … `--k-step-5`, `--k-step-hero`, leading + tracking |
| Space | `--k-space-3xs` … `--k-space-2xl`, `--k-gutter` (fluid 390 to 1440px) |
| Shape | `--k-radius-s/m/l/pill`, `--k-stroke`, `--k-shadow-pop` |
| Motion | `--k-ease-out` `--k-ease-squish` `--k-dur-fast/med/slow` (collapse to 1ms under reduced motion) |

Classes: `.k-display` `.k-h2` `.k-h3` `.k-body` `.k-small` `.k-eyebrow`, `.k-btn` (+ `--ghost`, `--ink`, `--icon`), `.k-chip`, `.k-sr-only`.
Re-theme by overriding `--k-accent` on `:root` or any container (the homepage does this per flavor).

## Motion kit: `motion/`

Depends on `gsap` (+ ScrollTrigger). Include `motion/motion.css`.

```js
import { createCursor, createTransition, reveal, scrubWords, splitText,
         magnetic, squish, textRoll, prefersReducedMotion } from "./kit/motion/index.js";
```

| Module | API | Reduced motion |
|---|---|---|
| `cursor.js` | `createCursor({ selector })`: dot + lerped ring; `[data-cursor="label"]` grows it and shows a label | ring follows 1:1, no lag |
| `transition.js` | `createTransition({ color, text })` returns `{ go(swap), bindLinks(selector, scrollTo) }`: cover, swap, reveal | swap runs instantly |
| `reveal.js` | `reveal(targets, { split: "words"\|"chars"\|"none", stagger, y })`, `scrubWords(el)`, `splitText(el, mode)` | simple opacity fade, no transforms |
| `hover.js` | `magnetic(el, strength)`, `squish(el)`, `textRoll(el)` | no-ops / CSS transitions off |
| `env.js` | `prefersReducedMotion()`, `hasFinePointer()`, `onReducedMotionChange(fn)` | — |

The cursor and magnetic hover switch off automatically on touch or coarse pointers. Split text keeps an `aria-label` with the original string, so screen readers read whole sentences.
