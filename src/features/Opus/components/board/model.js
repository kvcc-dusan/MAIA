// Pure board logic: columns, filters, due dates, labels. No React.
import { sortColumn } from "./order.js";
import { formatEstimate } from "../../kit/estimates.js";

export { workstreamColor } from "../../kit/format.js";
export { ESTIMATE_OPTIONS, estimateOptionsFor, formatEstimate } from "../../kit/estimates.js";

export const STATUS_ORDER = ["todo", "doing", "blocked", "done"];
export const STATUS_LABELS = { todo: "To do", doing: "In progress", blocked: "Blocked", done: "Done" };
export const DONE_LIMIT = 20;
export const WIP_LIMIT = 5;
export const SCHEDULE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "soon", label: "Soon" },
  { value: "future", label: "Future" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");

export const filterTasks = (tasks, { workstreamIds = [], owner = "" } = {}) =>
  tasks.filter((t) => (workstreamIds.length === 0 || workstreamIds.includes(t.workstreamId)) && (!owner || t.owner === owner));

/** Newest doneAt first; falls back to createdAt. */
const byRecentlyDone = (a, b) => {
  const ka = a.doneAt ?? a.createdAt ?? "";
  const kb = b.doneAt ?? b.createdAt ?? "";
  return ka < kb ? 1 : ka > kb ? -1 : 0;
};

/**
 * One entry per status: the sorted tasks, how many exist, how many are hidden
 * (only Done hides, past `doneLimit` most recently done).
 */
export const buildColumns = (tasks, { showAllDone = false, doneLimit = DONE_LIMIT } = {}) =>
  Object.fromEntries(STATUS_ORDER.map((status) => {
    const all = tasks.filter((t) => t.status === status);
    const limited = status === "done" && !showAllDone && all.length > doneLimit;
    const shown = limited ? [...all].sort(byRecentlyDone).slice(0, doneLimit) : all;
    return [status, { tasks: sortColumn(shown), total: all.length, hidden: all.length - shown.length }];
  }));

/** Local calendar day of any due value. A bare YYYY-MM-DD is read as local, not UTC. */
export const localDay = (value) => {
  if (!value) return null;
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const d = bare ? new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDay = (day) => {
  const [, m, d] = day.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

/** `today` is a YYYY-MM-DD string. Done tasks are never overdue. */
export const dueInfo = (task, today) => {
  const day = localDay(task.due);
  if (!day) return null;
  return { label: formatDay(day), isOverdue: task.status !== "done" && day < today };
};

export const cardLabel = ({ task, statusLabel, due, workstreamName, showOwner = false }) => [
  task.title || "Untitled task",
  statusLabel,
  due ? (due.isOverdue ? `overdue since ${due.label}` : `due ${due.label}`) : null,
  workstreamName ? `workstream ${workstreamName}` : null,
  formatEstimate(task.estimate) ? `estimate ${formatEstimate(task.estimate)}` : null,
  task.priority === "p1" ? "high priority" : task.priority === "p2" ? "medium priority" : null,
  showOwner && task.owner ? `owner ${task.owner}` : null,
  task.isNextAction ? "next action" : null,
].filter(Boolean).join(", ");

export const wsFromParams = (params) => {
  const ws = params?.ws;
  if (Array.isArray(ws)) return ws.filter(Boolean);
  return ws ? [ws] : [];
};
