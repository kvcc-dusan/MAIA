import { describe, it, expect } from "vitest";
import { upcomingMilestones } from "./upcomingMilestones.js";

const TODAY = "2026-10-09";
const ws = [{ id: "w1", name: "Design" }];
const m = (id, patch) => ({ id, title: id, status: "planned", date: "2026-11-01", ...patch });

describe("upcomingMilestones", () => {
  const list = [
    m("later", { date: "2026-12-01" }),
    m("done", { status: "done", date: "2026-10-10" }),
    m("undated", { date: null }),
    m("soon", { date: "2026-10-14", status: "at-risk", workstreamId: "w1" }),
    m("past", { date: "2026-10-01", status: "active" }),
    m("mid", { date: "2026-11-15" }),
  ];

  it("takes the next three open dated milestones in date order", () => {
    expect(upcomingMilestones(list, ws, TODAY).map((x) => x.id)).toEqual(["past", "soon", "mid"]);
  });

  it("flags past-due items and maps status and workstream", () => {
    const [past, soon] = upcomingMilestones(list, ws, TODAY);
    expect(past).toMatchObject({ isPast: true, statusLabel: "Active", tone: "info", workstreamName: null });
    expect(soon).toMatchObject({ isPast: false, statusLabel: "At risk", tone: "warning", workstreamName: "Design" });
  });

  it("is empty when nothing is open and dated", () => {
    expect(upcomingMilestones([m("a", { status: "done" }), m("b", { date: null })], ws, TODAY)).toEqual([]);
  });
});
