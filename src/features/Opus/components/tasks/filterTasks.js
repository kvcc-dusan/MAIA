// Pure filter state, filtering and grouping for the Tasks tab. No React.
// `today` is always passed in as "YYYY-MM-DD" (metrics.toDayString builds it).
import { day } from "../../lib/metrics.js";
import { workstreamColor } from "./taskDisplay.js";

/** Filter value meaning "tasks with no workstream / no milestone". */
export const UNASSIGNED = "__none__";

// One row of chips. Statuses are the task's own; "overdue" is a date
// condition on an open task. A task matches when it fits ANY selected chip.
export const STATUS_FILTERS = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Overdue" },
];
const STATUS_FILTER_VALUES = STATUS_FILTERS.map((o) => o.value);

export const GROUP_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "workstream", label: "Workstream" },
  { value: "milestone", label: "Milestone" },
  { value: "none", label: "None" },
];
const GROUP_VALUES = GROUP_OPTIONS.map((o) => o.value);

export const initialFilters = {
  statuses: [],
  workstreamId: "",
  milestoneId: "",
  query: "",
  groupBy: "status",
};

/* filter state */

const canonicalStatuses = (list) => STATUS_FILTER_VALUES.filter((v) => list.includes(v));
const asList = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const asId = (v) => (typeof v === "string" ? v : "");

/** Seeds filters from a navigate() payload: { status, ws, milestone }. Unknown statuses are dropped. */
export const filtersFromParams = (params = {}, groupBy = initialFilters.groupBy) => ({
  ...initialFilters,
  groupBy,
  statuses: canonicalStatuses(asList(params?.status)),
  workstreamId: asId(params?.ws),
  milestoneId: asId(params?.milestone),
});

export const hasActiveFilters = (filters) =>
  filters.statuses.length > 0 || !!filters.workstreamId || !!filters.milestoneId || filters.query.trim() !== "";

/**
 * Actions: statuses, workstream, milestone, query, groupBy, remove (a chip id
 * from activeFilterChips), clear (filters only, grouping stays), params.
 */
export const filtersReducer = (state, action) => {
  switch (action.type) {
    case "statuses":
      return { ...state, statuses: canonicalStatuses(asList(action.value)) };
    case "workstream":
      return { ...state, workstreamId: action.value ?? "" };
    case "milestone":
      return { ...state, milestoneId: action.value ?? "" };
    case "query":
      return { ...state, query: action.value ?? "" };
    case "groupBy":
      return GROUP_VALUES.includes(action.value) ? { ...state, groupBy: action.value } : state;
    case "remove": {
      if (action.id.startsWith("status:")) {
        const status = action.id.slice("status:".length);
        return { ...state, statuses: state.statuses.filter((s) => s !== status) };
      }
      if (action.id === "workstream") return { ...state, workstreamId: "" };
      if (action.id === "milestone") return { ...state, milestoneId: "" };
      if (action.id === "query") return { ...state, query: "" };
      return state;
    }
    case "clear":
      return { ...initialFilters, groupBy: state.groupBy };
    case "params":
      return filtersFromParams(action.params, state.groupBy);
    default:
      return state;
  }
};

const knownOrUnassigned = (id, list) => id === "" || id === UNASSIGNED || list.some((x) => x.id === id);

/** Drops a workstream or milestone id that no longer exists, so a deleted one cannot silently empty the list. */
export const sanitizeFilters = (filters, { workstreams = [], milestones = [] } = {}) => {
  const workstreamOk = knownOrUnassigned(filters.workstreamId, workstreams);
  const milestoneOk = knownOrUnassigned(filters.milestoneId, milestones);
  if (workstreamOk && milestoneOk) return filters;
  return {
    ...filters,
    workstreamId: workstreamOk ? filters.workstreamId : "",
    milestoneId: milestoneOk ? filters.milestoneId : "",
  };
};

/** Chips for FilterToolbar: one per active condition. */
export const activeFilterChips = (filters, { workstreams = [], milestones = [] } = {}) => {
  const chips = filters.statuses.map((status) => ({
    id: `status:${status}`,
    label: "Status",
    value: STATUS_FILTERS.find((o) => o.value === status)?.label ?? status,
  }));
  if (filters.workstreamId) {
    const name = filters.workstreamId === UNASSIGNED
      ? "None"
      : workstreams.find((w) => w.id === filters.workstreamId)?.name;
    if (name) chips.push({ id: "workstream", label: "Workstream", value: name });
  }
  if (filters.milestoneId) {
    const name = filters.milestoneId === UNASSIGNED
      ? "None"
      : milestones.find((m) => m.id === filters.milestoneId)?.title;
    if (name) chips.push({ id: "milestone", label: "Milestone", value: name });
  }
  if (filters.query.trim()) chips.push({ id: "query", label: "Search", value: filters.query.trim() });
  return chips;
};

/* filtering */

export const isDone = (task) => task.status === "done" || task.done === true;

export const isOverdue = (task, today) => !isDone(task) && !!day(task.due) && day(task.due) < today;

const matchesStatus = (task, statuses, today) =>
  statuses.length === 0 ||
  statuses.some((s) => (s === "overdue" ? isOverdue(task, today) : task.status === s));

const matchesLink = (taskValue, filterValue) => {
  if (!filterValue) return true;
  return filterValue === UNASSIGNED ? !taskValue : taskValue === filterValue;
};

const matchesQuery = (task, query) => {
  if (!query) return true;
  return `${task.title ?? ""} ${task.desc ?? ""}`.toLowerCase().includes(query);
};

/** Keeps the incoming order; sorting belongs to groupTasks. */
export const filterTasks = (tasks, filters, today) => {
  const query = filters.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      matchesStatus(t, filters.statuses, today) &&
      matchesLink(t.workstreamId, filters.workstreamId) &&
      matchesLink(t.milestoneId, filters.milestoneId) &&
      matchesQuery(t, query)
  );
};

/** Open / blocked / overdue counts for the tab's summary line. */
export const summarizeTasks = (tasks, today) => ({
  open: tasks.filter((t) => !isDone(t)).length,
  blocked: tasks.filter((t) => !isDone(t) && t.status === "blocked").length,
  overdue: tasks.filter((t) => isOverdue(t, today)).length,
});

/* ordering and grouping */

const SCHED_ORDER = { today: 0, soon: 1, future: 2 };
const PRIORITY_ORDER = { p1: 0, p2: 1, p3: 2 };
const timeOf = (iso) => Date.parse(iso) || 0;

// One comparator for every group: schedule bucket, then priority, then
// creation order.
export const sortTasks = (list) =>
  [...list].sort((a, b) => {
    const bySchedule = (SCHED_ORDER[a.schedule] ?? 0) - (SCHED_ORDER[b.schedule] ?? 0);
    if (bySchedule !== 0) return bySchedule;
    const byPriority = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (byPriority !== 0) return byPriority;
    return timeOf(a.createdAt) - timeOf(b.createdAt);
  });

// Open work first inside a workstream or milestone, finished work after it.
const sortOpenFirst = (list) => [...sortTasks(list.filter((t) => !isDone(t))), ...sortTasks(list.filter(isDone))];

const isSoon = (t) => t.schedule === "soon";
const isFuture = (t) => t.schedule === "future";
// Anything that is not soon or future counts as today, so no task falls out of the bands.
const STATUS_BANDS = [
  { key: "today", label: "Today", defaultOpen: true, has: (t) => !isDone(t) && t.status !== "blocked" && !isSoon(t) && !isFuture(t) },
  { key: "soon", label: "Soon", defaultOpen: true, has: (t) => !isDone(t) && t.status !== "blocked" && isSoon(t) },
  { key: "future", label: "Future", defaultOpen: false, has: (t) => !isDone(t) && t.status !== "blocked" && isFuture(t) },
  { key: "blocked", label: "Blocked", defaultOpen: true, has: (t) => !isDone(t) && t.status === "blocked" },
  { key: "done", label: "Done", defaultOpen: false, has: isDone },
];

const progressOf = (members) => ({
  total: members.length,
  done: members.filter(isDone).length,
});

const byRank = (rank) => (a, b) => rank(a) - rank(b);

const linkGroups = ({ tasks, allTasks, definitions, field, fallbackLabel }) => {
  const known = new Set(definitions.map((d) => d.key));
  const groups = definitions.map((d) => {
    const members = tasks.filter((t) => t[field] === d.key);
    return { ...d, tasks: sortOpenFirst(members), defaultOpen: true, ...progressOf(allTasks.filter((t) => t[field] === d.key)) };
  });
  const loose = tasks.filter((t) => !known.has(t[field]));
  if (loose.length) {
    groups.push({
      key: UNASSIGNED,
      label: fallbackLabel,
      color: null,
      date: null,
      tasks: sortOpenFirst(loose),
      defaultOpen: true,
      ...progressOf(allTasks.filter((t) => !known.has(t[field]))),
    });
  }
  return groups.filter((g) => g.tasks.length > 0);
};

/**
 * Splits already-filtered tasks into display groups. Empty groups are left out.
 * Each group: { key, label, color, date, tasks, defaultOpen, total, done }.
 * `total` and `done` count the group in `allTasks` (unfiltered), so a filter
 * does not distort the progress; they are null for the status bands, where
 * "x of y done" means nothing.
 */
export const groupTasks = (tasks, groupBy, { workstreams = [], milestones = [], allTasks = tasks } = {}) => {
  if (groupBy === "workstream") {
    const ordered = [...workstreams].sort(byRank((w) => w.order ?? Number.MAX_SAFE_INTEGER));
    const definitions = ordered.map((w) => ({ key: w.id, label: w.name, color: workstreamColor(w), date: null }));
    return linkGroups({ tasks, allTasks, definitions, field: "workstreamId", fallbackLabel: "No workstream" });
  }
  if (groupBy === "milestone") {
    const ordered = [...milestones].sort((a, b) => (day(a.date) || "9").localeCompare(day(b.date) || "9"));
    const definitions = ordered.map((m) => ({ key: m.id, label: m.title, color: null, date: m.date ?? null }));
    return linkGroups({ tasks, allTasks, definitions, field: "milestoneId", fallbackLabel: "No milestone" });
  }
  if (groupBy === "none") {
    if (tasks.length === 0) return [];
    return [{ key: "all", label: "All tasks", color: null, date: null, tasks: sortOpenFirst(tasks), defaultOpen: true, total: null, done: null }];
  }
  return STATUS_BANDS.map(({ key, label, defaultOpen, has }) => ({
    key,
    label,
    color: null,
    date: null,
    tasks: sortTasks(tasks.filter(has)),
    defaultOpen,
    total: null,
    done: null,
  })).filter((g) => g.tasks.length > 0);
};
