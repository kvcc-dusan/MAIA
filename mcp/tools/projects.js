// Write tools: create_project, update_project.
import { z } from "zod";
import { uid, isoNow } from "../../src/lib/ids.js";
import {
  normalizeProject, createWorkstream, createMilestone, applyMilestonePatch,
} from "../../src/features/Opus/lib/projectModel.js";
import { contextOf } from "../../src/lib/opusFiles/projectFile.js";
import { findProject } from "../store.js";
import { createProjectFile, updateItemFile, logActivity } from "../writer.js";
import { handler, snapshotOf, rel, norm, resolveWorkstream } from "./util.js";
import {
  isoDate, projectStatus, milestoneStatus, workstreamInput, milestoneInput, linkInput, defined,
} from "./schemas.js";

const scalar = {
  status: projectStatus.optional(),
  phase: z.string().optional(),
  headline: z.string().optional(),
  focus: z.string().optional(),
  objective: z.string().optional(),
  description: z.string().optional().describe("Markdown body of project.md"),
  startDate: isoDate.optional(),
  targetDate: isoDate.optional(),
  nextMeeting: isoDate.optional(),
};

export const buildWorkstreams = (inputs, existing = []) =>
  inputs.reduce((acc, w) => {
    if (acc.some((x) => norm(x.name) === norm(w.name))) throw new Error(`Workstream "${w.name}" already exists.`);
    return [...acc, createWorkstream(acc, defined(w))];
  }, existing);

export const buildMilestones = (inputs, workstreams, existing = []) => {
  const proj = { item: { workstreams } };
  return inputs.reduce((acc, m) => {
    if (acc.some((x) => norm(x.title) === norm(m.title))) throw new Error(`Milestone "${m.title}" already exists.`);
    const { workstream, ...rest } = m;
    return [...acc, createMilestone({ ...defined(rest), workstreamId: resolveWorkstream(proj, workstream) })];
  }, existing);
};

const criteria = (texts, existing = []) => [...existing, ...texts.map((text) => ({ id: uid(), text, done: false }))];
const links = (inputs, existing = []) =>
  [...existing, ...inputs.map((l) => ({ id: uid(), title: l.title ?? l.url, url: l.url, type: l.type ?? "link" }))];

const patchMilestones = (list, patches) =>
  patches.reduce((acc, p) => {
    const hit = acc.find((m) => norm(m.title) === norm(p.title));
    if (!hit) throw new Error(`No milestone "${p.title}". Milestones: ${acc.map((m) => m.title).join(", ") || "none"}`);
    const { title: _title, ...rest } = p;
    return acc.map((m) => (m === hit ? applyMilestonePatch(m, defined(rest)) : m));
  }, list);

const patchCriteria = (list, patches) =>
  patches.reduce((acc, p) => {
    const hit = acc.find((c) => c.id === p.id || (p.text && norm(c.text) === norm(p.text)));
    if (!hit) throw new Error(`No success criterion "${p.id ?? p.text}".`);
    return acc.map((c) => (c === hit ? { ...c, done: p.done } : c));
  }, list);

export const registerProjectWrites = (server, vault) => {
  server.registerTool("create_project", {
    description: "Create a project folder with project.md. Never overwrites; a taken name gets ' 2'.",
    inputSchema: {
      name: z.string().min(1),
      ...scalar,
      workstreams: z.array(workstreamInput).optional(),
      milestones: z.array(milestoneInput).optional(),
      successCriteria: z.array(z.string().min(1)).optional(),
      links: z.array(linkInput).optional(),
    },
  }, handler(async (a) => {
    const snap = await snapshotOf(vault);
    if (snap.projects.some((p) => norm(p.item.name) === norm(a.name))) {
      throw new Error(`A project named "${a.name}" already exists. Use update_project or pick another name.`);
    }
    const workstreams = buildWorkstreams(a.workstreams ?? []);
    const project = normalizeProject({
      id: uid(), name: a.name.trim(), status: "Active", createdAt: isoNow(), description: "", objective: "",
      ...defined({ status: a.status, phase: a.phase, headline: a.headline, focus: a.focus, objective: a.objective,
        description: a.description, startDate: a.startDate, targetDate: a.targetDate, nextMeeting: a.nextMeeting }),
      workstreams,
      milestones: buildMilestones(a.milestones ?? [], workstreams),
      successCriteria: criteria(a.successCriteria ?? []),
      links: links(a.links ?? []),
      pinnedNoteIds: [],
    });
    const { dir, file, folder } = await createProjectFile(snap, project);
    const warning = await logActivity({ ...snap, projects: [{ item: project, dir }] }, {
      projectId: project.id, kind: "created", collection: "projects", itemId: project.id, title: project.name,
    });
    return { id: project.id, name: project.name, folder, file: rel(snap, file), ...(warning ? { warning } : {}) };
  }));

  server.registerTool("update_project", {
    description: "Update project fields. Scalars replace; workstreams, milestones, successCriteria and links are appended; milestonePatches and criteriaPatches change existing entries. The project name and folder are never renamed.",
    inputSchema: {
      project: z.string().describe("Name or id"),
      fields: z.object({
        ...scalar,
        addWorkstreams: z.array(workstreamInput).optional(),
        addMilestones: z.array(milestoneInput).optional(),
        addSuccessCriteria: z.array(z.string().min(1)).optional(),
        addLinks: z.array(linkInput).optional(),
        milestonePatches: z.array(z.object({
          title: z.string(), status: milestoneStatus.optional(), date: isoDate.optional(), start: isoDate.optional(),
        })).optional(),
        criteriaPatches: z.array(z.object({ id: z.string().optional(), text: z.string().optional(), done: z.boolean() })).optional(),
      }),
    },
  }, handler(async ({ project, fields: f }) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, project);
    const p = rec.item;
    const workstreams = buildWorkstreams(f.addWorkstreams ?? [], p.workstreams);
    const milestones = patchMilestones(buildMilestones(f.addMilestones ?? [], workstreams, p.milestones), f.milestonePatches ?? []);
    const next = normalizeProject({
      ...p,
      ...defined({ status: f.status, phase: f.phase, headline: f.headline, focus: f.focus, objective: f.objective,
        description: f.description, startDate: f.startDate, targetDate: f.targetDate, nextMeeting: f.nextMeeting }),
      workstreams,
      milestones,
      successCriteria: patchCriteria(criteria(f.addSuccessCriteria ?? [], p.successCriteria ?? []), f.criteriaPatches ?? []),
      links: links(f.addLinks ?? [], p.links ?? []),
    });
    const result = await updateItemFile(rec, next, contextOf(next));
    if (!result.written) return { id: p.id, unchanged: true };
    const warning = await logActivity(snap, {
      projectId: p.id, kind: p.status !== next.status ? "status" : "updated", collection: "projects",
      itemId: p.id, title: p.name, from: p.status !== next.status ? p.status : null, to: p.status !== next.status ? next.status : null,
    });
    return { id: p.id, updated: true, file: rel(snap, rec.path), ...(warning ? { warning } : {}) };
  }));
};
