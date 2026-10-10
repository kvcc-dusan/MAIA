import { describe, expect, it } from "vitest";
import { byDate, formatMilestoneDate, nextMilestone } from "./milestones.js";

describe("milestones helpers", () => {
  it("sorts by day, undated last", () => {
    const list = [{ id: "c", date: null }, { id: "b", date: "2026-11-01" }, { id: "a", date: "2026-10-20T09:00" }];
    expect(list.sort(byDate).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("formats the calendar day without shifting it", () => {
    expect(formatMilestoneDate("2026-10-20")).toBe("Oct 20");
    expect(formatMilestoneDate("2026-10-20T23:30")).toBe("Oct 20");
    expect(formatMilestoneDate("nope")).toBe("");
  });

  it("finds the next unfinished dated milestone by status", () => {
    const project = { milestones: [
      { id: "1", date: "2026-10-01", status: "done" },
      { id: "2", date: "2026-11-01", status: "at-risk" },
      { id: "3", date: "2026-10-15", status: "active" },
      { id: "4", date: null, status: "planned" },
    ] };
    expect(nextMilestone(project).id).toBe("3");
    expect(nextMilestone({ milestones: [] })).toBeNull();
  });
});
