import { describe, it, expect } from "vitest";
import {
  MILESTONE_STATUSES,
  WORKSTREAM_COLORS,
  PROJECT_PHASES,
  normalizeMilestone,
  normalizeProject,
  normalizeProjects,
  applyMilestonePatch,
  createWorkstream,
  createProjectDecision,
  createQuestion,
  createMilestone,
  applyQuestionPatch,
} from "./projectModel.js";

const NOW = "2026-10-09T10:00:00.000Z";

const legacyProject = () => ({
  id: "p1",
  name: "Maia",
  emoji: "📁",
  status: "Active",
  objective: "ship",
  successCriteria: [],
  milestones: [
    { id: "m1", title: "Alpha", date: "2026-10-20", done: false },
    { id: "m2", title: "Beta", date: "2026-11-20", done: true },
  ],
});

describe("normalizeProject", () => {
  it("adds the new project fields as null / empty arrays when absent", () => {
    const p = normalizeProject({ id: "p1", name: "X" });
    expect(p).toMatchObject({
      startDate: null, targetDate: null, phase: null, nextMeeting: null,
      workstreams: [], decisions: [], questions: [], milestones: [],
    });
  });

  it("keeps existing values and unknown fields", () => {
    const p = normalizeProject({
      id: "p1", name: "X", phase: "Build", startDate: "2026-09-01", icon: "rocket",
      workstreams: [{ id: "w1", name: "A" }],
    });
    expect(p).toMatchObject({ phase: "Build", startDate: "2026-09-01", icon: "rocket" });
    expect(p.workstreams).toEqual([{ id: "w1", name: "A" }]);
  });

  it("normalizes legacy milestones to status and mirrored done", () => {
    const { milestones } = normalizeProject(legacyProject());
    expect(milestones[0]).toMatchObject({
      id: "m1", title: "Alpha", date: "2026-10-20", start: null,
      status: "planned", workstreamId: null, done: false,
    });
    expect(milestones[1]).toMatchObject({ id: "m2", status: "done", done: true });
  });

  it("is idempotent, including generated milestone ids", () => {
    const raw = {
      id: "p1",
      milestones: [{ title: "No id", date: "2026-10-20", done: false }, { title: "No id", done: true }],
    };
    const once = normalizeProject(raw);
    expect(normalizeProject(once)).toEqual(once);
    expect(normalizeProject(raw)).toEqual(once);
  });

  it("never mutates its input and returns a new object", () => {
    const raw = legacyProject();
    const snapshot = JSON.parse(JSON.stringify(raw));
    const out = normalizeProject(raw);
    expect(out).not.toBe(raw);
    expect(raw).toEqual(snapshot);
  });

  it("tolerates a non-array milestones field", () => {
    expect(normalizeProject({ id: "p", milestones: null }).milestones).toEqual([]);
  });
});

describe("normalizeProjects", () => {
  it("keeps object identity stable for an untouched stored project", () => {
    const raw = legacyProject();
    const [a] = normalizeProjects([raw]);
    const [b] = normalizeProjects([raw, { id: "p2" }]);
    expect(b).toBe(a);
  });

  it("tolerates a non-array", () => {
    expect(normalizeProjects(undefined)).toEqual([]);
  });
});

describe("normalizeMilestone", () => {
  it("generates a deterministic fallback id from index and title", () => {
    const a = normalizeMilestone({ title: "Launch Day!" }, 2);
    const b = normalizeMilestone({ title: "Launch Day!" }, 2);
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(normalizeMilestone({ title: "Launch Day!" }, 3).id);
    expect(a.id).not.toBe(normalizeMilestone({ title: "Other" }, 2).id);
    expect(a.id).toBeTruthy();
  });

  it("copes with a missing title", () => {
    expect(normalizeMilestone({}, 0).id).toBeTruthy();
  });

  it("maps the hub's due onto date without dropping due", () => {
    const m = normalizeMilestone({ id: "m", title: "t", due: "2026-10-30" }, 0);
    expect(m.date).toBe("2026-10-30");
  });

  it("derives status from done when status is absent and an unknown status falls back the same way", () => {
    expect(normalizeMilestone({ id: "m", done: true }, 0).status).toBe("done");
    expect(normalizeMilestone({ id: "m", done: false }, 0).status).toBe("planned");
    expect(normalizeMilestone({ id: "m", status: "bogus" }, 0).status).toBe("planned");
  });

  it("keeps an in-between status and mirrors done false", () => {
    expect(normalizeMilestone({ id: "m", status: "at-risk" }, 0)).toMatchObject({ status: "at-risk", done: false });
  });

  it("lets a flipped done boolean win over a stale status (a legacy writer toggled it)", () => {
    expect(normalizeMilestone({ id: "m", status: "planned", done: true }, 0)).toMatchObject({ status: "done", done: true });
    expect(normalizeMilestone({ id: "m", status: "done", done: false }, 0)).toMatchObject({ status: "planned", done: false });
  });

  it("exposes the allowed statuses", () => {
    expect(MILESTONE_STATUSES).toEqual(["planned", "active", "at-risk", "done"]);
  });
});

describe("applyMilestonePatch", () => {
  const base = { id: "m1", title: "A", date: "2026-10-20", done: false };

  it("setting status done mirrors done and stamps updatedAt", () => {
    const m = applyMilestonePatch(base, { status: "done" }, NOW);
    expect(m).toMatchObject({ status: "done", done: true, updatedAt: NOW });
  });

  it("the legacy done boolean maps to status: true completes, false returns to planned", () => {
    const done = applyMilestonePatch(base, { done: true }, NOW);
    expect(done).toMatchObject({ status: "done", done: true });
    const back = applyMilestonePatch(done, { done: false }, NOW);
    expect(back).toMatchObject({ status: "planned", done: false });
  });

  it("done:false on an active milestone keeps it active", () => {
    const active = applyMilestonePatch(base, { status: "active" }, NOW);
    expect(applyMilestonePatch(active, { done: false }, NOW).status).toBe("active");
  });

  it("an explicit status wins over a conflicting done", () => {
    expect(applyMilestonePatch(base, { status: "at-risk", done: true }, NOW)).toMatchObject({ status: "at-risk", done: false });
  });

  it("creates from null", () => {
    const m = applyMilestonePatch(null, { id: "m9", title: "New" }, NOW);
    expect(m).toMatchObject({ id: "m9", title: "New", status: "planned", done: false, date: null, start: null, workstreamId: null });
  });

  it("does not mutate the previous milestone", () => {
    const frozen = Object.freeze({ ...base });
    expect(() => applyMilestonePatch(frozen, { status: "done" }, NOW)).not.toThrow();
  });
});

describe("creators", () => {
  it("createWorkstream cycles colors 1..4 and appends order", () => {
    const list = [];
    for (let i = 0; i < 6; i++) list.push(createWorkstream(list, { name: `W${i}` }));
    expect(list.map((w) => w.color)).toEqual(["1", "2", "3", "4", "1", "2"]);
    expect(list.map((w) => w.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(list.map((w) => w.id)).size).toBe(6);
    expect(list[0]).toMatchObject({ name: "W0", owner: "", status: "active" });
    expect(WORKSTREAM_COLORS).toEqual(["1", "2", "3", "4"]);
  });

  it("createWorkstream lets overrides win", () => {
    expect(createWorkstream([], { color: "3", status: "paused" })).toMatchObject({ color: "3", status: "paused" });
  });

  it("createProjectDecision defaults the date to the day of now", () => {
    expect(createProjectDecision({ title: "Use SQLite" }, NOW)).toMatchObject({
      title: "Use SQLite", date: "2026-10-09", by: "", workstreamId: null, detail: "",
    });
  });

  it("createQuestion starts open and non-blocking", () => {
    expect(createQuestion({ question: "Who signs off?" }, NOW)).toMatchObject({
      question: "Who signs off?", status: "open", blocking: false, answer: "", owner: "",
      workstreamId: null, createdAt: NOW, updatedAt: NOW,
    });
  });

  it("createMilestone normalizes through the same rules", () => {
    expect(createMilestone({ title: "Alpha", date: "2026-10-30" }, NOW)).toMatchObject({
      title: "Alpha", date: "2026-10-30", status: "planned", done: false, start: null, workstreamId: null,
    });
  });
});

describe("applyQuestionPatch", () => {
  it("stamps updatedAt and keeps status valid", () => {
    const q = createQuestion({ question: "Q" }, "2026-10-01T00:00:00.000Z");
    const answered = applyQuestionPatch(q, { status: "answered", answer: "Yes" }, NOW);
    expect(answered).toMatchObject({ status: "answered", answer: "Yes", updatedAt: NOW });
    expect(applyQuestionPatch(q, { status: "weird" }, NOW).status).toBe("open");
  });
});

describe("hub fields", () => {
  it("defaults headline and focus to empty strings and keeps set values", () => {
    expect(normalizeProject({ id: "p" })).toMatchObject({ headline: "", focus: "" });
    expect(normalizeProject({ id: "p", headline: "H", focus: "F" })).toMatchObject({ headline: "H", focus: "F" });
  });
  it("exports the phase options", () => {
    expect(PROJECT_PHASES).toEqual(["Discovery", "Planning", "Build", "Launch", "Maintain"]);
  });
});
