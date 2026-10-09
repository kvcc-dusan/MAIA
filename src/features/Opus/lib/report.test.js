import { describe, it, expect } from "vitest";
import { reportMarkdown, buildReportSummary, reportNoteTitle } from "./report.js";
import { weekRange } from "./metrics.js";

const TODAY = "2026-10-09"; // a Friday

const project = {
  id: "p1",
  name: "Maia Core",
  targetDate: "2026-11-30",
  workstreams: [{ id: "wa", name: "Design" }],
  decisions: [{ id: "d1", title: "Use SQLite", date: "2026-10-07" }],
  questions: [
    { id: "q1", question: "Who owns billing?", status: "open", blocking: true, owner: "Sam" },
    { id: "q2", question: "Which font?", status: "open", blocking: false },
  ],
  milestones: [{ id: "m1", title: "Alpha", status: "at-risk", date: "2026-10-14" }],
};

const tasks = [
  { id: "t1", title: "Wire auth", status: "done", workstreamId: "wa", createdAt: "2026-09-20T08:00:00Z", startedAt: "2026-10-05T08:00:00Z", doneAt: "2026-10-06T10:00:00Z" },
  { id: "t2", title: "Draft API", status: "doing", workstreamId: "wa", createdAt: "2026-10-01T08:00:00Z", startedAt: "2026-10-07T09:00:00Z", due: "2026-10-08" },
  { id: "t3", title: "Fix sync", status: "blocked", createdAt: "2026-10-01T08:00:00Z", due: "2026-10-20" },
  { id: "t4", title: "Review copy", status: "todo", workstreamId: "wa", createdAt: "2026-10-08T08:00:00Z", due: "2026-10-14" },
];

describe("buildReportSummary", () => {
  it("adds overall progress and a forecast for the current week", () => {
    const range = weekRange(TODAY);
    const sum = buildReportSummary({ project, tasks, range, today: TODAY });
    expect(sum.overallPct).toBe(25);
    expect(sum.finishDate).toBe("2027-01-22");
    expect(sum.done.map((t) => t.id)).toEqual(["t1"]);
    expect(sum.slipped.map((t) => t.id)).toEqual(["t2"]);
    expect(sum.blockingQuestions.map((q) => q.id)).toEqual(["q1"]);
  });

  it("measures progress as of the end of a past week and skips the forecast", () => {
    const range = weekRange(TODAY, -1); // 2026-09-28 .. 2026-10-04
    const sum = buildReportSummary({ project, tasks, range, today: TODAY });
    expect(sum.overallPct).toBe(0);
    expect(sum.finishDate).toBeUndefined();
  });

  it("leaves overallPct out when nothing existed yet", () => {
    const sum = buildReportSummary({ project, tasks: [], range: weekRange(TODAY), today: TODAY });
    expect(sum.overallPct).toBeUndefined();
  });
});

describe("reportMarkdown", () => {
  it("renders the full report for the current week", () => {
    const range = weekRange(TODAY);
    const summary = buildReportSummary({ project, tasks, range, today: TODAY });
    expect(reportMarkdown({ project, summary, range })).toBe(
      [
        "# Maia Core: status, week of 5 Oct",
        "",
        "1 task done, 2 started, 1 slipped. Overall 25% done; forecast finish 22 Jan (target 30 Nov).",
        "",
        "## Done",
        "",
        "- Wire auth (Design)",
        "",
        "## In progress",
        "",
        "- Wire auth (Design)",
        "- Draft API (Design)",
        "",
        "## Slipped",
        "",
        "- Draft API (was due 8 Oct)",
        "",
        "## Blockers",
        "",
        "- Fix sync",
        "- Question: Who owns billing? (owner: Sam)",
        "",
        "## Decisions",
        "",
        "- Use SQLite (7 Oct)",
        "",
        "## Milestones",
        "",
        "- Due soon: Alpha (14 Oct)",
        "- At risk: Alpha (due 14 Oct)",
        "",
        "## Next week",
        "",
        "- Review copy, Wed 14 Oct",
        "",
      ].join("\n"),
    );
  });

  it("says nothing is blocking and drops empty sections", () => {
    const range = weekRange(TODAY);
    const md = reportMarkdown({
      project: { name: "Solo" },
      summary: { done: [{ id: "a", title: "Ship it" }] },
      range,
    });
    expect(md).toBe(
      [
        "# Solo: status, week of 5 Oct",
        "",
        "1 task done, 0 started, 0 slipped.",
        "",
        "## Done",
        "",
        "- Ship it",
        "",
        "## Blockers",
        "",
        "Nothing blocking.",
        "",
      ].join("\n"),
    );
  });

  it("falls back to the target date when there is progress but no forecast", () => {
    const md = reportMarkdown({
      project: { name: "P", targetDate: "2026-11-30" },
      summary: { overallPct: 40 },
      range: weekRange(TODAY),
    });
    expect(md).toContain("0 tasks done, 0 started, 0 slipped. Overall 40% done; target 30 Nov.");
  });

  it("copes with no summary and no project", () => {
    const md = reportMarkdown({ range: weekRange(TODAY) });
    expect(md).toContain("# Project: status, week of 5 Oct");
    expect(md).toContain("Nothing blocking.");
  });

  it("includes owners when tasks have one and never prints an em dash", () => {
    const range = weekRange(TODAY);
    const md = reportMarkdown({
      project: { name: "P" },
      summary: {
        blockers: [{ id: "b", title: "Stuck", owner: "Ana" }],
        nextWeek: [{ id: "n", title: "Plan", owner: "Ana", due: "2026-10-12" }, { id: "m", title: "Later" }],
      },
      range,
    });
    expect(md).toContain("- Stuck (owner: Ana)");
    expect(md).toContain("- Plan, Ana, Mon 12 Oct");
    expect(md).toContain("- Later, No date");
    expect(md).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("reportNoteTitle", () => {
  it("names the note after the project and the Monday of the week", () => {
    expect(reportNoteTitle({ name: "Maia Core" }, weekRange(TODAY))).toBe("Weekly report: Maia Core, 2026-10-05");
    expect(reportNoteTitle(null, weekRange(TODAY))).toBe("Weekly report: Project, 2026-10-05");
  });
});
