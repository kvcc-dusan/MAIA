// Write tools: create_task, update_task.
import { z } from "zod";
import { uid } from "../../src/lib/ids.js";
import { applyTaskPatch } from "../../src/features/Opus/lib/taskModel.js";
import { findProject, findRecord, projectRecordOf } from "../store.js";
import { createItemFile, updateItemFile, moveTaskFile, logActivity } from "../writer.js";
import { handler, snapshotOf, taskView, rel, norm, resolveWorkstream, resolveMilestone } from "./util.js";
import { isoDate, taskStatus, priority, estimate, defined } from "./schemas.js";

const SCHEDULES = z.enum(["today", "soon", "future"]);
const INBOX = "inbox";

const taskFields = {
  title: z.string().min(1),
  desc: z.string().optional().describe("Markdown description"),
  status: taskStatus.optional(),
  priority: priority.optional(),
  owner: z.string().optional(),
  estimate: estimate.optional(),
  due: isoDate.optional(),
  workstream: z.string().optional().describe("Workstream name in the project"),
  milestone: z.string().optional().describe("Milestone title in the project"),
  schedule: SCHEDULES.optional(),
  isNextAction: z.boolean().optional(),
};

const projectOrNull = (snap, ref) => (ref == null || norm(ref) === INBOX ? null : findProject(snap, ref));

export const registerTaskWrites = (server, vault) => {
  server.registerTool("create_task", {
    description: "Create a task file. Omit project (or use 'inbox') for Opus/_inbox/tasks. Status goes through the app's transition rule.",
    inputSchema: { project: z.string().optional().describe("Project name or id"), ...taskFields },
  }, handler(async (a) => {
    const snap = await snapshotOf(vault);
    const projRec = projectOrNull(snap, a.project);
    if (!projRec && (a.workstream || a.milestone)) throw new Error("Workstream and milestone need a project.");
    const task = applyTaskPatch(null, defined({
      id: uid(), title: a.title.trim(), desc: a.desc, status: a.status, priority: a.priority, owner: a.owner,
      estimate: a.estimate, due: a.due, schedule: a.schedule, isNextAction: a.isNextAction,
      workstreamId: resolveWorkstream(projRec, a.workstream), milestoneId: resolveMilestone(projRec, a.milestone),
      projectId: projRec ? projRec.item.id : null,
    }));
    const file = await createItemFile(snap, "task", task, projRec);
    const warning = await logActivity(snap, {
      projectId: projRec ? projRec.item.id : null, kind: "created", collection: "tasks", itemId: task.id, title: task.title,
    });
    return { id: task.id, status: task.status, project: projRec ? projRec.item.name : null, file: rel(snap, file), ...(warning ? { warning } : {}) };
  }));

  server.registerTool("update_task", {
    description: "Patch a task by id. Only given keys change; null clears owner, priority, estimate, due, workstream, milestone. project moves the file ('inbox' or null = no project; workstream/milestone are kept by name if the target has them).",
    inputSchema: {
      id: z.string(),
      patch: z.object({
        ...taskFields,
        title: taskFields.title.optional(),
        project: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        priority: priority.nullable().optional(),
        estimate: estimate.nullable().optional(),
        due: isoDate.nullable().optional(),
        workstream: z.string().nullable().optional(),
        milestone: z.string().nullable().optional(),
      }),
    },
  }, handler(async ({ id, patch: p }) => {
    const snap = await snapshotOf(vault);
    const rec = findRecord(snap, "task", id);
    const prev = rec.item;
    const from = projectRecordOf(snap, rec.projectId);
    const moving = "project" in p;
    const to = moving ? projectOrNull(snap, p.project) : from;
    const toId = to ? to.item.id : null;
    const moved = toId !== rec.projectId;

    // Names are what files store: carry the old names over when the target project has them.
    const oldWs = from?.item.workstreams.find((w) => w.id === prev.workstreamId)?.name ?? null;
    const oldMs = from?.item.milestones.find((m) => m.id === prev.milestoneId)?.title ?? null;
    const ws = "workstream" in p ? p.workstream : moved ? oldWs : undefined;
    const ms = "milestone" in p ? p.milestone : moved ? oldMs : undefined;
    const dropped = [];
    const lenient = (fn, name, label, explicit) => {
      if (name === undefined) return undefined;
      try {
        return fn(to, name);
      } catch (e) {
        if (explicit) throw e;
        dropped.push(label);
        return null;
      }
    };

    const { project: _p, workstream: _w, milestone: _m, ...plain } = p;
    const nextRaw = defined({
      ...plain,
      workstreamId: lenient(resolveWorkstream, ws, "workstream", "workstream" in p),
      milestoneId: lenient(resolveMilestone, ms, "milestone", "milestone" in p),
    });
    let next = applyTaskPatch(prev, nextRaw);
    if (prev.status !== "done" && next.status === "done") next = { ...next, isNextAction: false };
    next = { ...next, projectId: toId };

    let file = rec.path;
    if (moved) file = await moveTaskFile(snap, rec, next, to);
    else if (!(await updateItemFile(rec, next, to?.ctx)).written) return { id, unchanged: true };

    const statusChanged = prev.status !== next.status;
    const warning = await logActivity(snap, {
      projectId: toId, kind: statusChanged ? "status" : "updated", collection: "tasks", itemId: id, title: next.title,
      from: statusChanged ? prev.status : null, to: statusChanged ? next.status : null,
    });
    return {
      ...taskView(snap, { item: next, projectId: toId, path: file }), updated: true,
      ...(dropped.length ? { dropped: `${dropped.join(", ")} not found in the target project, cleared` } : {}),
      ...(warning ? { warning } : {}),
    };
  }));
};
