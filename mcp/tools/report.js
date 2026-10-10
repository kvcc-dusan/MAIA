// weekly_report: the app's own generator (Opus/lib/report.js) fed the same way ReportTab feeds it.
import { z } from "zod";
import { buildReportSummary, reportMarkdown, reportNoteTitle } from "../../src/features/Opus/lib/report.js";
import { weekRange, toDayString, day } from "../../src/features/Opus/lib/metrics.js";
import { findProject } from "../store.js";
import { handler, snapshotOf, norm } from "./util.js";
import { isoDate } from "./schemas.js";
import { loadNotes, createNoteFile } from "./notes.js";

export const registerReport = (server, vault) => {
  server.registerTool("weekly_report", {
    description:
      "Generate a project's weekly status report as markdown, identical to the app's Weekly report tab (week = Monday to Sunday, forecast and slipped use `today`). Use for 'write the weekly report' or a status summary. `week_start` is any date inside the wanted week (default: the current week). With save: true it also creates a vault note 'Weekly report: <project>, <Monday>' tagged #report and linked to the project; if that note already exists nothing is written and its path is returned.",
    inputSchema: {
      project: z.string().describe("Name or id"),
      week_start: isoDate.optional().describe("Any date in the wanted week; default current week"),
      save: z.boolean().default(false),
      today: isoDate.optional().describe("YYYY-MM-DD, default today (local date, like the app)"),
    },
  }, handler(async ({ project, week_start, save = false, today: todayArg }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const today = todayArg ? day(todayArg) : toDayString(new Date());
    const range = weekRange(week_start ? day(week_start) : today);
    // Same project shape the app has: decisions and questions embedded next to the project fields.
    const meta = { ...rec.item, decisions: rec.decisions.map((r) => r.item), questions: rec.questions.map((r) => r.item) };
    const tasks = rec.tasks.map((r) => r.item);
    const summary = buildReportSummary({ project: meta, tasks, range, today });
    const markdown = reportMarkdown({ project: meta, summary, range });
    const result = { project: rec.item.name, range, markdown };
    if (!save) return result;
    if (tasks.length === 0) return { ...result, saved: false, message: "Nothing to report yet (the project has no tasks), so no note was saved." };

    const title = reportNoteTitle(meta, range);
    const existing = (await loadNotes(vault)).find((n) => norm(n.title) === norm(title));
    if (existing) return { ...result, saved: false, file: existing.file, message: `A note titled "${title}" already exists, nothing was written.` };
    const note = await createNoteFile(vault, snap, {
      title,
      // The tag lives in the text too: the app re-derives tags from inline #tags on edit.
      content: `${markdown.trimEnd()}\n\n#report\n`,
      tags: ["report"],
      project: rec.item.id,
    });
    return { ...result, saved: true, file: note.file, id: note.id, ...(note.warning ? { warning: note.warning } : {}) };
  }));
};
