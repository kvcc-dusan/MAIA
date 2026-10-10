import { describe, it, expect } from "vitest";
import { diffOpus, mergeOps, deepEqual } from "./opusDiff.js";
import { mergeDirty, addExtras } from "./opusMerge.js";

const task = (id, extra = {}) => ({ id, title: `Task ${id}`, status: "todo", projectId: "p1", ...extra });
const decision = (id, extra = {}) => ({ id, title: `Decision ${id}`, date: "2026-01-01", ...extra });
const project = (id, extra = {}) => ({
  id, name: `Project ${id}`, status: "Active", decisions: [], questions: [], workstreams: [], milestones: [], ...extra,
});
const state = (projects = [], tasks = []) => ({ projects, tasks });
const summary = (ops) => ops.map((o) => `${o.action}:${o.kind}:${o.id}`);

describe("diffOpus", () => {
  const base = state([project("p1", { decisions: [decision("d1")] })], [task("t1"), task("t2")]);

  it("produces nothing for an identical or reference-equal state", () => {
    expect(diffOpus(base, base)).toEqual([]);
    expect(diffOpus(base, structuredClone(base))).toEqual([]);
  });

  it("task edit is exactly one task save", () => {
    const next = state(base.projects, [task("t1", { title: "Renamed" }), base.tasks[1]]);
    expect(summary(diffOpus(base, next))).toEqual(["save:task:t1"]);
  });

  it("decision edit is one decision save and no project write", () => {
    const p = project("p1", { decisions: [decision("d1", { detail: "more" })] });
    expect(summary(diffOpus(base, state([p], base.tasks)))).toEqual(["save:decision:d1"]);
  });

  it("project field edit is one project save", () => {
    const p = { ...base.projects[0], headline: "Now" };
    expect(summary(diffOpus(base, state([p], base.tasks)))).toEqual(["save:project:p1"]);
  });

  it("assets and emoji are not file fields", () => {
    const p = { ...base.projects[0], assets: [{ id: "a" }], emoji: "x" };
    expect(diffOpus(base, state([p], base.tasks))).toEqual([]);
  });

  it("a new project saves itself first, then its decisions and questions", () => {
    const fresh = project("p2", { decisions: [decision("d9")], questions: [{ id: "q1", question: "Why?" }] });
    const ops = diffOpus(base, state([...base.projects, fresh], base.tasks));
    expect(summary(ops)).toEqual(["save:project:p2", "save:decision:d9", "save:question:q1"]);
  });

  it("removed task, decision and project become deletes, project delete last", () => {
    const next = state([project("p1")], [base.tasks[0]]);
    expect(summary(diffOpus(base, next))).toEqual(["delete:decision:d1", "delete:task:t2"]);
    const gone = diffOpus(base, state([], []));
    expect(summary(gone).at(-1)).toBe("delete:project:p1");
    expect(summary(gone)).not.toContain("delete:decision:d1");
  });

  it("projectId change is a task save carrying the new project", () => {
    const withTwo = state([...base.projects, project("p2")], base.tasks);
    const next = state(withTwo.projects, [task("t1", { projectId: "p2" }), base.tasks[1]]);
    const ops = diffOpus(withTwo, next);
    expect(summary(ops)).toEqual(["save:task:t1"]);
    expect(ops[0].item.projectId).toBe("p2");
  });

  it("deleting a project with the tasks unassigned moves tasks before the project goes", () => {
    const next = state([], [task("t1", { projectId: null }), task("t2", { projectId: null })]);
    expect(summary(diffOpus(base, next))).toEqual(["save:task:t1", "save:task:t2", "delete:project:p1"]);
  });

  it("a task pointing at an unknown project is written to the inbox", () => {
    const ops = diffOpus(base, state(base.projects, [...base.tasks, task("t3", { projectId: "ghost" })]));
    expect(ops[0].item.projectId).toBeNull();
  });
});

describe("mergeOps", () => {
  it("keeps the latest op per key and drops child ops of a deleted project", () => {
    const first = diffOpus(state([project("p1")], []), state([project("p1", { decisions: [decision("d1")] })], []));
    const del = diffOpus(state([project("p1")], []), state([], []));
    const merged = mergeOps(mergeOps(new Map(), first), del);
    expect([...merged.keys()]).toEqual(["project:p1"]);
  });
});

describe("mergeDirty", () => {
  it("keeps local edits that are not on disk yet, takes everything else from disk", () => {
    const local = state([project("p1")], [task("t1", { title: "local edit" }), task("t3")]);
    const disk = state([project("p1", { headline: "from disk" })], [task("t1"), task("t2")]);
    const dirty = diffOpus(state([project("p1")], [task("t1")]), local);
    const merged = mergeDirty(disk, local, dirty);
    expect(merged.tasks.map((t) => t.title)).toEqual(["Task t3", "local edit", "Task t2"]);
    expect(merged.projects[0].headline).toBe("from disk");
  });

  it("reverted keys show the disk version", () => {
    const local = state([], [task("t1", { title: "mine" })]);
    const dirty = diffOpus(state([], [task("t1")]), local);
    const merged = mergeDirty(state([], [task("t1", { title: "disk" })]), local, dirty, new Set(["task:t1"]));
    expect(merged.tasks[0].title).toBe("disk");
  });

  it("addExtras appends conflict copies to the right place", () => {
    const out = addExtras(state([project("p1")], []), [
      { kind: "task", item: task("c1"), projectId: "p1" },
      { kind: "decision", item: decision("c2"), projectId: "p1" },
    ]);
    expect(out.tasks).toHaveLength(1);
    expect(out.projects[0].decisions).toHaveLength(1);
  });
});

describe("deepEqual", () => {
  it("compares nested structures", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1] }, { a: [2] })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });
});
