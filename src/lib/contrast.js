// WCAG contrast from Arc's resolved token values. Arc tokens are oklch(); the
// browser converts them, jsdom does not, so the maths lives here.

const clamp01 = (n) => Math.min(1, Math.max(0, n));

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Parses "oklch(54% .21 25)" into linear-light sRGB { r, g, b } (clipped to gamut). */
export const oklchToLinearRgb = (css) => {
  const match = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i.exec(css);
  if (!match) throw new Error(`Not an oklch colour: ${css}`);
  const l = match[2] ? Number(match[1]) / 100 : Number(match[1]);
  const c = Number(match[3]);
  const h = (Number(match[4]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: clamp01(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: clamp01(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: clamp01(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
};

const hexToLinearRgb = (css) => {
  const hex = css.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((ch) => ch + ch).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
  return { r, g, b };
};

export const parseColor = (css) => (css.trim().startsWith("#") ? hexToLinearRgb(css) : oklchToLinearRgb(css));

export const relativeLuminance = ({ r, g, b }) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** WCAG contrast ratio between two CSS colours (oklch or hex). */
export const contrastRatio = (foreground, background) => {
  const [a, b] = [foreground, background].map((css) => relativeLuminance(parseColor(css)));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/**
 * Pulls a token's literal value out of foundation.css text for one theme block,
 * following one level of var(--neutral-N) indirection.
 */
export const resolveToken = (css, selector, name) => {
  const block = (sel) => {
    const start = css.indexOf(`${sel} {`);
    if (start < 0) return "";
    return css.slice(start, css.indexOf("\n}", start));
  };
  const read = (text, token) => new RegExp(`${token}:\\s*([^;]+);`).exec(text)?.[1].trim();
  let value = read(block(selector), name) ?? read(block(":root"), name);
  const ref = /^var\((--[\w-]+)\)$/.exec(value ?? "");
  if (ref) value = read(block(selector), ref[1]) ?? read(block(":root"), ref[1]);
  return value;
};
