// Port of projecthub/src/metrics.test.cjs. Same fixture, same assertions, plus
// a few for the MAIA field names (workstreamId, milestone date) and ISO dues.
import { describe, it, expect } from "vitest";
import * as M from "./metrics.js";

const TODAY = "2026-10-09"; // a Friday
const ids = (list) => list.map((x) => x.id);

const workstreams = [
  { id: "wb", name: "Build", order: 2, color: "3" },
  { id: "wa", name: "Design", order: 1 },
];
const tasks = [
  { id: "t1", workstream: "wa", status: "done", createdAt: "2026-09-14T08:00:00Z", startedAt: "2026-09-15T08:00:00Z", doneAt: "2026-09-22T10:00:00Z" },
  { id: "t2", workstream: "wa", status: "done", createdAt: "2026-09-14T08:00:00Z", startedAt: "2026-09-28T08:00:00Z", doneAt: "2026-09-30T10:00:00Z" },
  { id: "t3", workstream: "wa", status: "done", createdAt: "2026-09-20T08:00:00Z", startedAt: "2026-10-05T08:00:00Z", doneAt: "2026-10-06T10:00:00Z" },
  { id: "t4", workstream: "wa", status: "doing", createdAt: "2026-10-01T08:00:00Z", startedAt: "2026-10-05T09:00:00Z", due: "2026-10-12" },
  { id: "t5", workstream: "wa", status: "blocked", createdAt: "2026-10-01T08:00:00Z", due: "2026-10-07" },
  { id: "t6", workstream: "wa", status: "todo", createdAt: "2026-10-06T08:00:00Z", due: "2026-10-14" },
  { id: "t7", workstream: "wb", status: "done", createdAt: "2026-09-14T08:00:00Z", startedAt: "2026-09-29T08:00:00Z", doneAt: "2026-10-01T10:00:00Z" },
  { id: "t8", workstream: "wb", status: "done", createdAt: "2026-09-14T08:00:00Z", startedAt: "2026-10-05T08:00:00Z", doneAt: "2026-10-08T10:00:00Z" },
  { id: "t9", workstream: "wb", status: "doing", createdAt: "2026-10-02T08:00:00Z", startedAt: "2026-10-07T08:00:00Z", due: "2026-10-08" },
  { id: "t10", workstream: "wb", status: "todo", due: "2026-10-09" },
  { id: "t11", workstream: "wb", status: "todo", createdAt: "2026-10-08T08:00:00Z", due: "2026-10-16" },
  { id: "t12", workstream: "wb", status: "blocked", createdAt: "2026-09-14T08:00:00Z", due: "2026-10-02" },
];
const activity = [
  { at: "2026-09-28T09:00:00Z" }, { at: "2026-09-28T17:00:00Z" }, { at: "2026-10-06T12:00:00Z" }, { at: "2026-10-09T07:00:00Z" },
];
const decisions = [{ id: "d1", date: "2026-10-07" }, { id: "d2", date: "2026-09-30" }];
const questions = [
  { id: "q1", status: "open", blocking: true },
  { id: "q2", status: "open", blocking: false },
  { id: "q3", status: "answered", blocking: true, updatedAt: "2026-10-08T10:00:00Z" },
  { id: "q4", status: "answered", updatedAt: "2026-09-20T10:00:00Z" },
];
const milestones = [
  { id: "m1", status: "done", due: "2026-10-03", updatedAt: "2026-10-02T10:00:00Z" },
  { id: "m2", status: "at-risk", due: "2026-10-14" },
  { id: "m3", status: "planned", due: "2026-10-30" },
  { id: "m4", status: "done", due: "2026-09-01", updatedAt: "2026-09-01T10:00:00Z" },
];
const state = { tasks, workstreams, activity, decisions, questions, milestones };

describe("weekRange", () => {
  it("returns Monday to Sunday", () => {
    expect(M.weekRange(TODAY)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(M.weekRange(TODAY, -1)).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(M.weekRange("2026-10-11")).toEqual({ from: "2026-10-05", to: "2026-10-11" }); // Sunday
    expect(M.weekRange("2026-10-05")).toEqual({ from: "2026-10-05", to: "2026-10-11" }); // Monday
  });
});

describe("statusMix", () => {
  it("counts every status in fixed order", () => {
    expect(M.statusMix(tasks)).toEqual([
      { key: "todo", label: "To do", value: 3 },
      { key: "doing", label: "In progress", value: 2 },
      { key: "blocked", label: "Blocked", value: 2 },
      { key: "done", label: "Done", value: 5 },
    ]);
  });
});

describe("overdue, dueWithin, blocked", () => {
  it("excludes done tasks and sorts by due", () => {
    expect(ids(M.overdue(tasks, TODAY))).toEqual(["t12", "t5", "t9"]);
    expect(ids(M.dueWithin(tasks, 7, TODAY))).toEqual(["t10", "t4", "t6", "t11"]);
    expect(ids(M.dueWithin(tasks, 0, TODAY))).toEqual(["t10"]);
    expect(ids(M.blocked(tasks))).toEqual(["t12", "t5"]);
  });

  it("reads ISO timestamp dues by their date part", () => {
    const iso = [
      { id: "a", status: "todo", due: "2026-10-16T09:30:00.000Z" },
      { id: "b", status: "todo", due: "2026-10-08T23:00:00.000Z" },
      { id: "c", status: "todo", due: "2026-10-09T08:00:00.000Z" },
    ];
    expect(ids(M.dueWithin(iso, 7, TODAY))).toEqual(["c", "a"]);
    expect(ids(M.overdue(iso, TODAY))).toEqual(["b"]);
  });
});

describe("workstreamProgress", () => {
  it("reports per workstream totals, sorted by order", () => {
    expect(M.workstreamProgress(workstreams, tasks, TODAY)).toEqual([
      { id: "wa", name: "Design", color: "1", total: 6, done: 3, pct: 50, overdue: 1, blocked: 1 },
      { id: "wb", name: "Build", color: "3", total: 6, done: 2, pct: 33, overdue: 2, blocked: 1 },
    ]);
    expect(M.workstreamProgress([{ id: "x", name: "Empty", order: 1 }], [], TODAY)[0].pct).toBe(0);
  });

  it("matches tasks by workstreamId as well as the hub's workstream field", () => {
    const own = [
      { id: "a", workstreamId: "w", status: "done" },
      { id: "b", workstreamId: "w", status: "todo" },
      { id: "c", workstream: "w", status: "todo" },
      { id: "d", workstreamId: "other", status: "todo" },
    ];
    expect(M.workstreamProgress([{ id: "w", name: "W" }], own, TODAY)[0]).toMatchObject({ total: 3, done: 1, pct: 33 });
  });
});

describe("cycleTime", () => {
  it("takes the median and p85 of started-to-done spans", () => {
    // spans 7, 2, 1, 2, 3 days
    expect(M.cycleTime(tasks)).toEqual({ median: 2, p85: 7, n: 5 });
    expect(M.cycleTime([])).toEqual({ median: 0, p85: 0, n: 0 });
  });
});

describe("throughput", () => {
  it("counts done tasks per week, oldest first", () => {
    expect(M.throughput(tasks, { weeks: 3, today: TODAY })).toEqual([
      { weekStart: "2026-09-21", label: "21 Sep", count: 1 },
      { weekStart: "2026-09-28", label: "28 Sep", count: 2 },
      { weekStart: "2026-10-05", label: "5 Oct", count: 2 },
    ]);
    expect(M.throughput(tasks, { today: TODAY })).toHaveLength(8);
  });
});

describe("burnup", () => {
  it("has one point per day up to min(end, today)", () => {
    const bu = M.burnup(tasks, { start: "2026-10-01", end: "2026-10-31", today: TODAY });
    expect(bu).toHaveLength(9);
    expect(bu[0]).toEqual({ date: "2026-10-01", scope: 9, done: 3 });
    expect(bu[bu.length - 1]).toEqual({ date: "2026-10-09", scope: 12, done: 5 });
    expect(M.burnup(tasks, { start: "2026-10-01", end: "2026-10-03", today: TODAY })).toHaveLength(3);
    expect(M.burnup(tasks, { start: "2026-10-20", end: "2026-10-31", today: TODAY })).toEqual([]);
  });
});

describe("projection", () => {
  it("extrapolates 5 done over 4 full weeks plus 5 days of this week", () => {
    expect(M.projection(tasks, { today: TODAY, weeks: 4 })).toEqual({ perWeek: 1.1, remaining: 7, finishDate: "2026-11-27" });
    expect(M.projection([{ status: "todo" }], { today: TODAY })).toEqual({ perWeek: 0, remaining: 1, finishDate: null });
  });
});

describe("heatmap", () => {
  it("returns one cell per day starting on a Monday", () => {
    const hm = M.heatmap(activity, { weeks: 2, today: TODAY });
    expect(hm).toHaveLength(12);
    expect(hm[0].date).toBe("2026-09-28");
    expect(new Date(hm[0].date + "T00:00:00Z").getUTCDay()).toBe(1);
    expect(hm[hm.length - 1].date).toBe(TODAY);
    expect(hm.filter((d) => d.count).map((d) => [d.date, d.count])).toEqual([["2026-09-28", 2], ["2026-10-06", 1], ["2026-10-09", 1]]);
    expect(M.heatmap([], { today: TODAY })).toHaveLength(25 * 7 + 5);
  });
});

describe("weekSummary", () => {
  const { from, to } = M.weekRange(TODAY);
  const ws = M.weekSummary(state, { from, to, today: TODAY });

  it("buckets this week's tasks, blockers, decisions and questions", () => {
    expect(ids(ws.done)).toEqual(["t3", "t8"]);
    expect(ids(ws.started)).toEqual(["t3", "t4", "t8", "t9"]);
    expect(ids(ws.created)).toEqual(["t6", "t11"]);
    expect(ids(ws.slipped)).toEqual(["t5", "t9"]);
    expect(ids(ws.blockers)).toEqual(["t12", "t5"]);
    expect(ids(ws.blockingQuestions)).toEqual(["q1"]);
    expect(ids(ws.decisions)).toEqual(["d1"]);
    expect(ids(ws.answered)).toEqual(["q3"]);
    expect(ids(ws.nextWeek)).toEqual(["t4", "t6", "t11"]);
  });

  it("buckets milestones", () => {
    expect(ids(ws.milestones.hit)).toEqual([]);
    expect(ids(ws.milestones.due)).toEqual(["m2"]);
    expect(ids(ws.milestones.atRisk)).toEqual(["m2"]);
  });

  it("looks back a week", () => {
    const last = M.weekSummary(state, { ...M.weekRange(TODAY, -1), today: TODAY });
    expect(ids(last.milestones.hit)).toEqual(["m1"]);
    expect(ids(last.done)).toEqual(["t2", "t7"]);
    expect(ids(last.slipped)).toEqual(["t12"]);
  });

  it("copes with an empty state", () => {
    expect(ids(M.weekSummary({}, { from, to, today: TODAY }).done)).toEqual([]);
  });

  it("reads MAIA milestones that use date instead of due", () => {
    const maia = [
      { id: "a", status: "at-risk", date: "2026-10-14" },
      { id: "b", status: "done", date: "2026-10-06" },
      { id: "c", status: "planned", date: "2026-12-01" },
    ];
    const s = M.weekSummary({ milestones: maia }, { from, to, today: TODAY });
    expect(ids(s.milestones.due)).toEqual(["a"]);
    expect(ids(s.milestones.hit)).toEqual(["b"]);
  });
});

describe("date helpers", () => {
  it("addDays, diffDays and weekStart are UTC day arithmetic", () => {
    expect(M.addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(M.addDays("2026-03-29", 1)).toBe("2026-03-30"); // DST night in Europe
    expect(M.diffDays("2026-10-09", "2026-10-01")).toBe(8);
    expect(M.weekStart("2026-10-11")).toBe("2026-10-05");
    expect(M.day("2026-10-09T23:59:00Z")).toBe("2026-10-09");
    expect(M.toDayString(new Date(2026, 9, 9, 23, 59))).toBe("2026-10-09");
  });
});

describe("hub overview helpers", () => {
  const { doneThisWeek, weeklyDone, averagePerWeek, blockingSummary, daysToTarget, timeAgo, activityFeed } = M;
  // Fri 9 Oct 2026; the week starts Mon 5 Oct.
  const TODAY = "2026-10-09";
  const done = (doneAt) => ({ status: "done", doneAt });

  it("doneThisWeek counts Monday through today", () => {
    const tasks = [done("2026-10-05T08:00:00Z"), done("2026-10-09T08:00:00Z"), done("2026-10-04T23:00:00Z"), { status: "todo" }];
    expect(doneThisWeek(tasks, TODAY)).toBe(2);
  });

  it("weeklyDone is oldest first and ends with this week", () => {
    const weekly = weeklyDone([done("2026-10-06"), done("2026-09-29"), done("2026-09-30")], { weeks: 3, today: TODAY });
    expect(weekly.map((w) => w.count)).toEqual([0, 2, 1]);
    expect(weekly[2].weekStart).toBe("2026-10-05");
  });

  it("averagePerWeek is the mean to one decimal", () => {
    expect(averagePerWeek([{ count: 1 }, { count: 2 }, { count: 2 }])).toBe(1.7);
    expect(averagePerWeek([])).toBe(0);
  });

  it("blockingSummary adds blocked tasks and open blocking questions", () => {
    const tasks = [{ status: "blocked" }, { status: "blocked" }, { status: "todo" }];
    const questions = [
      { status: "open", blocking: true },
      { status: "answered", blocking: true },
      { status: "open", blocking: false },
    ];
    expect(blockingSummary(tasks, questions)).toEqual({ tasks: 2, questions: 1, total: 3 });
    expect(blockingSummary([], undefined)).toEqual({ tasks: 0, questions: 0, total: 0 });
  });

  it("daysToTarget is signed and null without a target", () => {
    expect(daysToTarget({ targetDate: "2026-10-19" }, TODAY)).toBe(10);
    expect(daysToTarget({ targetDate: "2026-10-07" }, TODAY)).toBe(-2);
    expect(daysToTarget({ targetDate: null }, TODAY)).toBeNull();
    expect(daysToTarget(null, TODAY)).toBeNull();
  });

  it("timeAgo picks a human unit", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    expect(timeAgo("2026-10-09T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-09T11:59:00Z", now)).toBe("1 minute ago");
    expect(timeAgo("2026-10-09T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-08T09:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-10-07T12:00:00Z", now)).toBe("2 days ago");
    expect(timeAgo("2026-09-18T12:00:00Z", now)).toBe("3 weeks ago");
    expect(timeAgo("2026-07-01T12:00:00Z", now)).toBe("3 months ago");
  });

  it("activityFeed is newest first, capped, labelled and does not mutate", () => {
    const log = [
      { at: "2026-10-01T10:00:00Z", title: "a" },
      { at: "2026-10-08T10:00:00Z", title: "b" },
      { at: "2026-10-07T10:00:00Z", title: "c" },
    ];
    const feed = activityFeed(log, { limit: 2, now: new Date("2026-10-09T10:00:00Z") });
    expect(feed.map((e) => [e.title, e.ago])).toEqual([["b", "yesterday"], ["c", "2 days ago"]]);
    expect(log[0].title).toBe("a");
  });
});
