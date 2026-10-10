// @maia:opusFiles - per-item writes into the Opus/ tree (Tauri only).
// Every write goes through guardedWrite: conflict check against what was last
// read, never overwrite an unknown file, never rename the project folder.
import { VaultConflictError } from "../vault.js";
import { contextOf } from "./projectFile.js";
import { EMPTY_CONTEXT } from "./fileCodec.js";
import { normalizeEol } from "./yamlFrontmatter.js";
import { projectFolderName, taskFileName, decisionFileName, questionFileName } from "./names.js";
import {
  INBOX_DIR, KIND_DIRS, PROJECT_FILE, joinPath, opusRoot, loadFs, listDir, state, keyOf,
  guardedWrite, track,
} from "./opusFs.js";
import { CODECS } from "./opusLoad.js";

const FILE_NAMERS = { task: taskFileName, decision: decisionFileName, question: questionFileName };

const folderOf = (vaultPath, projectId) => {
  if (projectId == null) return joinPath(opusRoot(vaultPath), INBOX_DIR);
  const folder = state.projectDirs.get(projectId);
  if (!folder) throw new Error(`Project "${projectId}" has no folder yet: save the project first`);
  return joinPath(opusRoot(vaultPath), folder);
};

const ctxOf = (projectId) => (projectId == null ? EMPTY_CONTEXT : state.contexts.get(projectId) ?? EMPTY_CONTEXT);

const takenNames = async (fs, dir) => (await listDir(fs, dir)).map((e) => e.name);

const writeItem = async (fs, { vaultPath, kind, item, projectId }) => {
  const entry = state.tracked.get(keyOf(kind, item.id));
  const ctx = ctxOf(projectId);
  const text = CODECS[kind].toFile(item, ctx, entry ? { source: entry.text } : undefined);
  let path = entry?.path;
  if (!entry) {
    const dir = joinPath(folderOf(vaultPath, projectId), KIND_DIRS[kind]);
    path = joinPath(dir, FILE_NAMERS[kind](item, await takenNames(fs, dir)));
  }
  const written = await guardedWrite(fs, { entry, path, text, kind, id: item.id });
  track(kind, item.id, projectId, written);
  return { path: written.path };
};

/** Saves tasks.md files; a changed projectId moves the file (see moveTask). */
export const saveTask = async (vaultPath, task) => {
  const fs = await loadFs();
  const projectId = task.projectId ?? null;
  const entry = state.tracked.get(keyOf("task", task.id));
  if (entry && entry.projectId !== projectId) return moveTask(vaultPath, task, projectId);
  return writeItem(fs, { vaultPath, kind: "task", item: task, projectId });
};

export const saveDecision = async (vaultPath, projectId, decision) =>
  writeItem(await loadFs(), { vaultPath, kind: "decision", item: decision, projectId });

export const saveQuestion = async (vaultPath, projectId, question) =>
  writeItem(await loadFs(), { vaultPath, kind: "question", item: question, projectId });

const nameMap = (list, key) => new Map(list.map((x) => [x.id, x[key]]));
const sameNames = (a, b, key) => {
  const [ma, mb] = [nameMap(a, key), nameMap(b, key)];
  return [...mb].every(([id, name]) => !ma.has(id) || ma.get(id) === name);
};

// Files reference workstreams and milestones by name, so renaming one in
// project.md must rewrite the files that used the old name.
const rewriteReferences = async (fs, projectId, prevCtx, nextCtx) => {
  const warnings = [];
  const renamed = !sameNames(prevCtx.workstreams, nextCtx.workstreams, "name")
    || !sameNames(prevCtx.milestones, nextCtx.milestones, "title");
  if (!renamed) return warnings;
  for (const entry of [...state.tracked.values()]) {
    if (entry.projectId !== projectId || entry.kind === "project") continue;
    const codec = CODECS[entry.kind];
    const parsed = codec.fromFile(entry.text, { fallbackId: entry.id, projectContext: prevCtx });
    if (!parsed.ok) continue;
    const text = codec.toFile(parsed.item, nextCtx, { source: entry.text });
    if (text === normalizeEol(entry.text)) continue;
    try {
      const written = await guardedWrite(fs, { entry, text, kind: entry.kind, id: entry.id });
      track(entry.kind, entry.id, projectId, written);
    } catch (e) {
      if (!(e instanceof VaultConflictError)) throw e;
      warnings.push({ path: entry.path, message: "Changed on disk, workstream/milestone rename not applied to this file" });
    }
  }
  return warnings;
};

/** Writes project.md (embedded workstreams and milestones). Returns { path, warnings }. */
export const saveProject = async (vaultPath, project) => {
  const fs = await loadFs();
  const entry = state.tracked.get(keyOf("project", project.id));
  const nextCtx = contextOf(project);
  const prevCtx = state.contexts.get(project.id) ?? nextCtx;
  const text = CODECS.project.toFile(project, nextCtx, entry ? { source: entry.text } : undefined);

  let path = entry?.path;
  if (!entry) {
    const root = opusRoot(vaultPath);
    const folder = projectFolderName(project, await takenNames(fs, root));
    state.projectDirs.set(project.id, folder);
    path = joinPath(root, folder, PROJECT_FILE);
  }
  try {
    const written = await guardedWrite(fs, { entry, path, text, kind: "project", id: project.id });
    track("project", project.id, project.id, written);
  } catch (e) {
    if (!entry) state.projectDirs.delete(project.id);
    throw e;
  }
  state.contexts.set(project.id, nextCtx);
  const warnings = await rewriteReferences(fs, project.id, prevCtx, nextCtx);
  return { path, warnings };
};

/**
 * Moves a task file to another project's tasks folder or to/from _inbox.
 * The new file is written before the old one is removed, so a crash leaves a
 * duplicate rather than a loss.
 */
export const moveTask = async (vaultPath, task, toProjectId = task.projectId ?? null) => {
  const fs = await loadFs();
  const entry = state.tracked.get(keyOf("task", task.id));
  if (!entry) return writeItem(fs, { vaultPath, kind: "task", item: task, projectId: toProjectId });

  const moved = { ...task, projectId: toProjectId };
  const text = CODECS.task.toFile(moved, ctxOf(toProjectId), { source: entry.text });
  const onDisk = (await fs.exists(entry.path)) ? await fs.readTextFile(entry.path) : null;
  if (onDisk !== null && onDisk !== entry.text) {
    throw new VaultConflictError(task.id, { diskText: onDisk, attemptedText: text, filename: entry.path });
  }
  const dir = joinPath(folderOf(vaultPath, toProjectId), KIND_DIRS.task);
  const path = joinPath(dir, taskFileName(task, await takenNames(fs, dir)));
  const written = await guardedWrite(fs, { entry: null, path, text, kind: "task", id: task.id });
  if (onDisk !== null) await fs.remove(entry.path);
  track("task", task.id, toProjectId, written);
  return { path: written.path };
};

const removeIfUnchanged = async (fs, entry) => {
  if (!(await fs.exists(entry.path))) return true;
  if ((await fs.readTextFile(entry.path)) !== entry.text) return false;
  await fs.remove(entry.path);
  return true;
};

const removeEmptyDir = async (fs, dir) => {
  if ((await fs.exists(dir)) && (await fs.readDir(dir)).length === 0) await fs.remove(dir);
};

const deleteProject = async (fs, vaultPath, projectId) => {
  const skipped = [];
  const entries = [...state.tracked.values()].filter((e) => e.projectId === projectId);
  const folder = state.projectDirs.get(projectId);
  // project.md goes last so a half-finished delete still loads as a project.
  for (const entry of entries.sort((a, b) => (a.kind === "project") - (b.kind === "project"))) {
    if (await removeIfUnchanged(fs, entry)) state.tracked.delete(keyOf(entry.kind, entry.id));
    else skipped.push(entry.path);
  }
  if (folder && skipped.length === 0) {
    const dir = joinPath(opusRoot(vaultPath), folder);
    for (const sub of Object.values(KIND_DIRS)) await removeEmptyDir(fs, joinPath(dir, sub));
    await removeEmptyDir(fs, dir);
    state.projectDirs.delete(projectId);
    state.contexts.delete(projectId);
  }
  return { skipped };
};

/**
 * Deletes one item's file. A file edited elsewhere since it was read is kept:
 * VaultConflictError for single items, `skipped` paths for a whole project.
 * A deleted project removes only files this adapter read, then the folder if empty.
 */
export const deleteItem = async (vaultPath, kind, id) => {
  const fs = await loadFs();
  if (kind === "project") return deleteProject(fs, vaultPath, id);
  const entry = state.tracked.get(keyOf(kind, id));
  if (!entry) return { skipped: [] };
  if (!(await removeIfUnchanged(fs, entry))) {
    const diskText = await fs.readTextFile(entry.path);
    throw new VaultConflictError(id, { diskText, attemptedText: "", filename: entry.path });
  }
  state.tracked.delete(keyOf(kind, id));
  return { skipped: [] };
};
