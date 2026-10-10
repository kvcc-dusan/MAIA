import { describe, expect, it } from "vitest";
import {
  cssColorToInt, intToHex, intToHexAlpha, luminance, mixInts, parseSimpleColor, readBackRgb, rgbToInt, shiftHue,
} from "./colorConvert.js";

// A fake 2D context that behaves like a browser: unparseable fillStyle values
// are ignored, oklch is "converted" to a fixed rgb so the test can see it ran.
const makeCtx = (table) => {
  let style = "black";
  return {
    clearRect() {},
    fillRect() {},
    get fillStyle() { return style; },
    set fillStyle(value) { if (value === "black" || value === "white" || table[value]) style = value; },
    getImageData() {
      const rgb = table[style] ?? (style === "white" ? [255, 255, 255] : [0, 0, 0]);
      return { data: [...rgb, 255] };
    },
  };
};

describe("parseSimpleColor", () => {
  it("reads 6 and 3 digit hex", () => {
    expect(parseSimpleColor("#336699")).toEqual({ r: 51, g: 102, b: 153 });
    expect(parseSimpleColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("reads rgb notation with or without alpha", () => {
    expect(parseSimpleColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseSimpleColor("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30 });
  });
  it("leaves oklch and junk to the canvas path", () => {
    expect(parseSimpleColor("oklch(0.7 0.1 200)")).toBeNull();
    expect(parseSimpleColor(undefined)).toBeNull();
  });
});

describe("cssColorToInt", () => {
  it("converts oklch through the canvas read-back", () => {
    const ctx = makeCtx({ "oklch(0.7 0.1 200)": [12, 160, 190] });
    expect(cssColorToInt("oklch(0.7 0.1 200)", 0, ctx)).toBe(rgbToInt({ r: 12, g: 160, b: 190 }));
  });
  it("falls back when nothing can parse the colour", () => {
    expect(cssColorToInt("not-a-colour", 123, makeCtx({}))).toBe(123);
  });
  it("falls back without a 2D context (jsdom)", () => {
    expect(cssColorToInt("oklch(0.7 0.1 200)", 7, null)).toBe(7);
  });
  it("readBackRgb reports unparseable input as null", () => {
    expect(readBackRgb("nope", makeCtx({}))).toBeNull();
  });
});

describe("colour maths", () => {
  it("round-trips ints and hex strings", () => {
    const n = rgbToInt({ r: 1, g: 2, b: 3 });
    expect(intToHex(n)).toBe("#010203");
    expect(intToHexAlpha(n, 0.5)).toBe("#01020380");
  });
  it("mixes and measures luminance", () => {
    expect(mixInts(rgbToInt({ r: 0, g: 0, b: 0 }), rgbToInt({ r: 200, g: 100, b: 50 }), 0.5)).toBe(rgbToInt({ r: 100, g: 50, b: 25 }));
    expect(luminance(rgbToInt({ r: 0, g: 0, b: 0 }))).toBe(0);
    expect(luminance(rgbToInt({ r: 255, g: 255, b: 255 }))).toBeCloseTo(1, 5);
  });
  it("shifts hue to a different colour but keeps it in range", () => {
    const base = rgbToInt({ r: 40, g: 120, b: 220 });
    const shifted = shiftHue(base, 90);
    expect(shifted).not.toBe(base);
    expect(shifted).toBeGreaterThanOrEqual(0);
  });
});
