// Labels, tones and small formatters shared by the Tasks tab pieces. Pure.
import { TASK_PRIORITIES } from "../../../../lib/constants.js";
import { statusLabel as kitStatusLabel } from "../../kit/format.js";

// Composer and edit selects are narrow inline controls: "High" fits,
// "High priority" does not.
export const PRIORITY_OPTIONS_SHORT = TASK_PRIORITIES.map((p) => ({
  ...p,
  label: p.label.replace(" priority", ""),
}));

// Labels come from the kit (one copy); unknown statuses read as "To do", like a new task.
export const STATUS_OPTIONS = ["todo", "doing", "blocked", "done"].map((value) => ({ value, label: kitStatusLabel(value) }));

export const statusLabel = (status) => kitStatusLabel(status) || kitStatusLabel("todo");

export const PRIORITY_LABEL = { p1: "High priority", p2: "Medium priority", p3: "Normal priority" };

// Estimates and workstream colours live in kit/ (one copy); re-exported so existing imports keep working.
export { ESTIMATE_OPTIONS, estimateOptionsFor } from "../../kit/estimates.js";
export { workstreamColor } from "../../kit/format.js";
