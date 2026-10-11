import { describe, it, expect } from "vitest";
import { buildHubOverview, forecastSentence, heatSummary } from "./hubOverview.js";

const TODAY = "2026-10-09";
const NOW = new Date("2026-10-09T12:00:00Z");
const t = (id, patch) => ({ id, title: id, projectId: "p", status: "todo", createdAt: "2026-09-01", ...patch });
const project = {
  id: "p", startDate: "2026-09-01", targetDate: "2026-10-20", questions: [{ status: "open", blocking: true }],
  workstreams: [{ id: "w1", name: "Eng", color: "1" }],
};
const tasks = [
  t("a", { status: "done", doneAt: "2026-10-08", workstreamId: "w1" }),
  t("b", { status: "doing", workstreamId: "w1" }),
  t("c", { status: "blocked", due: "2026-10-01" }),
  t("d"),
];

describe("buildHubOverview", () => {
  const o = buildHubOverview({ project, tasks, activity: [], today: TODAY, now: NOW });

  it("counts progress and tiles", () => {
    expect(o).toMatchObject({ total: 4, done: 1, pct: 25, isEmpty: false });
    expect(o.tiles).toMatchObject({ open: 3, doing: 1, overdue: 1, thisWeek: 1 });
    expect(o.tiles.blocking).toEqual({ tasks: 1, questions: 1, total: 2 });
  });

  it("colours the status mix in greys, with red only for blocked", () => {
    expect(o.mix.find((s) => s.key === "blocked").color).toBe("var(--danger)");
    expect(o.mix.filter((s) => s.key !== "blocked").every((s) => !/danger|series|success/.test(s.color))).toBe(true);
  });

  it("lists the status mix counts", () => {
    expect(o.mix.map((s) => [s.key, s.value])).toEqual([["todo", 1], ["doing", 1], ["blocked", 1], ["done", 1]]);
  });

  it("is empty without tasks", () => {
    expect(buildHubOverview({ project, tasks: [], activity: [], today: TODAY, now: NOW }).isEmpty).toBe(true);
  });
});

describe("forecastSentence", () => {
  it("flags a finish after the target", () => {
    const done = Array.from({ length: 4 }, (_, i) => t(`d${i}`, { status: "done", doneAt: "2026-10-07" }));
    const open = Array.from({ length: 40 }, (_, i) => t(`o${i}`));
    const f = forecastSentence({ tasks: [...done, ...open], targetDate: "2026-10-20", today: TODAY });
    expect(f.text).toMatch(/^At .* tasks? a week, the open work finishes around \d+ [A-Z][a-z]{2}$/);
    expect(f.isLate).toBe(true);
  });

  it("handles no forecast and all done", () => {
    expect(forecastSentence({ tasks: [t("x")], targetDate: null, today: TODAY }).text).toBe("Not enough finished work to forecast yet");
    expect(forecastSentence({ tasks: [t("x", { status: "done", doneAt: TODAY })], targetDate: null, today: TODAY }).text).toBe("All tasks are done");
    expect(forecastSentence({ tasks: [], targetDate: null, today: TODAY }).text).toBe("");
  });
});

describe("heatSummary", () => {
  it("names the busiest day", () => {
    const days = [{ date: "2026-08-17", count: 2 }, { date: "2026-08-18", count: 12 }, { date: "2026-08-19", count: 0 }];
    expect(heatSummary(days).text).toBe("Busiest day 18 Aug, 12 changes.");
  });
  it("says so when nothing changed", () => {
    expect(heatSummary([{ date: "2026-08-17", count: 0 }]).total).toBe(0);
  });
});
