import { useMemo } from "react";
import { buildPalette, colorsByGroup } from "../lib/graphGroups.js";
import { cssColorToInt, luminance } from "../lib/colorConvert.js";

const FALLBACK_DARK = 0;
const FALLBACK_GREY = 8947848;
const DARK_BELOW = 0.4;
// Arc ships four chart hues (clusterColors slots 0 to 3); the rest is neutral.
const HUE_SLOTS = 4;

/**
 * Theme tokens (CSS strings, maybe oklch) to the integer colours three.js needs.
 * Recomputed when the theme object changes, which is what a theme switch does.
 */
export function useGroupColors(theme, clusterCssColors, groups) {
  return useMemo(() => {
    const bgInt = cssColorToInt(theme.bg, FALLBACK_DARK);
    const base = clusterCssColors.slice(0, HUE_SLOTS).map((c) => cssColorToInt(c, FALLBACK_GREY));
    const rankCount = groups.reduce((max, g) => Math.max(max, g.rank + 1), 0);
    const neutral = cssColorToInt(theme.text, FALLBACK_GREY);
    const fgInt = cssColorToInt(theme.textActive, FALLBACK_GREY);
    return {
      bgInt,
      fgInt,
      neutral,
      textInt: fgInt,
      isDark: luminance(bgInt) < DARK_BELOW,
      colors: colorsByGroup(groups, buildPalette(base, rankCount), neutral, fgInt),
    };
  }, [theme, clusterCssColors, groups]);
}
