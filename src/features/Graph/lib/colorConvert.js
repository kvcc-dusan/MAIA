// Token colours arrive as CSS strings that may be oklch (lib/tokens.js passes
// them through). three.js needs plain sRGB, so every string is reduced to an
// integer 0xRRGGBB here. Strings in hex or rgb notation are parsed directly;
// anything else is painted onto a 1x1 canvas and read back, which makes the
// browser do the oklch to sRGB conversion (and gamut clipping) for us.

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const rgbToInt = ({ r, g, b }) => (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
export const intToRgb = (n) => ({ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 });
export const intToHex = (n) => `#${n.toString(16).padStart(6, "0")}`;

export const parseSimpleColor = (css) => {
  if (typeof css !== "string") return null;
  const text = css.trim();
  const hex = HEX_RE.exec(text);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  if (/^rgba?\s*\(/i.test(text) && !text.includes("%")) {
    const nums = text.match(/-?\d+(\.\d+)?/g);
    if (nums && nums.length >= 3) return { r: clamp255(+nums[0]), g: clamp255(+nums[1]), b: clamp255(+nums[2]) };
  }
  return null;
};

/** Paints `css` on a 1x1 canvas context and reads the pixel back. Null when the colour is unparseable. */
export const readBackRgb = (css, ctx) => {
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  // An unparseable string leaves fillStyle unchanged, so probe twice with different starts.
  ctx.fillStyle = "black";
  ctx.fillStyle = css;
  const first = ctx.fillStyle;
  ctx.fillStyle = "white";
  ctx.fillStyle = css;
  if (first !== ctx.fillStyle) return null;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 ? null : { r, g, b };
};

let sharedCtx;
const getCtx = () => {
  if (sharedCtx === undefined) {
    try {
      sharedCtx = typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (sharedCtx) {
        sharedCtx.canvas.width = 1;
        sharedCtx.canvas.height = 1;
      }
    } catch {
      sharedCtx = null;
    }
  }
  return sharedCtx;
};

const cache = new Map();

/** Any CSS colour to 0xRRGGBB. `fallback` (an int) is used when nothing can read it. */
export const cssColorToInt = (css, fallback, ctx = getCtx()) => {
  const simple = parseSimpleColor(css);
  if (simple) return rgbToInt(simple);
  const key = ctx === sharedCtx ? css : null;
  if (key && cache.has(key)) return cache.get(key);
  const read = readBackRgb(css, ctx);
  const out = read ? rgbToInt(read) : fallback;
  if (key && read) cache.set(key, out);
  return out;
};

export const mixInts = (a, b, t) => {
  const x = intToRgb(a);
  const y = intToRgb(b);
  return rgbToInt({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
};
