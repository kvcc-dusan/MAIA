/**
 * Session colour value -> token. The names in lib/sessionColors.js ("intel", "info", "destructive") are legacy
 * and stay as the stored ids. They map onto Arc's accent hues (styles/accent-hues.css), the same palette as
 * project icons: a session's colour is a label, and kvcc-arc keeps the status colours for real status.
 */
export const SESSION_COLOR_VARS = {
  neutral: "var(--text-secondary)",
  intel: "var(--hue-violet)",
  success: "var(--hue-green)",
  warning: "var(--hue-amber)",
  info: "var(--hue-blue)",
  destructive: "var(--hue-coral)",
};
