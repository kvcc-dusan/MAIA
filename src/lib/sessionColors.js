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
