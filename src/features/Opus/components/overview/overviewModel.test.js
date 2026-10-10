import { describe, it, expect } from "vitest";
import { buildMetricCards, buildOverviewModel } from "./overviewModel.js";

const TODAY = "2026-10-09";
const t = (id, patch) => ({ id, title: id, status: "todo", createdAt: "2026-09-14T08:00:00Z", workstreamId: "w1", ...patch });
const project = {
  id: "p1",
  startDate: "2026-09-14",
  targetDate: "2026-11-30",
  workstreams: [{ id: "w1", name: "Build", order: 1 }],
  milestones: [{ id: "m1", title: "Beta", date: "2026-10-20", status: "planned", workstreamId: "w1" }],
  questions: [
    { id: "q1", status: "open", blocking: true },
    { id: "q2", status: "answered", blocking: true },
  ],
};
const tasks = [
  t("a", { status: "done", startedAt: "2026-09-20T08:00:00Z", doneAt: "2026-09-22T08:00:00Z" }),
  t("b", { status: "done", startedAt: "2026-09-28T08:00:00Z", doneAt: "2026-10-01T08:00:00Z" }),
  t("c", { status: "doing", due: "2026-10-12" }),
  t("d", { due: "2026-10-05" }),
  t("e", { status: "blocked" }),
];
const activity = [
  { at: "2026-10-08T09:00:00Z", projectId: "p1" },
  { at: "2026-10-08T10:00:00Z", projectId: "other" },
];

describe("buildMetricCards", () => {
  const [open, late, stuck, cycle] = buildMetricCards({ tasks, project, today: TODAY });

  it("counts open, overdue and blocked tasks", () => {
    expect(open).toMatchObject({ value: 3, context: "1 in progress, 5 in total" });
    expect(late).toMatchObject({ value: 1, context: "Oldest is 4 days late" });
    expect(stuck).toMatchObject({ value: 1, context: "Cannot move forward, plus 1 blocking question" });
  });

  it("links overdue and blocked to the Tasks tab with a status filter", () => {
    expect(late.nav).toMatchObject({ tab: "tasks", params: { status: "overdue" } });
    expect(stuck.nav).toMatchObject({ tab: "tasks", params: { status: "blocked" } });
    expect(cycle.nav).toBeNull();
  });

  it("reports median cycle time with the 85th percentile", () => {
    // Spans are 2 and 3 days; the card shows whole days, so 2.5 reads as 3.
    expect(cycle).toMatchObject({ value: 3, label: "Median cycle time in days" });
    expect(cycle.context).toBe("85% finish within 3 days, from 2 tasks");
  });

  it("explains an empty cycle time", () => {
    const none = buildMetricCards({ tasks: [t("x")], project, today: TODAY })[3];
    expect(none).toMatchObject({ value: 0, context: "No finished tasks yet" });
    const unstarted = buildMetricCards({ tasks: [t("x", { status: "done", doneAt: "2026-10-01" })], project, today: TODAY })[3];
    expect(unstarted.context).toBe("Finished tasks have no start date yet");
  });

  it("says when nothing is overdue or blocked", () => {
    const cards = buildMetricCards({ tasks: [t("x")], project: { ...project, questions: [] }, today: TODAY });
    expect(cards[1].context).toBe("Nothing is overdue");
    expect(cards[2].context).toBe("Nothing is blocked");
  });
});

describe("buildOverviewModel", () => {
  const model = buildOverviewModel({ project, tasks, activity, today: TODAY });

  it("assembles every region", () => {
    expect(model.isEmpty).toBe(false);
    expect(model.mix.map((m) => [m.key, m.value])).toEqual([["todo", 1], ["doing", 1], ["blocked", 1], ["done", 2]]);
    expect(model.mix.every((m) => m.color)).toBe(true);
    expect(model.burnup.data.length).toBeGreaterThan(0);
    expect(model.milestones.map((m) => m.id)).toEqual(["m1"]);
    expect(model.attention.total).toBe(2);
  });

  it("gives each workstream a tone and caption", () => {
    expect(model.progress).toHaveLength(1);
    expect(model.progress[0]).toMatchObject({ tone: "danger", detail: "2 of 5 done, 1 overdue, 1 blocked" });
  });

  it("counts only this project's activity", () => {
    expect(model.heat.total).toBe(1);
    expect(model.heat.days.find((d) => d.date === "2026-10-08").count).toBe(1);
  });

  it("flags a project with no tasks", () => {
    const empty = buildOverviewModel({ project, tasks: [], activity: [], today: TODAY });
    expect(empty.isEmpty).toBe(true);
    expect(empty.burnup.data).toEqual([]);
  });
});
