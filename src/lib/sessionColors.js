/**
 * Session colour palette for Chronos.
 *
 * Sessions previously had no colour field at all — every block on the
 * timeline rendered identically regardless of what it was. Values are token
 * names, not hex, so the palette follows the theme; and they're written out
 * as literal classes (not built from a template string) so Tailwind's
 * scanner can see them.
 */
export const SESSION_COLORS = [
  { value: "neutral", label: "Neutral" },
  { value: "intel", label: "Violet" },
  { value: "success", label: "Green" },
  { value: "warning", label: "Amber" },
  { value: "info", label: "Blue" },
  { value: "destructive", label: "Rose" },
];

const SWATCH_CLASS = {
  neutral: "bg-foreground",
  intel: "bg-intel",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
};

const SESSION_BLOCK_CLASS = {
  neutral: "bg-overlay border-border text-foreground hover:bg-overlay hover:border-border-strong",
  intel: "bg-intel/15 border-intel/40 text-intel hover:bg-intel/20 hover:border-intel/60",
  success: "bg-success/15 border-success/40 text-success hover:bg-success/20 hover:border-success/60",
  warning: "bg-warning/15 border-warning/40 text-warning hover:bg-warning/20 hover:border-warning/60",
  info: "bg-info/15 border-info/40 text-info hover:bg-info/20 hover:border-info/60",
  destructive: "bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/20 hover:border-destructive/60",
};

/** Sessions created before this sprint have no `color` — default to neutral. */
export const getSessionBlockClass = (color) => SESSION_BLOCK_CLASS[color] || SESSION_BLOCK_CLASS.neutral;
export const getSessionSwatchClass = (color) => SWATCH_CLASS[color] || SWATCH_CLASS.neutral;
