// @maia:opusFiles - fs plumbing and remembered-file state for the Opus tree.
// Tauri imports stay dynamic so the web bundle never pulls them in.
import { VaultConflictError } from "../vault.js";
import { writeTextAtomic, ATOMIC_WRITES } from "../atomicWrite.js";
import { normalizeEol } from "./yamlFrontmatter.js";

export const OPUS_DIR = "Opus";
export const INBOX_DIR = "_inbox";
// Not projects: the loader skips them at the Opus root. Plain names, never dot paths,
// because the Tauri fs scope does not match leading-dot components.
export const BACKUPS_DIR = "_backups";
// Deleted items moved here by the MCP server (_trash/<date>/<project>/<kind>/<file>); never read as data.
export const TRASH_DIR = "_trash";
export const ASSETS_DIR = "assets";
export const PROJECT_FILE = "project.md";
export const ACTIVITY_FILE = "activity.jsonl";
export const KIND_DIRS = { task: "tasks", decision: "decisions", question: "questions" };

// Whole files are read and parsed on every reload (each window focus). A multi-GB file dropped into
// the vault must not be pulled into memory.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const joinPath = (...parts) =>
  parts.map((p, i) => (i === 0 ? p.replace(/\/+$/, "") : p.replace(/^\/+|\/+$/g, ""))).join("/");

export const opusRoot = (vaultPath) => joinPath(vaultPath, OPUS_DIR);

export const loadFs = () => import("@tauri-apps/plugin-fs");

export const isHidden = (name) => name.startsWith(".");

/**
 * Everything the adapter remembers about files it has read or written.
 * Module-level on purpose, like vault.js: a save compares against what was
 * last on disk. `tracked` key is `${kind}:${id}`.
 *   entry = { kind, id, projectId, path, text, mtimeMs }
 */
export const state = {
  tracked: new Map(),
  projectDirs: new Map(), // projectId -> folder name
  contexts: new Map(), // projectId -> { workstreams, milestones }
};

export const resetOpusState = () => {
  state.tracked = new Map();
  state.projectDirs = new Map();
  state.contexts = new Map();
};

export const keyOf = (kind, id) => `${kind}:${id}`;

/** Where the app can find out which file an item came from (for conflict UI, S2). */
export const getOpusMeta = (kind, id) => {
  const entry = state.tracked.get(keyOf(kind, id));
  return entry ? { path: entry.path, mtimeMs: entry.mtimeMs } : null;
};

// Files without an id in frontmatter need an id that is the same on every
// load, otherwise each reload would look like a brand new item.
export const stableId = (path) => {
  let hash = 5381;
  for (let i = 0; i < path.length; i += 1) hash = ((hash << 5) + hash + path.charCodeAt(i)) >>> 0;
  return `f${hash.toString(36)}`;
};

export const statMtime = async (fs, path) => {
  try {
    const info = await fs.stat(path);
    return info?.mtime ? new Date(info.mtime).getTime() : null;
  } catch {
    return null;
  }
};

/** readTextFile that refuses oversized files. Throws; the loader turns that into a warning and never tracks the file. */
export const readTextChecked = async (fs, path) => {
  const info = await fs.stat(path);
  if (typeof info?.size === "number" && info.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large to read (over ${MAX_FILE_BYTES / 1024 / 1024} MB)`);
  }
  return fs.readTextFile(path);
};

export const listDir = async (fs, path) => {
  if (!(await fs.exists(path))) return [];
  const entries = await fs.readDir(path);
  return Array.isArray(entries) ? entries.filter((e) => e && typeof e.name === "string" && !isHidden(e.name)) : [];
};

const parentOf = (path) => path.slice(0, path.lastIndexOf("/"));

/**
 * The only way the adapter writes. Known file: the disk must still match what
 * we last read (or what we are about to write), else VaultConflictError and
 * nothing is touched. New file: refuses to overwrite anything that exists.
 * Writing identical text is skipped so untouched files are never rewritten.
 */
export const guardedWrite = async (fs, { entry, path, text, kind, id }) => {
  if (entry) {
    if (await fs.exists(entry.path)) {
      const onDisk = await fs.readTextFile(entry.path);
      if (onDisk !== entry.text && onDisk !== text) {
        throw new VaultConflictError(id, { diskText: onDisk, attemptedText: text, filename: entry.path });
      }
      if (normalizeEol(onDisk) === text) return { path: entry.path, text: onDisk, mtimeMs: await statMtime(fs, entry.path) };
    }
  } else if (await fs.exists(path)) {
    throw new Error(`Refusing to overwrite existing file "${path}"`);
  }
  const target = entry ? entry.path : path;
  await fs.mkdir(parentOf(target), { recursive: true });
  // createNew makes the OS refuse an overwrite even if the file appeared since the exists check.
  if (entry) await writeTextAtomic(fs, target, text, { atomic: ATOMIC_WRITES });
  else await fs.writeTextFile(target, text, { createNew: true });
  return { path: target, text, mtimeMs: await statMtime(fs, target), kind };
};

/** Record a file in `target` (the live state, or the private copy a load is building). */
export const trackInto = (target, kind, id, projectId, written) => {
  target.tracked.set(keyOf(kind, id), { kind, id, projectId, path: written.path, text: written.text, mtimeMs: written.mtimeMs });
};

export const track = (kind, id, projectId, written) => trackInto(state, kind, id, projectId, written);
