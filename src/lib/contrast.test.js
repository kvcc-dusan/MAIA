import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, resolveToken } from "./contrast.js";

const css = readFileSync(new URL("../components/arc/foundation.css", import.meta.url), "utf8");
const THEMES = { light: ":root", dark: ':root[data-theme="dark"]' };
const token = (theme, name) => resolveToken(css, THEMES[theme], name);
const ratio = (theme, fg, bg) => contrastRatio(token(theme, fg), token(theme, bg));

describe("contrast helper", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
    expect(contrastRatio("oklch(100% 0 0)", "oklch(0% 0 0)")).toBeCloseTo(21, 0);
    expect(contrastRatio("#767676", "#fff")).toBeCloseTo(4.54, 1);
  });
});

describe("Arc text tokens on MAIA surfaces", () => {
  const SURFACES = ["--background", "--surface", "--surface-muted"];

  for (const theme of Object.keys(THEMES)) {
    for (const surface of SURFACES) {
      it(`${theme}: foreground and text-secondary pass 4.5:1 on ${surface}`, () => {
        expect(ratio(theme, "--foreground", surface)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(theme, "--text-secondary", surface)).toBeGreaterThanOrEqual(4.5);
      });

      it(`${theme}: danger passes 4.5:1 on ${surface}`, () => {
        expect(ratio(theme, "--danger", surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  // Known gap in Arc's foundation (read-only fork): light-theme muted text is ~4.1:1.
  // The assertion documents the numbers so a foundation update that fixes it shows up here.
  it("text-muted is at least 3:1 everywhere (icons, large text) and 4.5:1 in dark", () => {
    for (const theme of Object.keys(THEMES)) {
      for (const surface of SURFACES) expect(ratio(theme, "--text-muted", surface)).toBeGreaterThanOrEqual(3);
    }
    for (const surface of SURFACES) expect(ratio("dark", "--text-muted", surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("reports the light-theme text-muted shortfall", () => {
    expect(ratio("light", "--text-muted", "--background")).toBeLessThan(4.5);
  });
});
