import { describe, expect, it } from "vitest";
import { ariaLabelFor, buildRoadmap, groupByMonth, rangeText, unassignText, UNASSIGNED_LANE_ID } from "./roadmapModel.js";

const project = {
  id: "p1",
  workstreams: [
    { id: "w2", name: "Release", owner: "Ana", status: "planned", color: "3", order: 1 },
    { id: "w1", name: "Data layer", owner: "Dusan", status: "active", color: "1", order: 0 },
  ],
  milestones: [
    { id: "m1", title: "Backup v2", start: "2026-10-03", date: "2026-10-20", status: "at-risk", workstreamId: "w1" },
    { id: "m2", title: "Candidate", start: null, date: "2026-11-09", status: "planned", workstreamId: "w2" },
    { id: "m3", title: "Orphan", date: "2026-10-30", status: "planned", workstreamId: "gone" },
    { id: "m4", title: "No date", start: "2026-12-01", date: null, status: "planned", workstreamId: null },
  ],
};
const tasks = [
  { projectId: "p1", milestoneId: "m1", status: "done" },
  { projectId: "p1", milestoneId: "m1", status: "todo" },
  { projectId: "other", milestoneId: "m1", status: "done" },
];

describe("buildRoadmap", () => {
  const r = buildRoadmap(project, tasks);

  it("orders lanes by workstream order and adds an unassigned lane when needed", () => {
    expect(r.lanes.map((l) => l.id)).toEqual(["w1", "w2", UNASSIGNED_LANE_ID]);
    expect(r.lanes[2].milestones.map((m) => m.id)).toEqual(["m3"]);
  });

  it("treats a missing workstream as unassigned", () => {
    expect(r.scheduled.find((m) => m.id === "m3").workstreamId).toBeNull();
  });

  it("splits scheduled and unscheduled and sorts by due day", () => {
    expect(r.scheduled.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
    expect(r.unscheduled.map((m) => m.id)).toEqual(["m4"]);
  });

  it("counts linked tasks of this project only", () => {
    expect(r.scheduled[0].stats).toEqual({ total: 2, done: 1 });
  });

  it("omits the unassigned lane when nothing needs it", () => {
    const only = buildRoadmap({ ...project, milestones: [project.milestones[0]] }, tasks);
    expect(only.lanes.map((l) => l.id)).toEqual(["w1", "w2"]);
  });
});

describe("labels", () => {
  const r = buildRoadmap(project, tasks);

  it("describes a bar, a marker and an unscheduled milestone", () => {
    expect(rangeText(r.scheduled[0])).toBe("Oct 3 to Oct 20");
    expect(rangeText(r.scheduled[2])).toBe("due Nov 9");
    expect(rangeText(r.unscheduled[0])).toBe("starts Dec 1");
  });

  it("builds the aria label", () => {
    expect(ariaLabelFor(r.scheduled[0])).toBe("Backup v2, at risk, Oct 3 to Oct 20, workstream Data layer");
    expect(ariaLabelFor(r.scheduled[1])).toBe("Orphan, planned, due Oct 30, no workstream");
  });

  it("groups by month", () => {
    expect(groupByMonth(r.scheduled).map((g) => [g.label, g.items.length])).toEqual([["October 2026", 2], ["November 2026", 1]]);
  });

});

describe("unassignText", () => {
  it("words the delete consequence", () => {
    expect(unassignText({ milestones: 2, tasks: 1, decisions: 0, questions: 3 })).toBe(
      "Its 2 milestones, 1 task and 3 questions become unassigned. None of them are deleted."
    );
    expect(unassignText({ milestones: 0, tasks: 0, decisions: 0, questions: 0 })).toBe("Nothing is assigned to it.");
  });
});
