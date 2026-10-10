import { describe, expect, it } from "vitest";
import {
  filterTasks, filtersFromParams, filtersReducer, groupTasks, hasExtraFilters, initialFilters, isOverdue,
  sanitizeFilters, sortTasks,
} from "./filterTasks.js";

const TODAY = "2026-10-09"; // a Friday, so the week starts 2026-10-05

const task = (id, over = {}) => ({
  id,
  title: `Task ${id}`,
  status: "todo",
  done: false,
  priority: "p3",
  createdAt: "2026-10-01T10:00:00.000Z",
  due: null,
  workstreamId: null,
  milestoneId: null,
  owner: null,
  ...over,
});

const ids = (list) => list.map((t) => t.id);
const apply = (list, over = {}) => ids(filterTasks(list, { ...initialFilters, ...over }, TODAY));

describe("isOverdue", () => {
  it("is true for an open task past its day", () => {
    expect(isOverdue(task("a", { due: "2026-10-08" }), TODAY)).toBe(true);
    expect(isOverdue(task("a", { due: "2026-10-08T23:30" }), TODAY)).toBe(true);
  });
  it("is false today, later, without a date, or when done", () => {
    expect(isOverdue(task("a", { due: TODAY }), TODAY)).toBe(false);
    expect(isOverdue(task("a", { due: "2026-10-10" }), TODAY)).toBe(false);
    expect(isOverdue(task("a"), TODAY)).toBe(false);
    expect(isOverdue(task("a", { due: "2026-10-01", status: "done", done: true }), TODAY)).toBe(false);
  });
});

describe("filterTasks status chips", () => {
  const list = [
    task("todo"),
    task("doing", { status: "doing" }),
    task("blocked", { status: "blocked" }),
    task("late", { due: "2026-10-01" }),
    task("done-new", { status: "done", done: true, doneAt: "2026-10-06T09:00:00.000Z" }),
    task("done-old", { status: "done", done: true, doneAt: "2026-10-02T09:00:00.000Z" }),
  ];

  it("Open is everything not done", () => {
    expect(apply(list, { status: "open" })).toEqual(["todo", "doing", "blocked", "late"]);
  });
  it("Blocked and Overdue", () => {
    expect(apply(list, { status: "blocked" })).toEqual(["blocked"]);
    expect(apply(list, { status: "overdue" })).toEqual(["late"]);
  });
  it("Done this week counts finishes since Monday only", () => {
    expect(apply(list, { status: "done-week" })).toEqual(["done-new"]);
    expect(apply(list, { status: "done" })).toEqual(["done-new", "done-old"]);
  });
  it("All keeps everything, and an exact status matches that status", () => {
    expect(apply(list, { status: "all" })).toHaveLength(6);
    expect(apply(list, { status: "doing" })).toEqual(["doing"]);
  });
});

describe("filterTasks other filters", () => {
  const list = [
    task("a", { workstreamId: "w1", milestoneId: "m1", owner: "Ana", title: "Design the login", desc: "Wireframes" }),
    task("b", { workstreamId: "w2", owner: "Sara" }),
    task("c"),
  ];
  it("filters by workstream, milestone and owner", () => {
    expect(apply(list, { workstreamId: "w1" })).toEqual(["a"]);
    expect(apply(list, { milestoneId: "m1" })).toEqual(["a"]);
    expect(apply(list, { owner: "Sara" })).toEqual(["b"]);
  });
  it("searches title and notes, ignoring case and padding", () => {
    expect(apply(list, { query: "  LOGIN " })).toEqual(["a"]);
    expect(apply(list, { query: "wire" })).toEqual(["a"]);
    expect(apply(list, { query: "nothing" })).toEqual([]);
  });
});

describe("sortTasks", () => {
  const list = [
    task("none", { priority: "p1" }),
    task("late", { due: "2026-10-20", priority: "p3" }),
    task("soon", { due: "2026-10-10", priority: "p3" }),
    task("soon-high", { due: "2026-10-10", priority: "p1" }),
  ];
  it("sorts by due date, dateless last, priority breaks ties", () => {
    expect(ids(sortTasks(list, "due"))).toEqual(["soon-high", "soon", "late", "none"]);
  });
  it("sorts by priority, then due", () => {
    expect(ids(sortTasks(list, "priority"))).toEqual(["soon-high", "none", "soon", "late"]);
  });
  it("sorts by title and by recently updated", () => {
    expect(ids(sortTasks([task("b", { title: "B" }), task("a", { title: "A" })], "title"))).toEqual(["a", "b"]);
    const recent = [task("old", { updatedAt: "2026-10-01" }), task("new", { updatedAt: "2026-10-05" })];
    expect(ids(sortTasks(recent, "updated"))).toEqual(["new", "old"]);
  });
  it("does not mutate the input", () => {
    const copy = [...list];
    sortTasks(list, "title");
    expect(list).toEqual(copy);
  });
});

describe("groupTasks", () => {
  const workstreams = [{ id: "w2", name: "Build", order: 2, color: "2" }, { id: "w1", name: "Design", order: 1, color: "1" }];
  const milestones = [{ id: "m2", title: "Launch", date: "2026-11-01" }, { id: "m1", title: "Beta", date: "2026-10-15" }];
  const all = [
    task("a", { workstreamId: "w1", milestoneId: "m1" }),
    task("b", { workstreamId: "w1", milestoneId: "m1", status: "done", done: true }),
    task("c", { workstreamId: "w2", milestoneId: "m2" }),
    task("d"),
  ];
  const open = all.filter((t) => t.status !== "done");

  it("groups by workstream in order, loose tasks last, progress counted on the unfiltered list", () => {
    const groups = groupTasks(open, "workstream", { workstreams, milestones, allTasks: all });
    expect(groups.map((g) => g.label)).toEqual(["Design", "Build", "No workstream"]);
    expect(groups[0]).toMatchObject({ total: 2, done: 1, color: "var(--series-1)" });
    expect(groups[2]).toMatchObject({ total: 1, done: 0, color: null });
  });
  it("groups by milestone by date", () => {
    const groups = groupTasks(open, "milestone", { workstreams, milestones, allTasks: all });
    expect(groups.map((g) => g.label)).toEqual(["Beta", "Launch", "No milestone"]);
  });
  it("leaves empty groups out", () => {
    const groups = groupTasks([all[2]], "workstream", { workstreams, milestones, allTasks: all });
    expect(groups.map((g) => g.key)).toEqual(["w2"]);
  });
  it("None gives one group, or none when empty", () => {
    expect(groupTasks(all, "none", { allTasks: all })).toHaveLength(1);
    expect(groupTasks([], "none")).toEqual([]);
  });
});

describe("filter state", () => {
  it("defaults to Open, due-date sort, grouped by workstream", () => {
    expect(initialFilters).toMatchObject({ status: "open", sort: "due", groupBy: "workstream" });
  });
  it("reads navigate params and falls back to Open", () => {
    expect(filtersFromParams({ status: "overdue", ws: "w1", milestone: "m1" })).toMatchObject({ status: "overdue", workstreamId: "w1", milestoneId: "m1" });
    expect(filtersFromParams({ status: "todo" }).status).toBe("todo");
    expect(filtersFromParams({ status: "nonsense" }).status).toBe("open");
    expect(filtersFromParams().status).toBe("open");
  });
  it("re-seeding keeps sort and grouping", () => {
    const state = filtersReducer({ ...initialFilters, sort: "title", groupBy: "none" }, { type: "params", params: { status: "blocked" } });
    expect(state).toMatchObject({ status: "blocked", sort: "title", groupBy: "none" });
  });
  it("clear resets the extras but not status or layout", () => {
    const state = filtersReducer(
      { ...initialFilters, status: "done", workstreamId: "w1", owner: "Ana", query: "x", groupBy: "none" },
      { type: "clear" }
    );
    expect(state).toMatchObject({ status: "done", workstreamId: "", owner: "", query: "", groupBy: "none" });
    expect(hasExtraFilters(state)).toBe(false);
  });
  it("ignores unknown group and sort values", () => {
    expect(filtersReducer(initialFilters, { type: "groupBy", value: "status" })).toBe(initialFilters);
    expect(filtersReducer(initialFilters, { type: "sort", value: "x" })).toBe(initialFilters);
  });
  it("sanitize drops deleted workstreams, milestones and owners", () => {
    const f = { ...initialFilters, workstreamId: "gone", milestoneId: "gone", owner: "Gone" };
    expect(sanitizeFilters(f, { workstreams: [], milestones: [], owners: [] })).toMatchObject({ workstreamId: "", milestoneId: "", owner: "" });
    const ok = { ...initialFilters, workstreamId: "w1" };
    expect(sanitizeFilters(ok, { workstreams: [{ id: "w1" }] })).toBe(ok);
  });
});
