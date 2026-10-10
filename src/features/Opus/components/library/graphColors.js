// The mini-graph draws in SVG attributes, so colors arrive as JS strings from
// lib/tokens.js. Call this again after a theme change: tokens.js drops its cache
// on the same event, and the scene re-reads through here.
import { cssVar, resolveColor } from "@/lib/tokens.js";

const read = (name) => resolveColor(cssVar(name));

export const readGraphColors = () => ({
  project: read("--series-1"),
  note: read("--text-secondary"),
  noteActive: read("--foreground"),
  link: read("--border-strong"),
  linkActive: read("--text-secondary"),
  linkMuted: read("--border-subtle"),
  dot: read("--border"),
  label: read("--foreground"),
  labelHalo: read("--surface"),
});
