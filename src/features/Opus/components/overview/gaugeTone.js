// Tone and caption for a workstream gauge. Color is never the only signal: the
// caption names overdue and blocked counts.
import { plural } from "./dates.js";

/** danger if anything is blocked, warning if anything is overdue, success when complete. */
export const gaugeTone = ({ blocked = 0, overdue = 0, pct = 0 }) => {
  if (blocked > 0) return "danger";
  if (overdue > 0) return "warning";
  return pct === 100 ? "success" : "accent";
};

/** "4 of 9 done, 1 overdue, 2 blocked" */
export const gaugeDetail = ({ done = 0, total = 0, overdue = 0, blocked = 0 }) => {
  if (!total) return "No tasks yet";
  const parts = [`${done} of ${total} done`];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (blocked > 0) parts.push(`${blocked} blocked`);
  return parts.join(", ");
};

export const gaugeLabel = (progress) =>
  `${progress.name}: ${plural(progress.total, "task")}, ${progress.pct}% done`;
