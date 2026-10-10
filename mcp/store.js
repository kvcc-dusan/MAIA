// Reads the Opus tree into a snapshot. Same rules as src/lib/opusFiles/opusLoad.js:
// a file that fails to parse is reported in `warnings` and skipped (never
// touched later, since no record exists for it).
import path from "node:path";
import * as projectFile from "../src/lib/opusFiles/projectFile.js";
import * as taskFile from "../src/lib/opusFiles/taskFile.js";
import * as decisionFile from "../src/lib/opusFiles/decisionFile.js";
import * as questionFile from "../src/lib/opusFiles/questionFile.js";
import { contextOf } from "../src/lib/opusFiles/projectFile.js";
import { EMPTY_CONTEXT } from "../src/lib/opusFiles/fileCodec.js";
import {
  OPUS_DIR, INBOX_DIR, BACKUPS_DIR, TRASH_DIR, PROJECT_FILE, KIND_DIRS, listDir, readText,
} from "./fsx.js";

export const CODECS = { project: projectFile, task: taskFile, decision: decisionFile, question: questionFile };

// Same hash as opusFs.stableId so id-less files get the id the app would give them.
const stableId = (p) => {
  let hash = 5381;
  for (let i = 0; i < p.length; i += 1) hash = ((hash << 5) + hash + p.charCodeAt(i)) >>> 0;
  return `f${hash.toString(36)}`;
};

const readItems = async (dir, { kind, projectId, ctx, seen, warnings }) => {
  const files = (await listDir(dir)).filter((e) => e.isFile && /\.md$/i.test(e.name)).sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const file of files) {
    const p = path.join(dir, file.name);
    const text = await readText(p);
    if (text === null) continue;
    const parsed = CODECS[kind].fromFile(text, {
      fallbackId: stableId(p), fallbackTitle: file.name.replace(/\.md$/i, ""), projectContext: ctx,
    });
    if (!parsed.ok) {
      warnings.push({ path: p, message: `Skipped, not valid frontmatter: ${parsed.error}` });
      continue;
    }
    parsed.warnings.forEach((message) => warnings.push({ path: p, message }));
    let item = parsed.item;
    if (seen.has(`${kind}:${item.id}`)) {
      warnings.push({ path: p, message: `Duplicate ${kind} id "${item.id}", reassigned` });
      item = { ...item, id: stableId(p) };
    }
    seen.add(`${kind}:${item.id}`);
    out.push({ kind, item: { ...item, ...(kind === "task" ? { projectId } : {}) }, path: p, text, projectId });
  }
  return out;
};

const loadProject = async (root, folder, shared) => {
  const dir = path.join(root, folder);
  const p = path.join(dir, PROJECT_FILE);
  const text = await readText(p);
  if (text === null) {
    shared.warnings.push({ path: dir, message: `Folder has no ${PROJECT_FILE}, ignored` });
    return null;
  }
  const parsed = projectFile.fromFile(text, { fallbackId: stableId(p), fallbackTitle: folder });
  if (!parsed.ok) {
    shared.warnings.push({ path: p, message: `Project skipped, not valid frontmatter: ${parsed.error}` });
    return null;
  }
  parsed.warnings.forEach((message) => shared.warnings.push({ path: p, message }));
  let project = parsed.item;
  if (shared.seen.has(`project:${project.id}`)) project = { ...project, id: stableId(p) };
  shared.seen.add(`project:${project.id}`);
  const ctx = contextOf(project);
  const args = { projectId: project.id, ctx, ...shared };
  return {
    kind: "project", item: project, path: p, text, projectId: project.id, folder, dir, ctx,
    tasks: await readItems(path.join(dir, KIND_DIRS.task), { ...args, kind: "task" }),
    decisions: await readItems(path.join(dir, KIND_DIRS.decision), { ...args, kind: "decision" }),
    questions: await readItems(path.join(dir, KIND_DIRS.question), { ...args, kind: "question" }),
  };
};

/** @returns {{ root, projects: object[], inboxTasks: object[], warnings: object[] }} */
export const loadSnapshot = async (vault) => {
  const root = path.join(vault, OPUS_DIR);
  const shared = { warnings: [], seen: new Set() };
  const folders = (await listDir(root)).filter((e) => e.isDirectory && ![INBOX_DIR, BACKUPS_DIR, TRASH_DIR].includes(e.name));
  const projects = [];
  for (const f of folders.sort((a, b) => a.name.localeCompare(b.name))) {
    const rec = await loadProject(root, f.name, shared);
    if (rec) projects.push(rec);
  }
  const inboxTasks = await readItems(path.join(root, INBOX_DIR, KIND_DIRS.task), {
    kind: "task", projectId: null, ctx: EMPTY_CONTEXT, ...shared,
  });
  return { root, projects, inboxTasks, warnings: shared.warnings };
};

export const allTaskRecords = (snap) => [...snap.projects.flatMap((p) => p.tasks), ...snap.inboxTasks];

const norm = (s) => String(s ?? "").trim().toLowerCase();

/** Project by id, name or folder name. Throws a readable error when missing or ambiguous. */
export const findProject = (snap, ref) => {
  const wanted = norm(ref);
  if (!wanted) throw new Error("Project is required (name or id).");
  const byId = snap.projects.filter((p) => norm(p.item.id) === wanted);
  const hits = byId.length ? byId : snap.projects.filter((p) => norm(p.item.name) === wanted || norm(p.folder) === wanted);
  if (hits.length === 1) return hits[0];
  const names = snap.projects.map((p) => p.item.name).join(", ") || "none";
  if (hits.length === 0) throw new Error(`No project "${ref}". Projects: ${names}`);
  throw new Error(`"${ref}" matches ${hits.length} projects, use the id.`);
};

export const findRecord = (snap, kind, id) => {
  const pool = kind === "task" ? allTaskRecords(snap) : snap.projects.flatMap((p) => (kind === "decision" ? p.decisions : p.questions));
  const hit = pool.find((r) => r.item.id === id);
  if (!hit) throw new Error(`No ${kind} with id "${id}".`);
  return hit;
};

export const projectRecordOf = (snap, projectId) => snap.projects.find((p) => p.item.id === projectId) ?? null;
