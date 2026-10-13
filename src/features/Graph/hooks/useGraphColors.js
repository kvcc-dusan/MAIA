import { useMemo } from "react";
import { cssColorToInt } from "../lib/colorConvert.js";

const FALLBACK_DARK = 0;
const FALLBACK_GREY = 8947848;

/**
 * Theme tokens (CSS strings, maybe oklch) to the integer colours three.js needs for the monochrome 3D graph.
 * Recomputed when the theme object changes, which is what a theme switch does.
 */
export function useGraphColors(theme) {
  return useMemo(() => {
    const fgInt = cssColorToInt(theme.textActive, FALLBACK_GREY);
    return {
      bgInt: cssColorToInt(theme.bg, FALLBACK_DARK),
      fgInt,
      neutral: cssColorToInt(theme.text, FALLBACK_GREY),
      textInt: fgInt,
    };
  }, [theme]);
}
