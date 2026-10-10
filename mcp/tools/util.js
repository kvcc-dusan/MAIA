// Shared helpers for tool handlers: JSON results, error results, snapshot views.
import path from "node:path";
import { loadSnapshot, projectRecordOf } from "../store.js";

// Error text from fs and from our own ConflictError carries absolute paths. The client (an LLM
// transcript) gets "<vault>/..." instead of the user's home directory layout.
const roots = new Set();
export const scrubPathsFor = (vault) => roots.add(vault);
export const scrub = (message) => {
  let text = String(message);
  for (const root of [...roots].sort((a, b) => b.length - a.length)) text = text.split(root).join("<vault>");
  return text;
};

export const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
export const fail = (message) => ({ isError: true, content: [{ type: "text", text: scrub(message) }] });

/** Wraps a handler so nothing ever escapes as an uncaught exception. */
export const handler = (fn) => async (args) => {
  try {
    return ok(await fn(args ?? {}));
  } catch (e) {
    return fail(e?.message ?? e);
  }
};

export const snapshotOf = (vault) => loadSnapshot(vault);

export const rel = (snap, p) => path.relative(snap.root, p);

const nameOf = (list, id, key) => (id == null ? null : list.find((x) => x.id === id)?.[key] ?? null);

export const taskView = (snap, rec, { full = false } = {}) => {
  const t = rec.item;
  const proj = rec.projectId == null ? null : projectRecordOf(snap, rec.projectId);
  const view = {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority ?? null,
    owner: t.owner ?? null,
    estimate: t.estimate ?? null,
    due: t.due ?? null,
    project: proj ? proj.item.name : null,
    projectId: rec.projectId,
    workstream: nameOf(proj?.item.workstreams ?? [], t.workstreamId, "name"),
    milestone: nameOf(proj?.item.milestones ?? [], t.milestoneId, "title"),
    isNextAction: t.isNextAction === true,
    file: rel(snap, rec.path),
  };
  if (!full) return view;
  return { ...view, desc: t.desc ?? "", schedule: t.schedule ?? null, createdAt: t.createdAt ?? null, startedAt: t.startedAt ?? null, doneAt: t.doneAt ?? null };
};

export const norm = (s) => String(s ?? "").trim().toLowerCase();

/** Resolves a workstream name to its id inside a project record; throws with the valid options. */
export const resolveWorkstream = (projRec, name) => {
  if (name == null || name === "") return null;
  const list = projRec?.item.workstreams ?? [];
  const hit = list.find((w) => norm(w.name) === norm(name)) ?? list.find((w) => w.id === name);
  if (!hit) throw new Error(`No workstream "${name}" in this project. Workstreams: ${list.map((w) => w.name).join(", ") || "none"}`);
  return hit.id;
};

export const resolveMilestone = (projRec, title) => {
  if (title == null || title === "") return null;
  const list = projRec?.item.milestones ?? [];
  const hit = list.find((m) => norm(m.title) === norm(title)) ?? list.find((m) => m.id === title);
  if (!hit) throw new Error(`No milestone "${title}" in this project. Milestones: ${list.map((m) => m.title).join(", ") || "none"}`);
  return hit.id;
};
