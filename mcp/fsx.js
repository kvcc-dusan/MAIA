// Node fs adapter for the vault. Mirrors the rules of src/lib/opusFiles/opusFs.js
// (that one is Tauri-only): never overwrite a file we did not read, skip
// identical rewrites, check the disk still matches before writing.
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeEol } from "../src/lib/opusFiles/yamlFrontmatter.js";

export const OPUS_DIR = "Opus";
export const INBOX_DIR = "_inbox";
export const BACKUPS_DIR = "_backups";
export const TRASH_DIR = "_trash";
export const PROJECT_FILE = "project.md";
export const ACTIVITY_FILE = "activity.jsonl";
// Whole files are read into memory and parsed on every tool call; a multi-GB or binary file named
// .md must not take the server down or be "repaired" by a rewrite.
export const MAX_TEXT_BYTES = 5 * 1024 * 1024;
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

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * File text, or null when the file does not exist. Throws a path-free Error for anything that is
 * not safe to round-trip as text (too large, not valid UTF-8, a folder, no permission): decoding
 * invalid bytes leniently would turn them into U+FFFD and the next rewrite would destroy them.
 */
export const readText = async (p) => {
  try {
    const info = await fs.stat(p);
    if (info.size > MAX_TEXT_BYTES) throw new Error(`File is larger than ${MAX_TEXT_BYTES / 1024 / 1024} MB, skipped`);
    return strictUtf8.decode(await fs.readFile(p));
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    if (e instanceof TypeError) throw new Error("File is not valid UTF-8 text, skipped");
    if (e?.code) throw new Error(`Cannot read file (${e.code})`);
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

// Short and dot-prefixed: Obsidian and cloud drives skip hidden files, and `<name>.<pid>.tmp` could
// exceed the 255-byte file name limit for a long (multi-byte) title.
const tmpName = (target) => path.join(path.dirname(target), `.maia-${process.pid}-${Math.random().toString(36).slice(2, 10)}.tmp`);

// rename() replaces silently, so reserve the name first with an exclusive create (O_EXCL) and
// rename over our own empty placeholder. An exists() check here would leave a race window.
const renameOverPlaceholder = async (tmp, target) => {
  try {
    await (await fs.open(target, "wx")).close();
  } catch (e) {
    if (e?.code === "EEXIST") throw new ConflictError(target, "File already exists");
    throw e;
  }
  try {
    await fs.rename(tmp, target);
  } catch (e) {
    await fs.rm(target, { force: true });
    throw e;
  }
};

const createExclusive = async (target, text) => {
  const tmp = tmpName(target);
  await fs.writeFile(tmp, text, "utf8");
  try {
    try {
      await fs.link(tmp, target); // fails with EEXIST instead of replacing
    } catch (e) {
      if (e?.code === "EEXIST") throw new ConflictError(target, "File already exists");
      if (e?.code !== "EPERM" && e?.code !== "ENOTSUP" && e?.code !== "EXDEV") throw e;
      await renameOverPlaceholder(tmp, target); // filesystem without hard links
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

/**
 * Moves a file without ever overwriting: the text must still match `expected`, the copy at
 * `dest` is created exclusively, and the source is removed only if still unchanged. If it
 * changed in that last instant the copy is rolled back and a conflict is reported.
 */
export const moveGuarded = async (src, dest, expected) => {
  const current = await readText(src);
  if (current === null) throw new ConflictError(src, "File disappeared since it was read");
  if (current !== expected) throw new ConflictError(src, "File changed on disk since it was read");
  await safeWrite(dest, expected, null);
  if (!(await removeIfUnchanged(src, expected))) {
    await removeIfUnchanged(dest, expected);
    throw new ConflictError(src, "File changed on disk while moving");
  }
  return dest;
};
