import { describe, expect, it } from "vitest";
import { buildCreateArgs, buildPatch, draftFromTask, dueFromField, emptyDraft, validateDraft } from "./taskDraft.js";

const task = { id: "t", title: "Ship", desc: "", status: "todo", priority: "p2", owner: "Ana", due: null, estimate: "M", workstreamId: "w1", milestoneId: null };

describe("taskDraft", () => {
  it("round-trips a task with no changes into an empty patch", () => {
    expect(buildPatch(task, draftFromTask(task))).toEqual({});
  });
  it("patches only what changed", () => {
    const draft = { ...draftFromTask(task), title: " Ship it ", owner: "", priority: "p1", due: "2026-10-12" };
    const patch = buildPatch(task, draft);
    expect(Object.keys(patch).sort()).toEqual(["due", "owner", "priority", "title"]);
    expect(patch.title).toBe("Ship it");
    expect(patch.owner).toBeNull();
  });
  it("stores due as local noon on the chosen day", () => {
    const d = new Date(dueFromField("2026-10-12"));
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 10, 12, 12]);
    expect(dueFromField("")).toBeNull();
  });
  it("builds addTask arguments", () => {
    const args = buildCreateArgs({ ...emptyDraft({ workstreamId: "w1" }), title: " New ", owner: " Ana " }, "p1");
    expect(args).toMatchObject({ title: "New", projectId: "p1", due: null, extras: { status: "todo", priority: "p3", workstreamId: "w1", owner: "Ana" } });
  });
  it("requires a title", () => {
    expect(validateDraft(emptyDraft())).toHaveProperty("title");
    expect(validateDraft({ ...emptyDraft(), title: "x" })).toEqual({});
  });
});
