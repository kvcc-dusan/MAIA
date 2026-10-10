// Pure filter state, filtering, sorting and grouping for the Tasks tab, after
// the hub's plain filterable list. No React. `today` is "YYYY-MM-DD".
import { day, weekStart } from "../../lib/metrics.js";
import { workstreamColor } from "./taskDisplay.js";

export const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "blocked", label: "Blocked" },
  { value: "overdue", label: "Overdue" },
  { value: "done-week", label: "Done this week" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];
const CHIP_VALUES = STATUS_FILTERS.map((o) => o.value);

// Reachable only through navigate(): the hub shows them as a removable chip.
export const EXACT_STATUSES = { todo: "To do", doing: "In progress" };

export const GROUP_OPTIONS = [
  { value: "workstream", label: "Workstream" },
  { value: "milestone", label: "Milestone" },
  { value: "none", label: "None" },
];
const GROUP_VALUES = GROUP_OPTIONS.map((o) => o.value);

export const SORT_OPTIONS = [
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title" },
];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

export const initialFilters = {
  status: "open",
  workstreamId: "",
  milestoneId: "",
  owner: "",
  query: "",
  sort: "due",
  groupBy: "workstream",
};

/* filter state */

const asId = (v) => (typeof v === "string" ? v : "");
const asStatus = (v) => (CHIP_VALUES.includes(v) || v in EXACT_STATUSES ? v : initialFilters.status);

/** Seeds filters from a navigate() payload: { status, ws, milestone, owner }. An unknown status means Open. */
export const filtersFromParams = (params = {}, keep = {}) => ({
  ...initialFilters,
  sort: keep.sort ?? initialFilters.sort,
  groupBy: keep.groupBy ?? initialFilters.groupBy,
  status: asStatus(params?.status),
  workstreamId: asId(params?.ws),
  milestoneId: asId(params?.milestone),
  owner: asId(params?.owner),
});

/** Anything beyond the status chips and the sort: what "Clear filters" resets. */
export const hasExtraFilters = (f) => !!(f.workstreamId || f.milestoneId || f.owner || f.query.trim());

/**
 * Actions: status, workstream, milestone, owner, query, sort, groupBy,
 * clear (workstream, milestone, owner and search; status and layout stay),
 * params (re-seed from a navigate payload; sort and grouping stay).
 */
export const filtersReducer = (state, action) => {
  switch (action.type) {
    case "status":
      return { ...state, status: asStatus(action.value) };
    case "workstream":
      return { ...state, workstreamId: action.value ?? "" };
    case "milestone":
      return { ...state, milestoneId: action.value ?? "" };
    case "owner":
      return { ...state, owner: action.value ?? "" };
    case "query":
      return { ...state, query: action.value ?? "" };
    case "sort":
      return SORT_VALUES.includes(action.value) ? { ...state, sort: action.value } : state;
    case "groupBy":
      return GROUP_VALUES.includes(action.value) ? { ...state, groupBy: action.value } : state;
    case "clear":
      return { ...state, workstreamId: "", milestoneId: "", owner: "", query: "" };
    case "params":
      return filtersFromParams(action.params, state);
    default:
      return state;
  }
};

/** Drops a workstream, milestone or owner that no longer exists, so a deleted one cannot silently empty the list. */
export const sanitizeFilters = (filters, { workstreams = [], milestones = [], owners = [] } = {}) => {
  const workstreamOk = !filters.workstreamId || workstreams.some((w) => w.id === filters.workstreamId);
  const milestoneOk = !filters.milestoneId || milestones.some((m) => m.id === filters.milestoneId);
  const ownerOk = !filters.owner || owners.includes(filters.owner);
  if (workstreamOk && milestoneOk && ownerOk) return filters;
  return {
    ...filters,
    workstreamId: workstreamOk ? filters.workstreamId : "",
    milestoneId: milestoneOk ? filters.milestoneId : "",
    owner: ownerOk ? filters.owner : "",
  };
};

/* filtering */

export const isDone = (task) => task.status === "done" || task.done === true;

export const isOverdue = (task, today) => !isDone(task) && !!day(task.due) && day(task.due) < today;

const matchesStatus = (task, status, today) => {
  switch (status) {
    case "open": return !isDone(task);
    case "blocked": return task.status === "blocked";
    case "overdue": return isOverdue(task, today);
    case "done-week": return isDone(task) && !!task.doneAt && day(task.doneAt) >= weekStart(today);
    case "done": return isDone(task);
    case "all": return true;
    default: return task.status === status;
  }
};

const matchesQuery = (task, query) =>
  !query || `${task.title ?? ""} ${task.desc ?? ""}`.toLowerCase().includes(query);

/** Keeps the incoming order; sortTasks orders what remains. */
export const filterTasks = (tasks, filters, today) => {
  const query = filters.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      matchesStatus(t, filters.status, today) &&
      (!filters.workstreamId || t.workstreamId === filters.workstreamId) &&
      (!filters.milestoneId || t.milestoneId === filters.milestoneId) &&
      (!filters.owner || t.owner === filters.owner) &&
      matchesQuery(t, query)
  );
};

/* sorting */

const PRIORITY_RANK = { p1: 0, p2: 1, p3: 2 };
const rankOf = (t) => PRIORITY_RANK[t.priority] ?? 2;
const byTitle = (a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""));
const byDue = (a, b) => (day(a.due) || "9").localeCompare(day(b.due) || "9");
const byPriority = (a, b) => rankOf(a) - rankOf(b);
const touchedAt = (t) => t.updatedAt ?? t.doneAt ?? t.startedAt ?? t.createdAt ?? "";

const COMPARATORS = {
  title: byTitle,
  updated: (a, b) => touchedAt(b).localeCompare(touchedAt(a)) || byTitle(a, b),
  priority: (a, b) => byPriority(a, b) || byDue(a, b) || byTitle(a, b),
  due: (a, b) => byDue(a, b) || byPriority(a, b) || byTitle(a, b),
};

export const sortTasks = (list, sort = "due") => [...list].sort(COMPARATORS[sort] ?? COMPARATORS.due);

/* grouping */

const doneCount = (list) => list.filter(isDone).length;

const withProgress = (group, members) => ({ ...group, total: members.length, done: doneCount(members) });

/**
 * Splits already-filtered tasks into display groups, sorted, empty ones left
 * out. Each group: { key, label, color, tasks, total, done }. `total` and
 * `done` count the group in `allTasks` (unfiltered), so a filter does not
 * distort "10 of 14 done".
 */
export const groupTasks = (tasks, groupBy, { workstreams = [], milestones = [], allTasks = tasks, sort = "due" } = {}) => {
  if (groupBy === "none") {
    if (tasks.length === 0) return [];
    return [{ key: "all", label: "All tasks", color: null, tasks: sortTasks(tasks, sort), total: allTasks.length, done: doneCount(allTasks) }];
  }
  const isWorkstream = groupBy === "workstream";
  const field = isWorkstream ? "workstreamId" : "milestoneId";
  const definitions = isWorkstream
    ? [...workstreams]
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
        .map((w) => ({ key: w.id, label: w.name, color: workstreamColor(w) }))
    : [...milestones]
        .sort((a, b) => (day(a.date) || "9").localeCompare(day(b.date) || "9"))
        .map((m) => ({ key: m.id, label: m.title, color: null }));
  const known = new Set(definitions.map((d) => d.key));
  const groups = definitions.map((d) =>
    withProgress({ ...d, tasks: sortTasks(tasks.filter((t) => t[field] === d.key), sort) }, allTasks.filter((t) => t[field] === d.key))
  );
  const loose = tasks.filter((t) => !known.has(t[field]));
  if (loose.length) {
    groups.push(
      withProgress(
        { key: "none", label: isWorkstream ? "No workstream" : "No milestone", color: null, tasks: sortTasks(loose, sort) },
        allTasks.filter((t) => !known.has(t[field]))
      )
    );
  }
  return groups.filter((g) => g.tasks.length > 0);
};

/** Hub copy for an empty list under the status chips alone. */
export const EMPTY_COPY = {
  open: ["No open tasks", "Everything is done, or nothing has been added yet."],
  blocked: ["Nothing is blocked", "No task is currently marked as blocked."],
  overdue: ["No overdue tasks", "Every open task is on time or has no due date."],
  "done-week": ["Nothing finished this week", "Tasks marked done since Monday show up here."],
  done: ["No finished tasks yet", "Completed tasks show up here."],
  todo: ["No tasks to do", "Nothing is waiting to start."],
  doing: ["Nothing in progress", "No task is currently being worked on."],
  all: ["No tasks", "Nothing has been added yet."],
};
