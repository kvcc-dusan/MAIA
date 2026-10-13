import { describe, it, expect } from "vitest";
import { generateDummyData } from "./dummyData.js";
import { projectPeople, showOwners, priorityLabel } from "../features/Opus/lib/people.js";
import { projectDocuments, projectNotes } from "../features/Opus/lib/docModel.js";
import { heatmap, throughput, toDayString } from "../features/Opus/lib/metrics.js";

const TODAY = new Date(2026, 9, 9); // Fri 9 Oct 2026, local
const TODAY_STRING = toDayString(TODAY);
const DAY_MS = 864e5;

const data = generateDummyData({ today: TODAY });
const day = (iso) => iso.slice(0, 10);

describe("generateDummyData", () => {
  it("keeps the existing project and note output", () => {
    expect(data.projects.map((p) => p.name)).toEqual(["Maia Core", "Project Solaris", "Personal Growth", "Archive 2023"]);
    expect(data.projects.map((p) => p.status)).toEqual(["Active", "High Tempo", "Active", "Dormant"]);
    expect(data.notes.length).toBeGreaterThanOrEqual(1000);
    const ids = new Set(data.projects.map((p) => p.id));
    data.notes.forEach((n) => {
      expect(n).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), tags: [], links: [] }));
      n.projectIds.forEach((pid) => expect(ids.has(pid)).toBe(true));
    });
  });

  it("returns tasks with real statuses, all four of them, and a mirrored done flag", () => {
    expect(data.tasks.length).toBeGreaterThan(60);
    const statuses = new Set(data.tasks.map((t) => t.status));
    ["todo", "doing", "blocked", "done"].forEach((s) => expect(statuses.has(s)).toBe(true));
    data.tasks.forEach((t) => {
      expect(t.done).toBe(t.status === "done");
      expect(Boolean(t.doneAt)).toBe(t.status === "done");
      expect(["S", "M", "L"]).toContain(t.estimate);
      expect(typeof t.order).toBe("number");
    });
  });

  it("spreads task history over roughly the last ten weeks, with timestamps in order", () => {
    const earliest = Math.min(...data.tasks.map((t) => Date.parse(t.createdAt)));
    const span = (Date.parse(`${TODAY_STRING}T23:59:59Z`) - earliest) / DAY_MS;
    expect(span).toBeGreaterThan(60);
    expect(span).toBeLessThan(75);
    data.tasks.forEach((t) => {
      if (t.startedAt) expect(Date.parse(t.startedAt)).toBeGreaterThanOrEqual(Date.parse(t.createdAt));
      if (t.doneAt) expect(Date.parse(t.doneAt)).toBeGreaterThanOrEqual(Date.parse(t.startedAt));
      if (t.doneAt) expect(day(t.doneAt) <= TODAY_STRING).toBe(true);
    });
  });

  it("assigns tasks to their own project's workstreams and milestones", () => {
    const core = data.projects.find((p) => p.name === "Maia Core");
    expect(core.workstreams.length).toBe(3);
    expect(core.workstreams.map((w) => w.color)).toEqual(["1", "2", "3"]);
    expect(core.milestones.map((m) => m.status)).toEqual(expect.arrayContaining(["done", "active", "at-risk", "planned"]));
    expect(core.decisions.length).toBeGreaterThan(0);
    expect(core.questions.map((q) => q.status)).toEqual(expect.arrayContaining(["open", "answered"]));
    expect(core).toMatchObject({ phase: "Build", startDate: expect.any(String), targetDate: expect.any(String) });

    const coreTasks = data.tasks.filter((t) => t.projectId === core.id);
    expect(coreTasks.length).toBe(40);
    const wsIds = new Set(core.workstreams.map((w) => w.id));
    const msIds = new Set(core.milestones.map((m) => m.id));
    coreTasks.forEach((t) => {
      expect(wsIds.has(t.workstreamId)).toBe(true);
      if (t.milestoneId) expect(msIds.has(t.milestoneId)).toBe(true);
    });
    expect(coreTasks.filter((t) => t.isNextAction)).toHaveLength(1);
  });

  it("leaves a project without a plan alone", () => {
    const archive = data.projects.find((p) => p.name === "Archive 2023");
    expect(data.tasks.some((t) => t.projectId === archive.id)).toBe(false);
  });

  it("is reproducible apart from generated ids", () => {
    const again = generateDummyData({ today: TODAY });
    const shape = (t) => ({ title: t.title, status: t.status, createdAt: t.createdAt, startedAt: t.startedAt, doneAt: t.doneAt, due: t.due, estimate: t.estimate });
    expect(again.tasks.map(shape)).toEqual(data.tasks.map(shape));
    expect(again.activity.map((a) => [a.at, a.kind, a.collection, a.title])).toEqual(data.activity.map((a) => [a.at, a.kind, a.collection, a.title]));
  });

  it("returns an activity log that matches the tasks it describes", () => {
    const sorted = [...data.activity].sort((a, b) => a.at.localeCompare(b.at));
    expect(data.activity).toEqual(sorted);

    const tasksById = new Map(data.tasks.map((t) => [t.id, t]));
    const forTask = (id) => data.activity.filter((a) => a.itemId === id);
    data.tasks.forEach((t) => {
      const trail = forTask(t.id);
      expect(trail[0]).toMatchObject({ kind: "created", collection: "tasks", projectId: t.projectId, title: t.title, at: t.createdAt });
      if (t.status === "done") {
        expect(trail.some((a) => a.kind === "status" && a.to === "done" && a.at === t.doneAt)).toBe(true);
      }
      if (t.status === "blocked") expect(trail.some((a) => a.to === "blocked")).toBe(true);
    });
    data.activity.filter((a) => a.collection === "tasks").forEach((a) => {
      expect(tasksById.has(a.itemId)).toBe(true);
      expect(a.title.length).toBeLessThanOrEqual(80);
    });
    expect(new Set(data.activity.map((a) => a.collection))).toEqual(new Set(["tasks", "workstreams", "milestones", "decisions", "questions"]));
  });


  it("gives Maia Core a team, owners, priorities, descriptions and hub text", () => {
    const core = data.projects.find((p) => p.name === "Maia Core");
    const coreTasks = data.tasks.filter((t) => t.projectId === core.id);
    expect(core.headline.length).toBeGreaterThan(10);
    expect(core.focus.length).toBeGreaterThan(10);
    expect(projectPeople(core, coreTasks)).toEqual(["Ana Kovac", "Lea Horvat", "Marko Novak", "Sara Vidmar", "Tim Berger"]);
    expect(showOwners(core, coreTasks)).toBe(true);
    expect(coreTasks.some((t) => t.owner === null)).toBe(true);
    expect(new Set(coreTasks.map(priorityLabel))).toEqual(new Set(["High", "Medium", null]));
    expect(coreTasks.some((t) => t.desc)).toBe(true);
    core.workstreams.forEach((w) => expect(w.owner).not.toBe(""));
    const span = Date.parse(core.decisions.at(-1).date) - Date.parse(core.decisions[0].date);
    expect(core.decisions.length).toBeGreaterThanOrEqual(6);
    expect(span / DAY_MS).toBeGreaterThan(45);
    expect(core.questions.filter((q) => q.status === "open" && q.blocking).length).toBeGreaterThan(0);
    expect(core.questions.filter((q) => q.status === "answered").length).toBeGreaterThan(0);
  });

  it("links documents and plain notes to the sample projects", () => {
    const core = data.projects.find((p) => p.name === "Maia Core");
    const docs = projectDocuments(data.notes, core.id);
    expect(docs.length).toBeGreaterThanOrEqual(5);
    expect(new Set(docs.map((d) => d.kind)).size).toBeGreaterThan(2);
    expect(new Set(docs.map((d) => d.status))).toEqual(new Set(["current", "notStarted", "draft", "superseded"]));
    const wsIds = new Set(core.workstreams.map((w) => w.id));
    docs.forEach((d) => { if (d.workstreamId) expect(wsIds.has(d.workstreamId)).toBe(true); });
    expect(docs.some((d) => d.owner && d.workstreamId)).toBe(true);
    const notes = projectNotes(data.notes, core.id).filter((n) => n.content.length < 100);
    expect(notes.length).toBeGreaterThanOrEqual(3);
  });

  it("gives the live dashboard metrics something to draw", () => {
    expect(throughput(data.tasks, { weeks: 8, today: TODAY_STRING }).filter((w) => w.count > 0).length).toBeGreaterThanOrEqual(6);
    const cells = heatmap(data.activity, { weeks: 26, today: TODAY_STRING });
    expect(cells.filter((c) => c.count > 0).length).toBeGreaterThan(30);
  });
});
