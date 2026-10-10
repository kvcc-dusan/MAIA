// @maia:opusFiles - reads the whole Opus/ tree into the app's in-memory shape.
// A file that fails to parse is reported and skipped, never touched: it is
// not tracked, so no save can reach it, and its name stays taken.
import * as projectFile from "./projectFile.js";
import * as taskFile from "./taskFile.js";
import * as decisionFile from "./decisionFile.js";
import * as questionFile from "./questionFile.js";
import { contextOf } from "./projectFile.js";
import { EMPTY_CONTEXT } from "./fileCodec.js";
import {
  INBOX_DIR, BACKUPS_DIR, TRASH_DIR, ASSETS_DIR, ACTIVITY_FILE, KIND_DIRS, PROJECT_FILE, joinPath, opusRoot, loadFs, listDir, statMtime,
  stableId, state, trackInto,
} from "./opusFs.js";
import { readActivity } from "./activityVault.js";

export const CODECS = { project: projectFile, task: taskFile, decision: decisionFile, question: questionFile };

const byCreatedDesc = (a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) || String(a.id).localeCompare(String(b.id));

const readOne = async (fs, { path, name, kind, projectId, ctx, seenIds, warnings, fresh }) => {
  let text;
  try {
    text = await fs.readTextFile(path);
  } catch (e) {
    warnings.push({ path, message: `Could not read file: ${e?.message ?? e}` });
    return null;
  }
  const fallbackId = stableId(path);
  const result = CODECS[kind].fromFile(text, { fallbackId, fallbackTitle: name.replace(/\.md$/i, ""), projectContext: ctx });
  if (!result.ok) {
    warnings.push({ path, message: `Skipped, not valid frontmatter: ${result.error}` });
    return null;
  }
  result.warnings.forEach((message) => warnings.push({ path, message }));
  let item = result.item;
  // Never drop the loser of an id clash (a copied file): both stay, the later one gets a stable new id.
  if (seenIds.has(`${kind}:${item.id}`)) {
    warnings.push({ path, message: `Duplicate ${kind} id "${item.id}", reassigned` });
    item = { ...item, id: fallbackId };
  }
  seenIds.add(`${kind}:${item.id}`);
  trackInto(fresh, kind, item.id, projectId, { path, text, mtimeMs: await statMtime(fs, path) });
  return item;
};

const readFolder = async (fs, dir, args) => {
  const entries = await listDir(fs, dir);
  const files = entries.filter((e) => e.isFile !== false && !e.isDirectory && /\.md$/i.test(e.name));
  const items = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const item = await readOne(fs, { ...args, path: joinPath(dir, file.name), name: file.name });
    if (item) items.push(item);
  }
  return items;
};

// A deleted project keeps its assets/ (user files are never deleted) and may keep activity.jsonl
// or empty item folders. That leftover is not a broken project, so it loads silently.
const isLeftoverFolder = async (fs, dir, entries) => {
  if (entries.length === 0) return false;
  for (const entry of entries) {
    if (entry.isDirectory && entry.name === ASSETS_DIR) continue;
    if (!entry.isDirectory && entry.name === ACTIVITY_FILE) continue;
    if (entry.isDirectory && Object.values(KIND_DIRS).includes(entry.name)) {
      if ((await listDir(fs, joinPath(dir, entry.name))).length === 0) continue;
    }
    return false;
  }
  return true;
};

const loadProject = async (fs, root, folder, shared) => {
  const { warnings, seenIds, fresh } = shared;
  const dir = joinPath(root, folder);
  const projectPath = joinPath(dir, PROJECT_FILE);
  if (!(await fs.exists(projectPath))) {
    if (!(await isLeftoverFolder(fs, dir, await listDir(fs, dir)))) {
      warnings.push({ path: dir, message: `Folder has no ${PROJECT_FILE}, ignored` });
    }
    return null;
  }
  const text = await fs.readTextFile(projectPath);
  const result = projectFile.fromFile(text, { fallbackId: stableId(projectPath), fallbackTitle: folder });
  if (!result.ok) {
    warnings.push({ path: projectPath, message: `Project skipped, not valid frontmatter: ${result.error}` });
    return null;
  }
  result.warnings.forEach((message) => warnings.push({ path: projectPath, message }));
  let project = result.item;
  if (seenIds.has(`project:${project.id}`)) {
    warnings.push({ path: projectPath, message: `Duplicate project id "${project.id}", reassigned` });
    project = { ...project, id: stableId(projectPath) };
  }
  seenIds.add(`project:${project.id}`);
  const ctx = contextOf(project);
  trackInto(fresh, "project", project.id, project.id, { path: projectPath, text, mtimeMs: await statMtime(fs, projectPath) });
  fresh.projectDirs.set(project.id, folder);
  fresh.contexts.set(project.id, ctx);

  // Only tasks/, decisions/ and questions/ are read; assets/ is never scanned for items.
  const args = { projectId: project.id, ctx, seenIds, warnings, fresh };
  const tasks = await readFolder(fs, joinPath(dir, KIND_DIRS.task), { ...args, kind: "task" });
  const decisions = await readFolder(fs, joinPath(dir, KIND_DIRS.decision), { ...args, kind: "decision" });
  const questions = await readFolder(fs, joinPath(dir, KIND_DIRS.question), { ...args, kind: "question" });
  const activity = await readActivity(fs, dir, project.id, shared);
  return {
    activity,
    project: {
      ...project,
      assets: [], // assets stay in the asset store, S2 reattaches them
      decisions: decisions.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id)),
      questions: questions.sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")) || a.id.localeCompare(b.id)),
    },
    tasks: tasks.map((t) => ({ ...t, projectId: project.id })),
  };
};

/**
 * activityFiles: [{ projectId (null = _inbox), entries }], one per activity.jsonl found.
 * @returns {Promise<{ exists: boolean, projects: object[], tasks: object[], warnings: {path:string,message:string}[], activityFiles: object[] }>}
 */
export const loadOpus = async (vaultPath) => {
  const fs = await loadFs();
  const root = opusRoot(vaultPath);
  // Built privately and swapped in at the end. Clearing the live state first left a window
  // (long on a synced drive, and every window focus starts a reload) where saves and asset
  // uploads found no tracked files or project folders.
  const fresh = { tracked: new Map(), projectDirs: new Map(), contexts: new Map() };
  if (!(await fs.exists(root))) {
    Object.assign(state, fresh);
    return { exists: false, projects: [], tasks: [], warnings: [], activityFiles: [] };
  }

  const shared = { warnings: [], seenIds: new Set(), fresh };
  const projects = [];
  const tasks = [];
  const activityFiles = [];
  const folders = (await listDir(fs, root)).filter((e) => e.isDirectory).map((e) => e.name).sort();

  for (const folder of folders.filter((f) => f !== INBOX_DIR && f !== BACKUPS_DIR && f !== TRASH_DIR)) {
    const loaded = await loadProject(fs, root, folder, shared);
    if (!loaded) continue;
    projects.push(loaded.project);
    tasks.push(...loaded.tasks);
    if (loaded.activity) activityFiles.push(loaded.activity);
  }
  const inbox = await readFolder(fs, joinPath(root, INBOX_DIR, KIND_DIRS.task), {
    kind: "task", projectId: null, ctx: EMPTY_CONTEXT, ...shared,
  });
  tasks.push(...inbox.map((t) => ({ ...t, projectId: null })));

  const inboxActivity = await readActivity(fs, joinPath(root, INBOX_DIR), null, shared);
  if (inboxActivity) activityFiles.push(inboxActivity);

  Object.assign(state, fresh);
  return { exists: true, projects: projects.sort(byCreatedDesc), tasks: tasks.sort(byCreatedDesc), warnings: shared.warnings, activityFiles };
};
