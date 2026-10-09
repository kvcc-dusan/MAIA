/**
 * Session colour value -> semantic token. The names in lib/sessionColors.js
 * ("intel", "info", "destructive") are legacy; they map onto Arc's roles here.
 */
export const SESSION_COLOR_VARS = {
  neutral: "var(--text-secondary)",
  intel: "var(--series-2)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--series-1)",
  destructive: "var(--danger)",
};
