import { describe, it, expect } from "vitest";
import { buildCreateArgs, buildPatch, draftFromTask, dueFromField, emptyDraft, validateDraft } from "./taskForm.js";
import { localDay } from "./model.js";

const task = { id: "t", title: "Write", desc: "", status: "todo", workstreamId: "w1", milestoneId: null, due: null, estimate: null, schedule: "today" };

describe("buildPatch", () => {
  it("is empty when nothing changed", () => {
    expect(buildPatch(task, draftFromTask(task))).toEqual({});
  });
  it("carries only changed fields and trims the title", () => {
    const d = { ...draftFromTask(task), title: "  Write more ", status: "doing", workstreamId: null, estimate: "L" };
    expect(buildPatch(task, d)).toEqual({ title: "Write more", status: "doing", workstreamId: null, estimate: "L" });
  });
  it("keeps a stored size untouched", () => {
    const sized = { ...task, estimate: "M" };
    expect(buildPatch(sized, draftFromTask(sized))).toEqual({});
  });
  it("does not rewrite an unchanged due day", () => {
    const due = new Date(2026, 9, 14, 17, 45).toISOString();
    const dated = { ...task, due };
    expect(buildPatch(dated, draftFromTask(dated))).toEqual({});
  });
  it("writes a new due day at local noon", () => {
    const d = { ...draftFromTask(task), due: "2026-10-20T08:15" };
    const out = buildPatch(task, d).due;
    expect(localDay(out)).toBe("2026-10-20");
    expect(new Date(out).getHours()).toBe(12);
  });
  it("clears the due date", () => {
    const dated = { ...task, due: new Date(2026, 9, 14, 12).toISOString() };
    expect(buildPatch(dated, { ...draftFromTask(dated), due: "" })).toEqual({ due: null });
  });
});

describe("create and validate", () => {
  it("requires a title", () => {
    expect(validateDraft(emptyDraft())).toHaveProperty("title");
    expect(validateDraft({ ...emptyDraft(), title: " x " })).toEqual({});
  });
  it("builds addTask arguments with the column status", () => {
    const args = buildCreateArgs({ ...emptyDraft({ status: "blocked", workstreamId: "w2" }), title: " New ", due: "" }, "p1");
    expect(args).toMatchObject({ title: "New", due: null, projectId: "p1", extras: { status: "blocked", workstreamId: "w2" } });
  });
  it("dueFromField handles empty input", () => expect(dueFromField("")).toBeNull());
});

describe("owner and priority", () => {
  it("patches only when they change", () => {
    const t = { title: "x", desc: "", status: "todo", owner: "Ana", priority: "p2" };
    expect(buildPatch(t, draftFromTask(t))).toEqual({});
    expect(buildPatch(t, { ...draftFromTask(t), owner: " Bo ", priority: "p1" })).toEqual({ owner: "Bo", priority: "p1" });
    expect(buildPatch(t, { ...draftFromTask(t), owner: "" })).toEqual({ owner: null });
  });
  it("sends both on create", () => {
    const args = buildCreateArgs({ ...emptyDraft(), title: "t", owner: "Ana", priority: "p1" }, "p");
    expect(args.extras).toMatchObject({ owner: "Ana", priority: "p1" });
  });
});
