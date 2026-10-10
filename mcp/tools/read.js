// Read tools: projects, tasks, decisions, questions, activity.
import path from "node:path";
import { z } from "zod";
import { short } from "./schemas.js";
import { findProject, findRecord, allTaskRecords } from "../store.js";
import { readText, ACTIVITY_FILE, INBOX_DIR } from "../fsx.js";
import { parseActivity } from "../../src/lib/opusFiles/activityFile.js";
import { handler, snapshotOf, taskView, rel, norm, resolveWorkstream } from "./util.js";

const limit = z.number().int().min(1).max(500).default(50).describe("Max results");
const STATUSES = ["todo", "doing", "blocked", "done"];

const countsByStatus = (tasks) =>
  Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.item.status === s).length]));

const projectSummary = (snap, rec) => ({
  id: rec.item.id, name: rec.item.name, status: rec.item.status, phase: rec.item.phase,
  headline: rec.item.headline, targetDate: rec.item.targetDate, tasks: countsByStatus(rec.tasks),
  folder: rel(snap, rec.dir),
});

export const registerRead = (server, vault) => {
  server.registerTool("list_projects", {
    description: "List all Opus projects with task counts per status. Also returns files that failed to parse (never modified).",
    inputSchema: {},
  }, handler(async () => {
    const snap = await snapshotOf(vault);
    return { projects: snap.projects.map((p) => projectSummary(snap, p)), warnings: snap.warnings };
  }));

  server.registerTool("get_project", {
    description: "Full project: description, workstreams, milestones, success criteria, links, task counts. project = name or id.",
    inputSchema: { project: short },
  }, handler(async ({ project }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const p = rec.item;
    const wsName = (id) => p.workstreams.find((w) => w.id === id)?.name ?? null;
    return {
      ...projectSummary(snap, rec),
      objective: p.objective, focus: p.focus, startDate: p.startDate, nextMeeting: p.nextMeeting,
      description: p.description ?? "",
      workstreams: p.workstreams,
      milestones: p.milestones.map(({ id, title, date, start, status, workstreamId }) => ({ id, title, date, start, status, workstream: wsName(workstreamId) })),
      successCriteria: p.successCriteria ?? [],
      links: p.links ?? [],
      counts: { tasks: rec.tasks.length, decisions: rec.decisions.length, questions: rec.questions.length },
    };
  }));

  server.registerTool("list_tasks", {
    description: "List tasks, filterable by project (name/id), status, workstream name, owner. Omit project for all, including the inbox.",
    inputSchema: {
      project: short.optional().describe("Project name or id; 'inbox' for tasks with no project"),
      status: z.enum(STATUSES).optional(),
      workstream: short.optional(),
      owner: short.optional(),
      limit,
    },
  }, handler(async ({ project, status, workstream, owner, limit: max = 50 }) => {
    const snap = await snapshotOf(vault);
    let pool;
    let projRec = null;
    if (!project) pool = allTaskRecords(snap);
    else if (norm(project) === "inbox") pool = snap.inboxTasks;
    else {
      projRec = findProject(snap, project);
      pool = projRec.tasks;
    }
    const wsId = workstream && projRec ? resolveWorkstream(projRec, workstream) : null;
    const rows = pool.filter((r) => {
      const t = r.item;
      if (status && t.status !== status) return false;
      if (owner && norm(t.owner) !== norm(owner)) return false;
      if (workstream && !projRec) return taskView(snap, r).workstream?.toLowerCase() === norm(workstream);
      return !wsId || t.workstreamId === wsId;
    });
    return { total: rows.length, tasks: rows.slice(0, max).map((r) => taskView(snap, r)) };
  }));

  server.registerTool("get_task", {
    description: "One task by id, with description and timestamps.",
    inputSchema: { id: short },
  }, handler(async ({ id }) => {
    const snap = await snapshotOf(vault);
    return taskView(snap, findRecord(snap, "task", id), { full: true });
  }));

  server.registerTool("list_decisions", {
    description: "Decisions of a project, newest first.",
    inputSchema: { project: short },
  }, handler(async ({ project }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const ws = (id) => rec.item.workstreams.find((w) => w.id === id)?.name ?? null;
    return rec.decisions
      .map((d) => ({ id: d.item.id, title: d.item.title, date: d.item.date, by: d.item.by, workstream: ws(d.item.workstreamId), detail: d.item.detail }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }));

  server.registerTool("list_questions", {
    description: "Questions of a project, optionally only open or answered.",
    inputSchema: { project: short, status: z.enum(["open", "answered"]).optional() },
  }, handler(async ({ project, status }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const ws = (id) => rec.item.workstreams.find((w) => w.id === id)?.name ?? null;
    return rec.questions
      .filter((q) => !status || q.item.status === status)
      .map((q) => ({
        id: q.item.id, question: q.item.question, status: q.item.status, blocking: q.item.blocking === true,
        owner: q.item.owner, workstream: ws(q.item.workstreamId), answer: q.item.answer, createdAt: q.item.createdAt,
      }));
  }));

  server.registerTool("list_activity", {
    description: "Activity log entries, newest first. since = ISO date or datetime.",
    inputSchema: { project: short.optional(), since: short.optional(), limit },
  }, handler(async ({ project, since, limit: max = 50 }) => {
    const snap = await snapshotOf(vault);
    const dirs = project
      ? [findProject(snap, project).dir]
      : [...snap.projects.map((p) => p.dir), path.join(snap.root, INBOX_DIR)];
    const all = [];
    for (const dir of dirs) {
      const text = await readText(path.join(dir, ACTIVITY_FILE)).catch(() => null);
      if (text) all.push(...parseActivity(text).entries);
    }
    const names = new Map(snap.projects.map((p) => [p.item.id, p.item.name]));
    return all
      .filter((e) => !since || e.at >= since)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, max)
      .map((e) => ({ ...e, project: names.get(e.projectId) ?? null }));
  }));
};
