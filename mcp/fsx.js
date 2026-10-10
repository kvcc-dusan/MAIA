// Node fs adapter for the vault. Mirrors the rules of src/lib/opusFiles/opusFs.js
// (that one is Tauri-only): never overwrite a file we did not read, skip
// identical rewrites, check the disk still matches before writing.
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeEol } from "../src/lib/opusFiles/yamlFrontmatter.js";

export const OPUS_DIR = "Opus";
export const INBOX_DIR = "_inbox";
export const BACKUPS_DIR = "_backups";
export const PROJECT_FILE = "project.md";
export const ACTIVITY_FILE = "activity.jsonl";
export const KIND_DIRS = { task: "tasks", decision: "decisions", question: "questions" };

export class ConflictError extends Error {
  constructor(file, why) {
    super(`${why} (${file}). Nothing was written. Re-read the item and retry.`);
    this.name = "ConflictError";
    this.file = file;
  }
}

export const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

/** File text, or null when the file does not exist. */
export const readText = async (p) => {
  try {
    return await fs.readFile(p, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
};

/** Visible (non-dot) entries only, like the app's listDir. */
export const listDir = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({ name: e.name, isFile: e.isFile(), isDirectory: e.isDirectory() }));
  } catch (e) {
    if (e?.code === "ENOENT" || e?.code === "ENOTDIR") return [];
    throw e;
  }
};

const tmpName = (target) => `${target}.${process.pid}-${Math.random().toString(36).slice(2, 8)}.tmp`;

const createExclusive = async (target, text) => {
  const tmp = tmpName(target);
  await fs.writeFile(tmp, text, "utf8");
  try {
    try {
      await fs.link(tmp, target); // fails with EEXIST instead of replacing
    } catch (e) {
      if (e?.code === "EEXIST") throw new ConflictError(target, "File already exists");
      if (e?.code !== "EPERM" && e?.code !== "ENOTSUP" && e?.code !== "EXDEV") throw e;
      if (await exists(target)) throw new ConflictError(target, "File already exists");
      await fs.rename(tmp, target); // filesystem without hard links
    }
  } finally {
    await fs.rm(tmp, { force: true });
  }
};

const replaceExisting = async (target, text) => {
  const tmp = tmpName(target);
  try {
    await fs.writeFile(tmp, text, "utf8");
    await fs.rename(tmp, target);
  } finally {
    await fs.rm(tmp, { force: true });
  }
};

/**
 * `expected` = the text we read (string), or null for "this file must not exist yet".
 * Returns { path, written } where written is false when the text was identical.
 */
export const safeWrite = async (target, text, expected) => {
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (expected == null) {
    await createExclusive(target, text);
    return { path: target, written: true };
  }
  const onDisk = await readText(target);
  if (onDisk === null) throw new ConflictError(target, "File disappeared since it was read");
  if (onDisk !== expected && onDisk !== text) throw new ConflictError(target, "File changed on disk since it was read");
  if (normalizeEol(onDisk) === text) return { path: target, written: false };
  await replaceExisting(target, text);
  return { path: target, written: true };
};

/** Removes a file only if it still holds `expected` (used after a task move). */
export const removeIfUnchanged = async (target, expected) => {
  const onDisk = await readText(target);
  if (onDisk === null) return true;
  if (onDisk !== expected) return false;
  await fs.rm(target);
  return true;
};
