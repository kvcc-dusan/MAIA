import { describe, expect, it } from "vitest";
import {
  UNASSIGNED,
  activeFilterChips,
  filterTasks,
  filtersFromParams,
  filtersReducer,
  groupTasks,
  hasActiveFilters,
  initialFilters,
  isOverdue,
  sanitizeFilters,
  sortTasks,
  summarizeTasks,
} from "./filterTasks.js";

const TODAY = "2026-10-09";

const task = (id, over = {}) => ({
  id,
  title: `Task ${id}`,
  status: "todo",
  done: false,
  schedule: "today",
  priority: "p3",
  createdAt: "2026-10-01T10:00:00.000Z",
  due: null,
  workstreamId: null,
  milestoneId: null,
  isNextAction: false,
  ...over,
});

const ids = (list) => list.map((t) => t.id);

describe("isOverdue", () => {
  it("is true for an open task past its day", () => {
    expect(isOverdue(task("a", { due: "2026-10-08" }), TODAY)).toBe(true);
    expect(isOverdue(task("a", { due: "2026-10-08T23:30" }), TODAY)).toBe(true);
  });
  it("is false today, in the future, without a date, or when done", () => {
    expect(isOverdue(task("a", { due: TODAY }), TODAY)).toBe(false);
    expect(isOverdue(task("a", { due: "2026-10-10" }), TODAY)).toBe(false);
    expect(isOverdue(task("a"), TODAY)).toBe(false);
    expect(isOverdue(task("a", { due: "2026-10-01", status: "done", done: true }), TODAY)).toBe(false);
  });
});

describe("filterTasks", () => {
  const list = [
    task("todo-late", { due: "2026-10-01" }),
    task("doing", { status: "doing" }),
    task("blocked", { status: "blocked", due: "2026-10-02" }),
    task("done", { status: "done", done: true, due: "2026-10-01" }),
    task("ws1", { workstreamId: "w1", milestoneId: "m1", title: "Design the login", desc: "Wireframes" }),
    task("ws2", { workstreamId: "w2" }),
  ];

  it("returns everything for empty filters, in the incoming order", () => {
    expect(ids(filterTasks(list, initialFilters, TODAY))).toEqual(ids(list));
  });

  it("matches any selected status chip", () => {
    const f = { ...initialFilters, statuses: ["doing", "blocked"] };
    expect(ids(filterTasks(list, f, TODAY))).toEqual(["doing", "blocked"]);
  });

  it("treats overdue as a date condition on open tasks", () => {
    const f = { ...initialFilters, statuses: ["overdue"] };
    expect(ids(filterTasks(list, f, TODAY))).toEqual(["todo-late", "blocked"]);
  });

  it("unions overdue with a status chip", () => {
    const f = { ...initialFilters, statuses: ["done", "overdue"] };
    expect(ids(filterTasks(list, f, TODAY))).toEqual(["todo-late", "blocked", "done"]);
  });

  it("filters by workstream and milestone, and by the unassigned sentinel", () => {
    expect(ids(filterTasks(list, { ...initialFilters, workstreamId: "w1" }, TODAY))).toEqual(["ws1"]);
    expect(ids(filterTasks(list, { ...initialFilters, milestoneId: "m1" }, TODAY))).toEqual(["ws1"]);
    expect(ids(filterTasks(list, { ...initialFilters, workstreamId: UNASSIGNED }, TODAY))).toEqual([
      "todo-late", "doing", "blocked", "done",
    ]);
  });

  it("searches title and description, case-insensitively, ignoring surrounding spaces", () => {
    expect(ids(filterTasks(list, { ...initialFilters, query: "  LOGIN " }, TODAY))).toEqual(["ws1"]);
    expect(ids(filterTasks(list, { ...initialFilters, query: "wireframe" }, TODAY))).toEqual(["ws1"]);
    expect(filterTasks(list, { ...initialFilters, query: "zzz" }, TODAY)).toEqual([]);
  });

  it("combines every condition with AND", () => {
    const f = { ...initialFilters, statuses: ["todo"], workstreamId: "w1", query: "design" };
    expect(ids(filterTasks(list, f, TODAY))).toEqual(["ws1"]);
    expect(filterTasks(list, { ...f, workstreamId: "w2" }, TODAY)).toEqual([]);
  });

  it("copes with tasks that lack a title", () => {
    const odd = [{ id: "x", status: "todo" }];
    expect(filterTasks(odd, { ...initialFilters, query: "a" }, TODAY)).toEqual([]);
  });
});

describe("filtersFromParams", () => {
  it("seeds status, ws and milestone", () => {
    expect(filtersFromParams({ status: "overdue", ws: "w1", milestone: "m2" })).toEqual({
      ...initialFilters,
      statuses: ["overdue"],
      workstreamId: "w1",
      milestoneId: "m2",
    });
  });
  it("accepts a list of statuses, orders them canonically and drops unknown ones", () => {
    expect(filtersFromParams({ status: ["blocked", "nope", "todo", "blocked"] }).statuses).toEqual(["todo", "blocked"]);
  });
  it("is empty for no params", () => {
    expect(filtersFromParams({})).toEqual(initialFilters);
    expect(filtersFromParams(undefined)).toEqual(initialFilters);
  });
  it("keeps the grouping it is given", () => {
    expect(filtersFromParams({}, "workstream").groupBy).toBe("workstream");
  });
});

describe("filtersReducer", () => {
  it("sets statuses in canonical order", () => {
    const next = filtersReducer(initialFilters, { type: "statuses", value: ["overdue", "todo"] });
    expect(next.statuses).toEqual(["todo", "overdue"]);
  });
  it("sets workstream, milestone and query, and null clears them", () => {
    let s = filtersReducer(initialFilters, { type: "workstream", value: "w1" });
    s = filtersReducer(s, { type: "milestone", value: "m1" });
    s = filtersReducer(s, { type: "query", value: "abc" });
    expect(s).toMatchObject({ workstreamId: "w1", milestoneId: "m1", query: "abc" });
    s = filtersReducer(s, { type: "workstream", value: null });
    expect(s.workstreamId).toBe("");
  });
  it("ignores an unknown grouping", () => {
    expect(filtersReducer(initialFilters, { type: "groupBy", value: "owner" })).toBe(initialFilters);
    expect(filtersReducer(initialFilters, { type: "groupBy", value: "none" }).groupBy).toBe("none");
  });
  it("removes one chip by id", () => {
    const start = { ...initialFilters, statuses: ["todo", "blocked"], workstreamId: "w1", milestoneId: "m1", query: "q" };
    expect(filtersReducer(start, { type: "remove", id: "status:todo" }).statuses).toEqual(["blocked"]);
    expect(filtersReducer(start, { type: "remove", id: "workstream" }).workstreamId).toBe("");
    expect(filtersReducer(start, { type: "remove", id: "milestone" }).milestoneId).toBe("");
    expect(filtersReducer(start, { type: "remove", id: "query" }).query).toBe("");
    expect(filtersReducer(start, { type: "remove", id: "other" })).toBe(start);
  });
  it("clear resets filters but keeps the grouping", () => {
    const start = { ...initialFilters, statuses: ["todo"], query: "q", groupBy: "milestone" };
    expect(filtersReducer(start, { type: "clear" })).toEqual({ ...initialFilters, groupBy: "milestone" });
  });
  it("params replaces the filters (search included) and keeps the grouping", () => {
    const start = { ...initialFilters, statuses: ["todo"], query: "q", groupBy: "none" };
    expect(filtersReducer(start, { type: "params", params: { status: "blocked" } })).toEqual({
      ...initialFilters,
      statuses: ["blocked"],
      groupBy: "none",
    });
  });
  it("never mutates the previous state", () => {
    const start = Object.freeze({ ...initialFilters, statuses: Object.freeze(["todo"]) });
    expect(() => filtersReducer(start, { type: "statuses", value: ["doing"] })).not.toThrow();
    expect(start.statuses).toEqual(["todo"]);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the initial state and for a blank search", () => {
    expect(hasActiveFilters(initialFilters)).toBe(false);
    expect(hasActiveFilters({ ...initialFilters, query: "   " })).toBe(false);
  });
  it("is true for any condition, but not for grouping", () => {
    expect(hasActiveFilters({ ...initialFilters, statuses: ["todo"] })).toBe(true);
    expect(hasActiveFilters({ ...initialFilters, workstreamId: "w1" })).toBe(true);
    expect(hasActiveFilters({ ...initialFilters, groupBy: "none" })).toBe(false);
  });
});

describe("sanitizeFilters", () => {
  const ctx = { workstreams: [{ id: "w1" }], milestones: [{ id: "m1" }] };
  it("keeps known ids and the unassigned sentinel, returning the same object", () => {
    const f = { ...initialFilters, workstreamId: "w1", milestoneId: UNASSIGNED };
    expect(sanitizeFilters(f, ctx)).toBe(f);
  });
  it("drops ids that no longer exist", () => {
    const f = { ...initialFilters, workstreamId: "gone", milestoneId: "m1" };
    expect(sanitizeFilters(f, ctx)).toEqual({ ...initialFilters, workstreamId: "", milestoneId: "m1" });
  });
});

describe("activeFilterChips", () => {
  const ctx = { workstreams: [{ id: "w1", name: "Design" }], milestones: [{ id: "m1", title: "Beta" }] };
  it("has no chips for empty filters", () => {
    expect(activeFilterChips(initialFilters, ctx)).toEqual([]);
  });
  it("describes every active condition", () => {
    const f = { ...initialFilters, statuses: ["blocked", "overdue"], workstreamId: "w1", milestoneId: "m1", query: " login " };
    expect(activeFilterChips(f, ctx)).toEqual([
      { id: "status:blocked", label: "Status", value: "Blocked" },
      { id: "status:overdue", label: "Status", value: "Overdue" },
      { id: "workstream", label: "Workstream", value: "Design" },
      { id: "milestone", label: "Milestone", value: "Beta" },
      { id: "query", label: "Search", value: "login" },
    ]);
  });
  it("names the unassigned choice", () => {
    const f = { ...initialFilters, workstreamId: UNASSIGNED };
    expect(activeFilterChips(f, ctx)).toEqual([{ id: "workstream", label: "Workstream", value: "None" }]);
  });
});

describe("summarizeTasks", () => {
  it("counts open, blocked and overdue tasks", () => {
    const list = [
      task("a"),
      task("b", { status: "blocked", due: "2026-10-01" }),
      task("c", { status: "done", done: true, due: "2026-10-01" }),
      task("d", { status: "doing", due: "2026-10-05" }),
    ];
    expect(summarizeTasks(list, TODAY)).toEqual({ open: 3, blocked: 1, overdue: 2 });
  });
});

describe("sortTasks", () => {
  it("orders by schedule, then priority p1 to p3, then creation", () => {
    const list = [
      task("future", { schedule: "future", priority: "p1" }),
      task("today-p3-new", { createdAt: "2026-10-05T00:00:00.000Z" }),
      task("today-p3-old", { createdAt: "2026-10-02T00:00:00.000Z" }),
      task("today-p1", { priority: "p1" }),
      task("soon-p2", { schedule: "soon", priority: "p2" }),
      task("today-p2", { priority: "p2" }),
    ];
    expect(ids(sortTasks(list))).toEqual([
      "today-p1", "today-p2", "today-p3-old", "today-p3-new", "soon-p2", "future",
    ]);
  });
  it("does not mutate its input and tolerates a missing createdAt", () => {
    const list = [task("b", { createdAt: undefined }), task("a")];
    const copy = [...list];
    expect(() => sortTasks(list)).not.toThrow();
    expect(list).toEqual(copy);
  });
});

describe("groupTasks by status", () => {
  const list = [
    task("today"),
    task("today-no-schedule", { schedule: undefined }),
    task("odd-schedule", { schedule: "someday" }),
    task("soon", { schedule: "soon" }),
    task("future", { schedule: "future" }),
    task("blocked", { status: "blocked", schedule: "soon" }),
    task("doing-today", { status: "doing" }),
    task("done", { status: "done", done: true, schedule: "future" }),
  ];

  it("keeps the Today, Soon, Future, Blocked, Done bands in order", () => {
    const groups = groupTasks(list, "status");
    expect(groups.map((g) => g.key)).toEqual(["today", "soon", "future", "blocked", "done"]);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Soon", "Future", "Blocked", "Done"]);
  });

  it("places every task in exactly one band", () => {
    const groups = groupTasks(list, "status");
    const all = groups.flatMap((g) => ids(g.tasks));
    expect(all.sort()).toEqual(ids(list).sort());
    expect(ids(groups[0].tasks)).toEqual(
      expect.arrayContaining(["today", "today-no-schedule", "odd-schedule", "doing-today"])
    );
    expect(ids(groups[3].tasks)).toEqual(["blocked"]);
    expect(ids(groups[4].tasks)).toEqual(["done"]);
  });

  it("opens Today, Soon and Blocked by default, and folds Future and Done", () => {
    const open = Object.fromEntries(groupTasks(list, "status").map((g) => [g.key, g.defaultOpen]));
    expect(open).toEqual({ today: true, soon: true, future: false, blocked: true, done: false });
  });

  it("leaves out empty bands and carries no progress", () => {
    const groups = groupTasks([task("a")], "status");
    expect(groups.map((g) => g.key)).toEqual(["today"]);
    expect(groups[0]).toMatchObject({ total: null, done: null });
  });

  it("sorts inside a band by priority", () => {
    const groups = groupTasks([task("low"), task("high", { priority: "p1" })], "status");
    expect(ids(groups[0].tasks)).toEqual(["high", "low"]);
  });

  it("returns nothing for no tasks", () => {
    expect(groupTasks([], "status")).toEqual([]);
  });
});

describe("groupTasks by workstream", () => {
  const workstreams = [
    { id: "w2", name: "Build", color: "2", order: 1 },
    { id: "w1", name: "Design", color: "1", order: 0 },
    { id: "w3", name: "Empty", color: "3", order: 2 },
  ];
  const all = [
    task("d1", { workstreamId: "w1" }),
    task("d2", { workstreamId: "w1", status: "done", done: true }),
    task("b1", { workstreamId: "w2" }),
    task("loose"),
    task("ghost", { workstreamId: "deleted" }),
  ];

  it("orders by the workstream's order, adds a trailing group for loose tasks and skips empty ones", () => {
    const groups = groupTasks(all, "workstream", { workstreams, allTasks: all });
    expect(groups.map((g) => g.label)).toEqual(["Design", "Build", "No workstream"]);
    expect(ids(groups[2].tasks)).toEqual(["loose", "ghost"]);
    expect(groups[2].key).toBe(UNASSIGNED);
  });

  it("colors a group with its series token", () => {
    const groups = groupTasks(all, "workstream", { workstreams, allTasks: all });
    expect(groups[0].color).toBe("var(--series-1)");
    expect(groups[2].color).toBeNull();
  });

  it("puts open tasks before done ones", () => {
    const groups = groupTasks(all, "workstream", { workstreams, allTasks: all });
    expect(ids(groups[0].tasks)).toEqual(["d1", "d2"]);
  });

  it("counts progress on the unfiltered list, not the filtered one", () => {
    const filtered = all.filter((t) => t.id !== "d2");
    const groups = groupTasks(filtered, "workstream", { workstreams, allTasks: all });
    expect(groups[0]).toMatchObject({ total: 2, done: 1 });
    expect(ids(groups[0].tasks)).toEqual(["d1"]);
  });
});

describe("groupTasks by milestone", () => {
  const milestones = [
    { id: "m2", title: "Launch", date: "2026-12-01" },
    { id: "m1", title: "Beta", date: "2026-11-01" },
    { id: "m3", title: "Undated", date: null },
  ];
  const all = [
    task("a", { milestoneId: "m2" }),
    task("b", { milestoneId: "m1" }),
    task("c", { milestoneId: "m3" }),
    task("d"),
  ];

  it("orders by date with undated milestones last, then the loose group", () => {
    const groups = groupTasks(all, "milestone", { milestones, allTasks: all });
    expect(groups.map((g) => g.label)).toEqual(["Beta", "Launch", "Undated", "No milestone"]);
    expect(groups[0].date).toBe("2026-11-01");
  });
});

describe("groupTasks with no grouping", () => {
  it("returns one open group, open tasks first", () => {
    const list = [task("done", { status: "done", done: true }), task("open")];
    const groups = groupTasks(list, "none");
    expect(groups).toHaveLength(1);
    expect(ids(groups[0].tasks)).toEqual(["open", "done"]);
  });
  it("returns no group for no tasks", () => {
    expect(groupTasks([], "none")).toEqual([]);
  });
});
