/**
 * Runtime access to the design tokens.
 *
 * The canvas surfaces (D3/Three/Recharts/SVG) take color as JS strings, not
 * classes — `lib/tokens.js` was the planned home for that bridge (the token
 * linter's header comments anticipated it). Two things it must handle:
 *
 *  1. The raw custom properties live in the `.dark` block of tokens.css
 *     (`--background`, `--priority-1`, …). The `--color-*` aliases seen in
 *     `@theme inline` are compile-time only and do NOT exist at runtime.
 *  2. The raw values are oklch(). `resolveColor()` runs them through a canvas
 *     2D context, which validates the string and normalises what it can.
 *
 *     Be aware of what it does NOT do: current Chrome preserves `oklch()`
 *     verbatim through both `getComputedStyle` and canvas `fillStyle`, so the
 *     output is frequently still an oklch string, not `rgb()`. That is fine
 *     for every consumer today — SVG, D3 and CSS all parse oklch natively —
 *     but it means this module does NOT currently guarantee a THREE.Color-safe
 *     value. `ColorBends.jsx` is the only THREE surface and it does not use
 *     these helpers; if that changes, convert explicitly at that call site
 *     rather than assuming rgb comes out of here.
 *
 * Values are cached per property name; the theme never changes while running,
 * but `clearTokenCache()` exists for tests and future theming.
 */

const cache = new Map();
const resolved = new Map();

export function cssVar(name) {
  if (!cache.has(name)) {
    cache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }
  return cache.get(name);
}

export function clearTokenCache() {
  cache.clear();
  resolved.clear();
}

// A canvas 2D context is used to validate and normalise colour strings. It
// rejects anything unparseable (see the sentinel below), which a plain regex
// wouldn't. `undefined` means "not tried yet"; `null` is a real answer
// (jsdom has no 2D context) and must not trigger a retry on every call.
let ctx;
function getCtx() {
  if (ctx === undefined) {
    ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  return ctx;
}

const SENTINEL = "#000000";

/** Validates + normalises any CSS color string; falls back if unparseable. */
export function resolveColor(cssColor, fallback = "rgb(136, 136, 136)") {
  if (!cssColor) return fallback;
  if (resolved.has(cssColor)) return resolved.get(cssColor);

  const c = getCtx();
  let out = fallback;
  if (c) {
    // fillStyle silently keeps its previous value when handed something it
    // can't parse, so set a known sentinel first and treat "unchanged" as a
    // parse failure rather than reporting black.
    c.fillStyle = SENTINEL;
    c.fillStyle = cssColor;
    const normalised = c.fillStyle;
    out = normalised === SENTINEL && cssColor.trim().toLowerCase() !== SENTINEL ? fallback : normalised;
  }

  resolved.set(cssColor, out);
  return out;
}

/**
 * Token color faded to `alpha`, via CSS color-mix so it works whatever
 * notation the token uses (oklch, hex, rgb).
 *
 * NOTE this MULTIPLIES with any alpha the token already carries — the overlay
 * and border tokens are themselves translucent, so `tokenColor("--overlay", 0.5)`
 * is white at 5%, not 50%. Prefer picking the token that already encodes the
 * opacity you want; reach for this only for a genuine fade.
 */
export function tokenColor(name, alpha = 1) {
  const base = cssVar(name);
  if (!base || alpha === 1) return resolveColor(base);
  return resolveColor(`color-mix(in srgb, ${base} ${alpha * 100}%, transparent)`, resolveColor(base));
}

/* -------------------------------------------
   Shared palettes for the canvas surfaces.
   One definition instead of the three drifting copies that lived in
   GraphPage / GraphRenderer / GraphControls.
------------------------------------------- */

const CLUSTER_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--intel"];

export function clusterColors() {
  return CLUSTER_VARS.map((n) => resolveColor(cssVar(n)));
}

export function graphTheme() {
  return {
    bg: resolveColor(cssVar("--background")),
    nodeFill: resolveColor(cssVar("--foreground-secondary")),
    nodeActive: resolveColor(cssVar("--foreground")),
    nodeStroke: "none",
    // --overlay is white@10%, the token that matches the graph's original
    // hardcoded rgba(255,255,255,0.12) link colour. Deliberately not
    // tokenColor(--border-strong, 0.35): that multiplies down to ~7%.
    link: resolveColor(cssVar("--overlay")),
    text: resolveColor(cssVar("--muted-foreground")),
    textActive: resolveColor(cssVar("--foreground")),
  };
}
