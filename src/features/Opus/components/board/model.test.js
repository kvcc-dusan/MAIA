import { describe, it, expect } from "vitest";
import {
  buildColumns, cardLabel, dueInfo, filterTasks, localDay, wsFromParams,
} from "./model.js";

const task = (id, over = {}) => ({ id, title: id, status: "todo", createdAt: "2026-01-01", ...over });

describe("buildColumns", () => {
  it("buckets by status and counts", () => {
    const cols = buildColumns([task("a"), task("b", { status: "doing", estimate: "M" }), task("c", { status: "doing", estimate: "L" })]);
    expect(cols.todo.total).toBe(1);
    expect(cols.blocked.tasks).toEqual([]);
  });
  it("shows the 20 most recently done unless asked for all", () => {
    const done = Array.from({ length: 25 }, (_, i) => task(`d${i}`, { status: "done", doneAt: `2026-02-${String(i + 1).padStart(2, "0")}` }));
    const cols = buildColumns(done);
    expect(cols.done.tasks).toHaveLength(20);
    expect(cols.done.hidden).toBe(5);
    expect(cols.done.total).toBe(25);
    expect(cols.done.tasks.map((t) => t.id)).not.toContain("d0");
    expect(buildColumns(done, { showAllDone: true }).done.tasks).toHaveLength(25);
  });
});

describe("due dates", () => {
  it("reads a bare day as local", () => expect(localDay("2026-10-14")).toBe("2026-10-14"));
  it("reads a local datetime", () => expect(localDay("2026-10-14T09:30")).toBe("2026-10-14"));
  it("flags overdue open tasks only", () => {
    expect(dueInfo(task("a", { due: "2026-10-01" }), "2026-10-10")).toEqual({ label: "Oct 1", isOverdue: true });
    expect(dueInfo(task("a", { due: "2026-10-01", status: "done" }), "2026-10-10").isOverdue).toBe(false);
    expect(dueInfo(task("a", { due: "2026-10-10" }), "2026-10-10").isOverdue).toBe(false);
    expect(dueInfo(task("a"), "2026-10-10")).toBeNull();
  });
});

describe("cardLabel", () => {
  it("is descriptive", () => {
    const t = task("Fix login", { isNextAction: true, estimate: "M" });
    expect(cardLabel({ task: t, statusLabel: "In progress", due: { label: "Oct 14", isOverdue: false }, workstreamName: "Design" }))
      .toBe("Fix login, In progress, due Oct 14, workstream Design, estimate M, next action");
  });
});

describe("filters", () => {
  const list = [task("a", { workstreamId: "w1" }), task("b", { workstreamId: "w2", desc: "Login flow" })];
  it("filters by workstream and text", () => {
    expect(filterTasks(list, { workstreamIds: ["w1"] }).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(list, {})).toHaveLength(2);
  });
  it("seeds from nav params", () => {
    expect(wsFromParams({ ws: "w1" })).toEqual(["w1"]);
    expect(wsFromParams({})).toEqual([]);
  });
});

describe("owner filter", () => {
  it("keeps only the chosen owner's tasks", () => {
    const tasks = [task("a", { owner: "Ana" }), task("b", { owner: "Bo" }), task("c")];
    expect(filterTasks(tasks, { owner: "Ana" }).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(tasks, { owner: "" })).toHaveLength(3);
  });
});
