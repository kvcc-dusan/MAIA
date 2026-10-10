// Small project/item edits: update_decision, update_question, add_workstream, add_milestone.
import { z } from "zod";
import { normalizeProject, applyQuestionPatch } from "../../src/features/Opus/lib/projectModel.js";
import { contextOf } from "../../src/lib/opusFiles/projectFile.js";
import { findProject, findRecord, projectRecordOf } from "../store.js";
import { updateItemFile, logActivity } from "../writer.js";
import { handler, snapshotOf, rel, resolveWorkstream } from "./util.js";
import { isoDate, defined, short, medium, long } from "./schemas.js";
import { buildWorkstreams, buildMilestones } from "./projects.js";

const withWorkstream = (proj, patch) => {
  const { workstream, ...plain } = patch;
  return defined({ ...plain, workstreamId: "workstream" in patch ? resolveWorkstream(proj, workstream) : undefined });
};

export const registerExtras = (server, vault) => {
  server.registerTool("update_decision", {
    description: "Edit a decision by id (title, detail, date, by, workstream; null clears the workstream). The file name is never renamed.",
    inputSchema: {
      id: short,
      patch: z.object({
        title: short.min(1).optional(), detail: long.optional(), date: isoDate.optional(),
        by: short.optional(), workstream: short.nullable().optional(),
      }),
    },
  }, handler(async ({ id, patch }) => {
    const snap = await snapshotOf(vault);
    const rec = findRecord(snap, "decision", id);
    const proj = projectRecordOf(snap, rec.projectId);
    const next = { ...rec.item, ...withWorkstream(proj, patch) };
    if (!(await updateItemFile(rec, next, proj?.ctx)).written) return { id, unchanged: true };
    const warning = await logActivity(snap, { projectId: rec.projectId, kind: "updated", collection: "decisions", itemId: id, title: next.title });
    return { id, updated: true, file: rel(snap, rec.path), ...(warning ? { warning } : {}) };
  }));

  server.registerTool("update_question", {
    description: "Edit a question by id: reword, set owner/blocking/workstream, write an answer, or reopen it with status 'open'. Use answer_question for the common 'answer it' case.",
    inputSchema: {
      id: short,
      patch: z.object({
        question: medium.min(1).optional(), owner: short.optional(), blocking: z.boolean().optional(),
        answer: long.optional(), status: z.enum(["open", "answered"]).optional(), workstream: short.nullable().optional(),
      }),
    },
  }, handler(async ({ id, patch }) => {
    const snap = await snapshotOf(vault);
    const rec = findRecord(snap, "question", id);
    const proj = projectRecordOf(snap, rec.projectId);
    const next = applyQuestionPatch(rec.item, withWorkstream(proj, patch));
    const changed = next.status !== rec.item.status;
    // updatedAt moves on every patch; skip the write when nothing else changed.
    const same = JSON.stringify({ ...next, updatedAt: null }) === JSON.stringify({ ...rec.item, updatedAt: null });
    if (same) return { id, unchanged: true };
    if (!(await updateItemFile(rec, next, proj?.ctx)).written) return { id, unchanged: true };
    const warning = await logActivity(snap, {
      projectId: rec.projectId, kind: changed ? "status" : "updated", collection: "questions", itemId: id, title: next.question,
      from: changed ? rec.item.status : null, to: changed ? next.status : null,
    });
    return { id, updated: true, status: next.status, file: rel(snap, rec.path), ...(warning ? { warning } : {}) };
  }));

  const writeProject = async (snap, rec, next, extra) => {
    if (!(await updateItemFile(rec, next, contextOf(next))).written) return { id: rec.item.id, unchanged: true };
    const warning = await logActivity(snap, { projectId: rec.item.id, kind: "updated", collection: "projects", itemId: rec.item.id, title: rec.item.name });
    return { id: rec.item.id, updated: true, ...extra, ...(warning ? { warning } : {}) };
  };

  server.registerTool("add_workstream", {
    description: "Add a workstream to a project. Existing workstreams are never renamed; a duplicate name is an error.",
    inputSchema: { project: short, name: short.min(1), owner: short.optional() },
  }, handler(async ({ project, name, owner }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const workstreams = buildWorkstreams([defined({ name: name.trim(), owner })], rec.item.workstreams);
    const added = workstreams[workstreams.length - 1];
    return writeProject(snap, rec, normalizeProject({ ...rec.item, workstreams }), { workstream: { id: added.id, name: added.name } });
  }));

  server.registerTool("add_milestone", {
    description: "Add a milestone (title + date) to a project, optionally under a workstream by name. A duplicate title is an error; use update_project milestonePatches to change one.",
    inputSchema: { project: short, title: short.min(1), date: isoDate, workstream: short.optional() },
  }, handler(async ({ project, title, date, workstream }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const milestones = buildMilestones([defined({ title: title.trim(), date, workstream })], rec.item.workstreams, rec.item.milestones);
    const added = milestones[milestones.length - 1];
    return writeProject(snap, rec, normalizeProject({ ...rec.item, milestones }), { milestone: { id: added.id, title: added.title, date: added.date } });
  }));
};
