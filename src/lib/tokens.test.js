// @vitest-environment jsdom
//
// tokens.js is the bridge between the CSS token layer and the canvas surfaces
// (D3/Recharts/Three), which take colour as JS strings rather than classes.
// jsdom has no canvas 2D context, so these tests mainly pin the *degradation*
// path — the one that decides what happens when a colour can't be resolved.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cssVar, clearTokenCache, resolveColor, tokenColor, clusterColors, graphTheme } from "./tokens.js";

describe("tokens.js", () => {
  beforeEach(() => {
    clearTokenCache();
  });

  it("reads a custom property off the document root", () => {
    document.documentElement.style.setProperty("--test-token", "oklch(0.5 0 0)");
    expect(cssVar("--test-token")).toBe("oklch(0.5 0 0)");
  });

  it("caches reads so a render loop doesn't re-run getComputedStyle per frame", () => {
    document.documentElement.style.setProperty("--cached-token", "red");
    const spy = vi.spyOn(window, "getComputedStyle");
    cssVar("--cached-token");
    cssVar("--cached-token");
    cssVar("--cached-token");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("clearTokenCache forces a re-read", () => {
    document.documentElement.style.setProperty("--changing", "red");
    expect(cssVar("--changing")).toBe("red");
    document.documentElement.style.setProperty("--changing", "blue");
    expect(cssVar("--changing")).toBe("red"); // still cached
    clearTokenCache();
    expect(cssVar("--changing")).toBe("blue");
  });

  it("falls back rather than returning empty when a token is missing", () => {
    // An unresolved token must never reach D3 as "" — that paints nothing.
    const out = resolveColor(cssVar("--does-not-exist"));
    expect(out).toBe("rgb(136, 136, 136)");
  });

  it("honours a caller-supplied fallback", () => {
    expect(resolveColor("", "rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
  });

  it("never returns an empty string from the graph theme", () => {
    // The whole point of the fallback: every graph colour must be paintable
    // even when the stylesheet hasn't applied (or there's no canvas, as here).
    const theme = graphTheme();
    for (const [key, value] of Object.entries(theme)) {
      expect(value, `graphTheme().${key}`).toBeTruthy();
    }
  });

  it("returns one colour per cluster slot", () => {
    const colors = clusterColors();
    expect(colors).toHaveLength(6);
    colors.forEach((c) => expect(c).toBeTruthy());
  });

  it("tokenColor at alpha 1 is just the resolved token", () => {
    document.documentElement.style.setProperty("--solid", "rgb(10, 20, 30)");
    expect(tokenColor("--solid", 1)).toBe(resolveColor(cssVar("--solid")));
  });
});
