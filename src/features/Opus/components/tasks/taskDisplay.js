// Labels, tones and small formatters shared by the Tasks tab pieces. Pure.
import { TASK_PRIORITIES } from "../../../../lib/constants.js";

// Composer and edit selects are narrow inline controls: "High" fits,
// "High priority" does not.
export const PRIORITY_OPTIONS_SHORT = TASK_PRIORITIES.map((p) => ({
  ...p,
  label: p.label.replace(" priority", ""),
}));

export const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

// StatusDot tones. The dot never stands alone: the label always sits next to it.

export const statusLabel = (status) =>
  STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "To do";

export const PRIORITY_LABEL = { p1: "High priority", p2: "Medium priority", p3: "Normal priority" };

// T-shirt sizes, as the sample data and the Board cards use them.
export const ESTIMATE_OPTIONS = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
];

/** A stored estimate outside S/M/L (a number from an import) stays selectable instead of vanishing. */
export const estimateOptionsFor = (estimate) => {
  if (estimate == null || estimate === "") return ESTIMATE_OPTIONS;
  const known = ESTIMATE_OPTIONS.some((o) => o.value === String(estimate));
  return known ? ESTIMATE_OPTIONS : [...ESTIMATE_OPTIONS, { value: String(estimate), label: String(estimate) }];
};

const SERIES = /^[1-4]$/;

/** Workstream colors are stored as "1" to "4", meaning var(--series-N). */
export const workstreamColor = (workstream) =>
  workstream && SERIES.test(String(workstream.color)) ? `var(--series-${workstream.color})` : "var(--text-muted)";
