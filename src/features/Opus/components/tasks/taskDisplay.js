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

// Estimates and workstream colours live in kit/ (one copy); re-exported so existing imports keep working.
export { ESTIMATE_OPTIONS, estimateOptionsFor } from "../../kit/estimates.js";
export { workstreamColor } from "../../kit/format.js";
