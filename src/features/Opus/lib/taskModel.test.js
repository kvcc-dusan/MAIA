import { describe, it, expect } from "vitest";
import {
  TASK_STATUSES,
  normalizeTask,
  normalizeTasks,
  applyTaskPatch,
  patchTaskInList,
} from "./taskModel.js";

const T0 = "2026-10-01T08:00:00.000Z";
const T1 = "2026-10-02T09:00:00.000Z";
const T2 = "2026-10-03T10:00:00.000Z";
const T3 = "2026-10-04T11:00:00.000Z";

describe("normalizeTask", () => {
  it("maps a legacy open task to todo and mirrors done", () => {
    const t = normalizeTask({ id: "a", title: "A", done: false, status: null, createdAt: T0 });
    expect(t.status).toBe("todo");
    expect(t.done).toBe(false);
    expect(t.doneAt).toBeNull();
  });

  it("maps legacy done:true to done and derives doneAt from completedAt, then createdAt", () => {
    expect(normalizeTask({ id: "a", done: true, completedAt: T2, createdAt: T0 })).toMatchObject({
      status: "done", done: true, doneAt: T2,
    });
    expect(normalizeTask({ id: "a", done: true, createdAt: T0 })).toMatchObject({
      status: "done", done: true, doneAt: T0,
    });
  });

  it("prefers an existing doneAt over completedAt", () => {
    const t = normalizeTask({ id: "a", done: true, doneAt: T3, completedAt: T2, createdAt: T0 });
    expect(t.doneAt).toBe(T3);
  });

  it("maps legacy blocked to blocked", () => {
    expect(normalizeTask({ id: "a", done: false, status: "blocked" })).toMatchObject({
      status: "blocked", done: false,
    });
  });

  it("lets done:true win over a stale legacy status", () => {
    // Legacy toggleTask never touched `status`, so a blocked task could be ticked off.
    const t = normalizeTask({ id: "a", done: true, status: "blocked", completedAt: T1 });
    expect(t.status).toBe("done");
    expect(t.doneAt).toBe(T1);
  });

  it("treats an unknown status string as todo", () => {
    expect(normalizeTask({ id: "a", status: "in-progress" }).status).toBe("todo");
  });

  it("follows the boolean when an older build flipped done without touching status", () => {
    // newer build wrote status 'doing', older build then completed it
    expect(normalizeTask({ id: "a", status: "doing", done: true, completedAt: T2 })).toMatchObject({
      status: "done", done: true, doneAt: T2,
    });
    // newer build wrote status 'done', older build then reopened it
    expect(normalizeTask({ id: "a", status: "done", done: false, doneAt: T2 })).toMatchObject({
      status: "todo", done: false, doneAt: null,
    });
  });

  it("trusts status when done is absent", () => {
    expect(normalizeTask({ id: "a", status: "done", doneAt: T2 })).toMatchObject({
      status: "done", done: true, doneAt: T2,
    });
    expect(normalizeTask({ id: "a", status: "doing" })).toMatchObject({ status: "doing", done: false });
  });

  it("defaults the new optional fields to null and leaves unknown fields alone", () => {
    const t = normalizeTask({ id: "a", title: "A", schedule: "soon", isNextAction: true, priority: "p1", custom: { x: 1 } });
    expect(t).toMatchObject({
      workstreamId: null, milestoneId: null, estimate: null, order: null, startedAt: null,
      schedule: "soon", isNextAction: true, priority: "p1", custom: { x: 1 },
    });
  });

  it("keeps completedAt on legacy objects instead of stripping it", () => {
    expect(normalizeTask({ id: "a", done: true, completedAt: T2 }).completedAt).toBe(T2);
  });

  it("is idempotent", () => {
    const inputs = [
      { id: "a", done: false, status: null, createdAt: T0 },
      { id: "b", done: true, completedAt: T2, createdAt: T0 },
      { id: "c", done: false, status: "blocked" },
      { id: "d", status: "doing", startedAt: T1 },
      { id: "e", status: "done", done: false, doneAt: T2 },
    ];
    inputs.forEach((raw) => {
      const once = normalizeTask(raw);
      expect(normalizeTask(once)).toEqual(once);
    });
  });

  it("never mutates its input and returns a new object", () => {
    const raw = Object.freeze({ id: "a", done: true, createdAt: T0 });
    const out = normalizeTask(raw);
    expect(out).not.toBe(raw);
    expect(raw).toEqual({ id: "a", done: true, createdAt: T0 });
  });
});

describe("normalizeTasks", () => {
  it("returns the same normalized object for the same raw object (stable identity)", () => {
    const raw = { id: "a", done: false };
    const [first] = normalizeTasks([raw]);
    const [second] = normalizeTasks([raw, { id: "b" }]);
    expect(second).toBe(first);
  });

  it("tolerates a non-array", () => {
    expect(normalizeTasks(null)).toEqual([]);
    expect(normalizeTasks(undefined)).toEqual([]);
  });
});

describe("applyTaskPatch", () => {
  it("creates a todo task from null with createdAt", () => {
    const t = applyTaskPatch(null, { id: "a", title: "A" }, T0);
    expect(t).toMatchObject({ id: "a", status: "todo", done: false, createdAt: T0, doneAt: null, startedAt: null });
  });

  it("first move to doing sets startedAt, later moves keep it", () => {
    const todo = applyTaskPatch(null, { id: "a", title: "A" }, T0);
    const doing = applyTaskPatch(todo, { status: "doing" }, T1);
    expect(doing.startedAt).toBe(T1);
    const blocked = applyTaskPatch(doing, { status: "blocked" }, T2);
    const again = applyTaskPatch(blocked, { status: "doing" }, T3);
    expect(again.startedAt).toBe(T1);
  });

  it("move to done sets doneAt and fills a missing startedAt", () => {
    const todo = applyTaskPatch(null, { id: "a" }, T0);
    const done = applyTaskPatch(todo, { status: "done" }, T1);
    expect(done).toMatchObject({ status: "done", done: true, doneAt: T1, startedAt: T1 });
  });

  it("move to done keeps an existing startedAt", () => {
    const doing = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "doing" }, T1);
    const done = applyTaskPatch(doing, { status: "done" }, T2);
    expect(done.startedAt).toBe(T1);
    expect(done.doneAt).toBe(T2);
  });

  it("moving away from done clears doneAt", () => {
    const done = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "done" }, T1);
    const back = applyTaskPatch(done, { status: "doing" }, T2);
    expect(back).toMatchObject({ status: "doing", done: false, doneAt: null });
  });

  it("does not re-stamp doneAt when a done task is patched with unrelated fields", () => {
    const done = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "done" }, T1);
    const renamed = applyTaskPatch(done, { title: "B" }, T3);
    expect(renamed.doneAt).toBe(T1);
    expect(renamed.status).toBe("done");
  });

  it("accepts the legacy done boolean: done:true completes, done:false reopens to todo", () => {
    const open = applyTaskPatch(null, { id: "a" }, T0);
    const done = applyTaskPatch(open, { done: true }, T1);
    expect(done).toMatchObject({ status: "done", done: true, doneAt: T1 });
    const reopened = applyTaskPatch(done, { done: false }, T2);
    expect(reopened).toMatchObject({ status: "todo", done: false, doneAt: null });
  });

  it("done:false on a task that is not done leaves its status alone", () => {
    const doing = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "doing" }, T1);
    expect(applyTaskPatch(doing, { done: false }, T2).status).toBe("doing");
  });

  it("an explicit status wins over a conflicting done boolean", () => {
    const open = applyTaskPatch(null, { id: "a" }, T0);
    expect(applyTaskPatch(open, { status: "doing", done: true }, T1)).toMatchObject({ status: "doing", done: false });
  });

  it("legacy status:null unblocks a blocked task and is a no-op otherwise", () => {
    const blocked = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "blocked" }, T1);
    expect(applyTaskPatch(blocked, { status: null }, T2).status).toBe("todo");
    const doing = applyTaskPatch(blocked, { status: "doing" }, T2);
    expect(applyTaskPatch(doing, { status: null }, T3).status).toBe("doing");
    const done = applyTaskPatch(doing, { status: "done" }, T3);
    expect(applyTaskPatch(done, { status: null }, T3).status).toBe("done");
  });

  it("works on a legacy prev object and writes a normalized result", () => {
    const legacy = { id: "a", title: "A", done: false, status: null, createdAt: T0, schedule: "soon", isNextAction: true };
    const next = applyTaskPatch(legacy, { status: "doing" }, T1);
    expect(next).toMatchObject({ status: "doing", done: false, startedAt: T1, schedule: "soon", isNextAction: true });
  });

  it("does not write completedAt, and nulls a stale one on reopen", () => {
    const fresh = applyTaskPatch(applyTaskPatch(null, { id: "a" }, T0), { status: "done" }, T1);
    expect("completedAt" in fresh).toBe(false);
    const legacyDone = { id: "a", done: true, completedAt: T2, createdAt: T0 };
    const stillDone = applyTaskPatch(legacyDone, { title: "x" }, T3);
    expect(stillDone.completedAt).toBe(T2);
    expect(stillDone.doneAt).toBe(T2);
    const reopened = applyTaskPatch(legacyDone, { done: false }, T3);
    expect(reopened.completedAt).toBeNull();
    expect(reopened.doneAt).toBeNull();
  });

  it("lets a creation patch carry explicit timestamps", () => {
    const t = applyTaskPatch(null, { id: "a", status: "done", createdAt: T0, startedAt: T1, doneAt: T2 }, T3);
    expect(t).toMatchObject({ createdAt: T0, startedAt: T1, doneAt: T2, status: "done" });
  });

  it("never mutates prev or patch", () => {
    const prev = Object.freeze({ id: "a", done: false });
    const patch = Object.freeze({ status: "done" });
    expect(() => applyTaskPatch(prev, patch, T1)).not.toThrow();
  });

  it("keeps done mirrored and doneAt set iff done for every status sequence up to length 4", () => {
    const sequences = [];
    const build = (prefix) => {
      if (prefix.length) sequences.push(prefix);
      if (prefix.length === 4) return;
      TASK_STATUSES.forEach((s) => build([...prefix, s]));
    };
    build([]);
    expect(sequences.length).toBe(4 + 16 + 64 + 256);

    sequences.forEach((seq) => {
      // from creation, from a legacy open task, and from a legacy done task
      const starts = [
        null,
        { id: "a", done: false, status: null, createdAt: T0 },
        { id: "a", done: true, completedAt: T1, createdAt: T0 },
      ];
      starts.forEach((start) => {
        let task = start ? start : applyTaskPatch(null, { id: "a" }, T0);
        seq.forEach((status, i) => {
          const now = new Date(Date.UTC(2026, 9, 5 + i)).toISOString();
          // alternate the two patch dialects so both paths are exercised
          const patch = i % 2 === 0 ? { status } : status === "done" ? { done: true } : { status };
          task = applyTaskPatch(task, patch, now);
          expect(task.done).toBe(task.status === "done");
          expect(Boolean(task.doneAt)).toBe(task.status === "done");
          expect(TASK_STATUSES).toContain(task.status);
          expect(normalizeTask(task)).toEqual(task);
        });
      });
    });
  });
});

describe("patchTaskInList", () => {
  const mk = (id, extra = {}) => ({
    id, title: id, done: false, status: null, projectId: "p1", isNextAction: false,
    schedule: "today", createdAt: T0, ...extra,
  });

  it("returns the same list when the id is unknown", () => {
    const list = [mk("a")];
    expect(patchTaskInList(list, "zzz", { done: true }, T1)).toBe(list);
  });

  it("only rewrites the patched task, other legacy tasks stay byte-identical", () => {
    const list = [mk("a"), mk("b")];
    const out = patchTaskInList(list, "a", { status: "doing" }, T1);
    expect(out[1]).toBe(list[1]);
    expect(out[0].status).toBe("doing");
  });

  it("completing the next action clears the flag and promotes the oldest open task, today before soon", () => {
    const list = [
      mk("a", { isNextAction: true }),
      mk("soon-old", { schedule: "soon", createdAt: "2026-09-01T00:00:00.000Z" }),
      mk("today-new", { schedule: "today", createdAt: "2026-09-20T00:00:00.000Z" }),
      mk("today-old", { schedule: "today", createdAt: "2026-09-10T00:00:00.000Z" }),
    ];
    const out = patchTaskInList(list, "a", { done: true }, T1);
    const byId = Object.fromEntries(out.map((t) => [t.id, t]));
    expect(byId.a).toMatchObject({ status: "done", done: true, isNextAction: false });
    expect(byId["today-old"].isNextAction).toBe(true);
    expect(byId["today-new"].isNextAction).toBe(false);
    expect(byId["soon-old"].isNextAction).toBe(false);
  });

  it("skips blocked and done candidates when promoting", () => {
    const list = [
      mk("a", { isNextAction: true }),
      mk("blocked", { status: "blocked", createdAt: "2026-09-01T00:00:00.000Z" }),
      mk("finished", { done: true, completedAt: T1, createdAt: "2026-09-02T00:00:00.000Z" }),
      mk("ok", { createdAt: "2026-09-03T00:00:00.000Z" }),
    ];
    const out = patchTaskInList(list, "a", { done: true }, T1);
    expect(out.find((t) => t.id === "ok").isNextAction).toBe(true);
    expect(out.find((t) => t.id === "blocked").isNextAction).toBe(false);
    expect(out.find((t) => t.id === "finished").isNextAction).toBe(false);
  });

  it("does not promote across projects or when the completed task was not the next action", () => {
    const list = [
      mk("a", { isNextAction: false }),
      mk("b", { projectId: "p2" }),
      mk("c"),
    ];
    const out = patchTaskInList(list, "a", { done: true }, T1);
    expect(out.every((t) => t.isNextAction === false)).toBe(true);
  });

  it("also completes through a status patch (the board drop path)", () => {
    const list = [mk("a", { isNextAction: true }), mk("b")];
    const out = patchTaskInList(list, "a", { status: "done" }, T1);
    expect(out[0]).toMatchObject({ status: "done", isNextAction: false });
    expect(out[1].isNextAction).toBe(true);
  });

  it("reopening keeps the isNextAction flag as it was", () => {
    const list = [mk("a", { done: true, completedAt: T1, isNextAction: false })];
    const out = patchTaskInList(list, "a", { done: false }, T2);
    expect(out[0]).toMatchObject({ status: "todo", done: false, isNextAction: false });
  });
});
