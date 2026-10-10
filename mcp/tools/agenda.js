// get_agenda: what needs attention across projects. Date math reuses metrics.js
// (UTC day numbers; `today` is a plain "YYYY-MM-DD" calendar day).
import { z } from "zod";
import { overdue, dueWithin, blocked, addDays, diffDays, day, toDayString } from "../../src/features/Opus/lib/metrics.js";
import { findProject, projectRecordOf } from "../store.js";
import { handler, snapshotOf, taskView, norm } from "./util.js";
import { isoDate } from "./schemas.js";

const DEFAULT_DAYS = 7;
const DEFAULT_LIMIT = 20;
const PRIORITY_RANK = { p1: 0, p2: 1, p3: 2 };
const INACTIVE = ["Paused", "Done"];

const rank = (p) => PRIORITY_RANK[p] ?? 3;
const byPriorityThenTitle = (a, b) => rank(a.priority) - rank(b.priority) || String(a.title).localeCompare(String(b.title));
const byDueThenPriority = (a, b) => String(a.due ?? "9").localeCompare(String(b.due ?? "9")) || byPriorityThenTitle(a, b);

const cap = (list, limit) => list.slice(0, limit);

const questionView = (snap, rec) => {
  const proj = projectRecordOf(snap, rec.projectId);
  const q = rec.item;
  return {
    project: proj?.item.name ?? null, projectId: rec.projectId, id: q.id, title: q.question, due: null,
    owner: q.owner || null, workstream: proj?.item.workstreams.find((w) => w.id === q.workstreamId)?.name ?? null,
    priority: null, status: q.status, blocking: true, openSince: day(q.createdAt) || null,
  };
};

const milestoneRows = (snap, projects, today, end) =>
  projects.flatMap((rec) =>
    rec.item.milestones
      .filter((m) => m.status !== "done")
      .map((m) => ({ m, date: day(m.date) }))
      .filter(({ m, date }) => m.status === "at-risk" || (date && date <= end))
      .map(({ m, date }) => {
        const reason = date && date < today ? "overdue" : m.status === "at-risk" ? "at-risk" : "due";
        return {
          project: rec.item.name, projectId: rec.item.id, id: m.id, title: m.title, due: date || null,
          owner: rec.item.workstreams.find((w) => w.id === m.workstreamId)?.owner || null,
          workstream: rec.item.workstreams.find((w) => w.id === m.workstreamId)?.name ?? null,
          priority: null, status: m.status, reason, daysUntil: date ? diffDays(date, today) : null,
        };
      }),
  ).sort((a, b) => String(a.due ?? "9").localeCompare(String(b.due ?? "9")) || String(a.title).localeCompare(String(b.title)));

/** Pure: snapshot in, grouped agenda out. */
export const buildAgenda = (snap, { project, owner, days = DEFAULT_DAYS, today, limit = DEFAULT_LIMIT }) => {
  const projRec = project ? findProject(snap, project) : null;
  const projects = projRec ? [projRec] : snap.projects.filter((p) => !INACTIVE.includes(p.item.status));
  const taskRecs = (projRec ? projRec.tasks : [...projects.flatMap((p) => p.tasks), ...snap.inboxTasks])
    .filter((r) => !owner || norm(r.item.owner) === norm(owner));
  const recById = new Map(taskRecs.map((r) => [r.item.id, r]));
  const view = (t) => taskView(snap, recById.get(t.id));
  const items = taskRecs.map((r) => r.item);

  // A task shows in its most urgent group only; its status field tells the rest.
  const seen = new Set();
  const take = (tasks) => tasks.filter((t) => !seen.has(t.id)).map((t) => {
    seen.add(t.id);
    return view(t);
  });

  const overdueRows = take(overdue(items, today)).map((v) => ({ ...v, daysOverdue: diffDays(today, day(v.due)) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue || byPriorityThenTitle(a, b));
  const dueTodayRows = take(dueWithin(items, 0, today)).sort(byPriorityThenTitle);
  const dueSoonRows = take(dueWithin(items, days, today).filter((t) => day(t.due) > today)).sort(byDueThenPriority);
  const blockedRows = take(blocked(items)).sort(byDueThenPriority);
  const doingRows = take(items.filter((t) => t.status === "doing")).sort(byDueThenPriority);
  const nextRows = items.filter((t) => t.isNextAction === true && t.status !== "done").map(view)
    .sort((a, b) => String(a.project).localeCompare(String(b.project)) || byPriorityThenTitle(a, b));

  const questionRecs = projects.flatMap((p) => p.questions)
    .filter((r) => r.item.status === "open" && r.item.blocking === true && (!owner || norm(r.item.owner) === norm(owner)));
  const questionRows = questionRecs.map((r) => questionView(snap, r))
    .sort((a, b) => String(a.openSince ?? "9").localeCompare(String(b.openSince ?? "9")) || String(a.title).localeCompare(String(b.title)));
  const milestones = milestoneRows(snap, projects, today, addDays(today, days));

  const groups = {
    overdue: overdueRows, dueToday: dueTodayRows, dueSoon: dueSoonRows, blocked: blockedRows, doing: doingRows,
    nextActions: nextRows, blockingQuestions: questionRows, milestones,
  };
  const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
  return {
    today, days, project: projRec?.item.name ?? null, owner: owner ?? null, counts,
    truncated: Object.values(groups).some((v) => v.length > limit),
    ...Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, cap(v, limit)])),
  };
};

export const registerAgenda = (server, vault) => {
  server.registerTool("get_agenda", {
    description:
      "What needs attention: use for 'what should I work on today', morning planning or a status check. Groups, most urgent first: overdue (most days late first), dueToday, dueSoon (next `days`), blocked, doing, nextActions (each project's flagged next task), blockingQuestions (open, blocking), milestones (overdue, due within `days`, or at-risk). A task appears only in its most urgent date/blocked/doing group (nextActions is always complete). Skips Paused/Done projects unless `project` is given. `owner` filters tasks and questions. Days are plain calendar days (UTC day numbers, like the app's metrics); `today` defaults to this machine's local date. `limit` caps each group; counts are always the full totals.",
    inputSchema: {
      project: z.string().optional().describe("Name or id; default all projects plus the inbox"),
      owner: z.string().optional(),
      days: z.number().int().min(0).max(365).default(DEFAULT_DAYS).describe("Look-ahead window in days"),
      today: isoDate.optional().describe("YYYY-MM-DD, default today"),
      limit: z.number().int().min(1).max(200).default(DEFAULT_LIMIT).describe("Max items per group"),
    },
  }, handler(async ({ project, owner, days = DEFAULT_DAYS, today, limit = DEFAULT_LIMIT }) => {
    const snap = await snapshotOf(vault);
    return buildAgenda(snap, { project, owner, days, today: today ? day(today) : toDayString(new Date()), limit });
  }));
};
