// Pure board logic: columns, filters, due dates, labels. No React.
import { sortColumn } from "./order.js";

export const STATUS_ORDER = ["todo", "doing", "blocked", "done"];
export const STATUS_LABELS = { todo: "To do", doing: "In progress", blocked: "Blocked", done: "Done" };
export const DONE_LIMIT = 20;
export const WIP_LIMIT = 5;
export const ALL_WORKSTREAMS = "__all__";
export const SCHEDULE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "soon", label: "Soon" },
  { value: "future", label: "Future" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");

/** Workstream color '1' to '4' is a chart series token; anything else is muted. */
export const workstreamColor = (ws) => (/^[1-4]$/.test(String(ws?.color)) ? `var(--series-${ws.color})` : "var(--text-muted)");

export const matchesQuery = (task, query) => {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return `${task.title ?? ""} ${task.desc ?? ""}`.toLowerCase().includes(q);
};

export const filterTasks = (tasks, { workstreamIds = [], owner = "", query = "" } = {}) =>
  tasks.filter((t) => (workstreamIds.length === 0 || workstreamIds.includes(t.workstreamId)) && (!owner || t.owner === owner) && matchesQuery(t, query));

/** Newest doneAt first; falls back to createdAt. */
const byRecentlyDone = (a, b) => {
  const ka = a.doneAt ?? a.createdAt ?? "";
  const kb = b.doneAt ?? b.createdAt ?? "";
  return ka < kb ? 1 : ka > kb ? -1 : 0;
};

/**
 * One entry per status: the sorted tasks, how many exist, how many are hidden
 * (only Done hides, past `doneLimit` most recently done) and size counts.
 */
export const buildColumns = (tasks, { showAllDone = false, doneLimit = DONE_LIMIT } = {}) =>
  Object.fromEntries(STATUS_ORDER.map((status) => {
    const all = tasks.filter((t) => t.status === status);
    const limited = status === "done" && !showAllDone && all.length > doneLimit;
    const shown = limited ? [...all].sort(byRecentlyDone).slice(0, doneLimit) : all;
    return [status, { tasks: sortColumn(shown), total: all.length, hidden: all.length - shown.length, sizes: sizeCounts(all) }];
  }));

export const ESTIMATE_OPTIONS = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
];

/** A stored estimate outside S/M/L stays selectable instead of vanishing. */
export const estimateOptionsFor = (estimate) => {
  if (estimate == null || estimate === "") return ESTIMATE_OPTIONS;
  return ESTIMATE_OPTIONS.some((o) => o.value === String(estimate))
    ? ESTIMATE_OPTIONS
    : [...ESTIMATE_OPTIONS, { value: String(estimate), label: String(estimate) }];
};

export const formatEstimate = (e) => (e == null || e === "" ? null : String(e));

/** "2 L, 3 M": how many tasks carry each size, largest first. Null when none do. */
export const sizeCounts = (tasks) => {
  const counts = new Map();
  tasks.forEach((t) => { const e = formatEstimate(t.estimate); if (e) counts.set(e, (counts.get(e) ?? 0) + 1); });
  if (counts.size === 0) return null;
  const rank = (k) => ["L", "M", "S"].indexOf(k) === -1 ? 9 : ["L", "M", "S"].indexOf(k);
  return [...counts].sort((a, b) => rank(a[0]) - rank(b[0])).map(([k, n]) => `${n} ${k}`).join(", ");
};

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

/** Chip values shown for the filter: "All workstreams" stands in for an empty selection. */
export const selectionToChips = (selected) => (selected.length ? selected : [ALL_WORKSTREAMS]);

export const nextWorkstreamSelection = (prevSelected, nextChips) => {
  if (nextChips.includes(ALL_WORKSTREAMS) && prevSelected.length === 0 && nextChips.length > 1) {
    return nextChips.filter((v) => v !== ALL_WORKSTREAMS);
  }
  if (nextChips.includes(ALL_WORKSTREAMS) && prevSelected.length > 0) return [];
  return nextChips.filter((v) => v !== ALL_WORKSTREAMS);
};

export const wsFromParams = (params) => {
  const ws = params?.ws;
  if (Array.isArray(ws)) return ws.filter(Boolean);
  return ws ? [ws] : [];
};
