// @maia:vault — markdown vault adapter (Tauri only; web falls back to localStorage)
// All Tauri imports are dynamic so the web/PWA bundle never touches them.
import { markdownToNote, noteToMarkdown, noteFilename, slugifyTitle } from "./noteFile.js";
import { stableId } from "./stableId.js";
import {
  isSkippedDir, isNoteFile, isNotePath, relDir, relBase, joinRel, mapLimit,
  normalizeFolderList, toRelPath, validateFolderPath,
} from "./vaultFolders.js";

const VAULT_PATH_KEY = "maia.vaultPath";
export const NOTES_MIGRATED_KEY = "maia.notesMigrated";

export const isTauri = () =>
  typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

export const getVaultPath = () => localStorage.getItem(VAULT_PATH_KEY);
export const setVaultPath = (path) => localStorage.setItem(VAULT_PATH_KEY, path);

export const pickVaultFolder = async () => {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ directory: true, title: "Choose your MAIA vault folder" });
  if (typeof selected !== "string") return null;

  // fs:scope in capabilities/default.json is intentionally near-empty (no
  // more `$HOME/**`) — grant scope to exactly this picked folder at runtime
  // instead. tauri-plugin-persisted-scope remembers the grant across
  // restarts, so the user isn't asked to re-pick every launch.
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("allow_vault_scope", { path: selected });

  return selected;
};

const RECENT_VAULTS_KEY = "maia.recentVaults";
export const MAX_RECENT_VAULTS = 5;

/** Last path segment, for showing a vault by name. Handles / and \\ separators. */
export const vaultName = (path) => {
  if (typeof path !== "string") return "";
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
};

/** Recently used vault paths, most recent first. Anything malformed in storage is dropped. */
export const getRecentVaults = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_VAULTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((p) => typeof p === "string" && p.trim() !== "");
    return [...new Set(valid)].slice(0, MAX_RECENT_VAULTS);
  } catch {
    return [];
  }
};

/** Moves `path` to the front of the recents (deduped, capped) and returns the new list. */
export const pushRecentVault = (path) => {
  if (typeof path !== "string" || path.trim() === "") return getRecentVaults();
  const next = [path, ...getRecentVaults().filter((p) => p !== path)].slice(0, MAX_RECENT_VAULTS);
  try {
    localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the list lasts for this session only
  }
  return next;
};

/**
 * Throws if the folder can't be listed (moved, offline, no fs scope). Run it
 * before committing to a vault switch so a bad target changes nothing.
 */
export const probeVault = async (path) => {
  const { readDir } = await import("@tauri-apps/plugin-fs");
  await readDir(path);
};

/**
 * Thrown by saveNote when the on-disk file has changed since MAIA last read
 * it (an external editor — Obsidian, a text editor, iCloud resolving a
 * sync conflict) and the caller's version would otherwise silently clobber
 * it. Carries enough to let the caller preserve both sides.
 */
export class VaultConflictError extends Error {
  constructor(id, { diskText, attemptedText, filename }) {
    super(`Vault file "${filename}" changed on disk since it was last read.`);
    this.name = "VaultConflictError";
    this.noteId = id;
    this.diskText = diskText;
    this.attemptedText = attemptedText;
    this.filename = filename;
  }
}

// id → path relative to the vault ("Omnis/PROJECTS/x.md"), rebuilt on every load
let fileMap = new Map();
// id → markdown text as last read from (or written to) disk — the baseline
// a save compares against to detect an external change.
let contentMap = new Map();
// Files that exist but could not be read on the last load. They have no id in
// fileMap, so their names must still count as taken or a save could overwrite them.
let unreadable = new Set();

const joinPath = (dir, name) => `${dir.replace(/\/+$/, "")}/${name}`;
const READ_CONCURRENCY = 8;
const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

// Vault is on a cloud drive: list folders level by level, a few at a time.
const walkVault = async (vaultPath, readDir) => {
  const files = [];
  const folders = [];
  let level = [""];
  while (level.length > 0) {
    const listings = await mapLimit(level, READ_CONCURRENCY, async (dir) => {
      try {
        return { dir, entries: await readDir(dir ? joinPath(vaultPath, dir) : vaultPath) };
      } catch (e) {
        if (dir === "") throw e; // the vault itself unreadable = a failed load, not an empty vault
        console.error(`[MAIA] Failed to list vault folder "${dir}"`, e);
        return { dir, entries: [] };
      }
    });
    level = [];
    for (const { dir, entries } of listings) {
      for (const entry of entries) {
        const rel = joinRel(dir, entry.name);
        if (entry.isDirectory) {
          if (isSkippedDir(entry.name, dir === "")) continue;
          folders.push(rel);
          level.push(rel);
        } else if (entry.isFile && isNoteFile(entry.name)) {
          files.push(rel);
        }
      }
    }
  }
  return { files: files.sort(), folders };
};

// Obsidian notes usually have no createdAt; the file time keeps their order
// stable instead of stamping "now" on every load.
const fileTime = async (vaultPath, rel) => {
  try {
    const fs = await import("@tauri-apps/plugin-fs");
    const info = await fs.stat(joinPath(vaultPath, rel));
    const t = info?.mtime ?? info?.birthtime;
    return t ? new Date(t).toISOString() : EPOCH_ISO;
  } catch {
    return EPOCH_ISO;
  }
};

const readOne = async (vaultPath, rel, readTextFile) => {
  try {
    const text = await readTextFile(joinPath(vaultPath, rel));
    const hasCreated = /^createdAt:/m.test(text.slice(0, 4000));
    return { rel, text, fileCreatedAt: hasCreated ? undefined : await fileTime(vaultPath, rel) };
  } catch (e) {
    console.error(`[MAIA] Failed to read vault file "${rel}"`, e);
    return { rel, error: true };
  }
};

/**
 * Reads every note under the vault, recursively. Never writes. Returns
 * { notes, folders }: each note carries `folder` (derived from its location,
 * never stored in the file); `folders` lists every folder including empty ones.
 */
export const loadVault = async (vaultPath) => {
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const { files, folders } = await walkVault(vaultPath, readDir);
  const results = await mapLimit(files, READ_CONCURRENCY, (rel) => readOne(vaultPath, rel, readTextFile));

  const notes = [];
  const nextMap = new Map();
  const nextContentMap = new Map();
  const nextUnreadable = new Set();

  for (const { rel, text, error, fileCreatedAt } of results) {
    if (error) {
      nextUnreadable.add(rel);
      continue;
    }
    try {
      const note = markdownToNote(text, {
        fallbackId: stableId(rel),
        fallbackTitle: relBase(rel).replace(/\.md$/i, ""),
        fallbackCreatedAt: fileCreatedAt,
      });
      if (nextMap.has(note.id)) {
        // Don't just drop the loser — a silently vanished note is a data-loss
        // bug in its own right. Give it a fresh id so both survive as
        // separate notes; the user can tell them apart and delete the dupe.
        // Derived from the path so it is the same on every load.
        console.warn(`[MAIA] Duplicate note id "${note.id}" in vault ("${rel}") — reassigning a new id so both are kept`);
        note.id = stableId(`${rel}#dup`);
      }
      nextMap.set(note.id, rel);
      nextContentMap.set(note.id, text);
      notes.push({ ...note, folder: relDir(rel) });
    } catch (e) {
      console.error(`[MAIA] Failed to parse vault file "${rel}"`, e);
      nextUnreadable.add(rel);
    }
  }

  fileMap = nextMap;
  contentMap = nextContentMap;
  unreadable = nextUnreadable;
  notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
  return { notes, folders: normalizeFolderList([...folders, ...notes.map((n) => n.folder)]) };
};

/** Notes only; see loadVault for folders. */
export const loadNotes = async (vaultPath) => (await loadVault(vaultPath)).notes;

const takenNames = (folder, exceptId) => {
  const names = [...fileMap]
    .filter(([id, rel]) => id !== exceptId && relDir(rel) === folder)
    .map(([, rel]) => relBase(rel).toLowerCase());
  const blocked = [...unreadable].filter((rel) => relDir(rel) === folder).map((rel) => relBase(rel).toLowerCase());
  return new Set([...names, ...blocked]);
};

const uniqueMd = (base, taken) => {
  let name = `${base}.md`;
  for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${base}-${n}.md`;
  return name;
};

// A note whose title still matches its file name keeps that name (a foreign
// "Design System.md" must not become "design-system.md" just because it was
// edited); a changed title renames the file as before.
const pickName = (note, current, taken) => {
  const currentBase = current ? relBase(current).replace(/\.md$/i, "") : null;
  const slug = slugifyTitle(note.title);
  if (currentBase && slug && slugifyTitle(currentBase) === slug) return uniqueMd(currentBase, taken);
  return noteFilename(note, taken);
};

export const saveNote = async (vaultPath, note) => {
  const { writeTextFile, remove, exists, readTextFile, mkdir } = await import("@tauri-apps/plugin-fs");
  const current = fileMap.get(note.id);
  const folder = note.folder == null
    ? (current ? relDir(current) : "")
    : validateFolderPath(note.folder, { allowRoot: true });
  const nextText = noteToMarkdown(note);

  // Conflict check: if we have a prior baseline for this note and the file
  // on disk no longer matches it, something else touched the file since we
  // last read it. Overwriting blind would silently destroy that edit.
  let onDiskText = null;
  if (current) {
    const path = joinPath(vaultPath, current);
    if (await exists(path)) {
      const onDisk = await readTextFile(path);
      onDiskText = onDisk;
      const baseline = contentMap.get(note.id);
      if (baseline !== undefined && onDisk !== baseline && onDisk !== nextText) {
        throw new VaultConflictError(note.id, { diskText: onDisk, attemptedText: nextText, filename: current });
      }
    }
  }

  // Never land on a file that already exists but isn't ours (created outside
  // MAIA since the last load).
  const taken = takenNames(folder, note.id);
  let desired = joinRel(folder, pickName(note, current, taken));
  while (desired.toLowerCase() !== current?.toLowerCase() && await exists(joinPath(vaultPath, desired))) {
    taken.add(relBase(desired).toLowerCase());
    desired = joinRel(folder, pickName(note, current, taken));
  }

  // Opening a note triggers a save (the counts change). When the text and the path are exactly what
  // is on disk, writing again would only bump the file's mtime and make a cloud drive re-sync it.
  if (current && desired === current && onDiskText === nextText) {
    contentMap.set(note.id, nextText);
    return;
  }

  if (folder) await mkdir(joinPath(vaultPath, folder), { recursive: true });
  await writeTextFile(joinPath(vaultPath, desired), nextText);

  if (current && current !== desired) {
    try {
      if (await exists(joinPath(vaultPath, current))) {
        await remove(joinPath(vaultPath, current));
      }
    } catch (e) {
      console.error(`[MAIA] Failed to remove old file after rename: "${current}"`, e);
    }
  }
  fileMap.set(note.id, desired);
  contentMap.set(note.id, nextText);
};

export const deleteNoteFile = async (vaultPath, id) => {
  const name = fileMap.get(id);
  if (!name) return;
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  try {
    if (await exists(joinPath(vaultPath, name))) {
      await remove(joinPath(vaultPath, name));
    }
  } finally {
    fileMap.delete(id);
    contentMap.delete(id);
  }
};

/** mkdir -p inside the vault. Returns the validated path. */
export const createFolder = async (vaultPath, path) => {
  const valid = validateFolderPath(path);
  const { mkdir } = await import("@tauri-apps/plugin-fs");
  await mkdir(joinPath(vaultPath, valid), { recursive: true });
  return valid;
};

// Our own saves echo back as fs events. A path whose disk text equals what we
// last wrote (or that we removed ourselves) is not an outside change.
const isOwnEcho = async (vaultPath, rel, readTextFile, exists) => {
  if (!/\.md$/i.test(rel)) return false; // folder events always count
  const id = [...fileMap].find(([, p]) => p === rel)?.[0];
  try {
    const present = await exists(joinPath(vaultPath, rel));
    if (id === undefined) return !present;
    return present && (await readTextFile(joinPath(vaultPath, rel))) === contentMap.get(id);
  } catch {
    return false;
  }
};

/**
 * Watches the vault (recursively) for changes made outside MAIA (Obsidian,
 * iCloud, a text editor, `git pull`) and calls `onChange` — debounced, since a
 * single external save can fire several raw fs events. Events inside dot
 * folders, Opus/, node_modules, non-.md files and MAIA's own writes are
 * dropped so they never trigger a reload. Returns an unwatch function.
 */
export const watchVault = async (vaultPath, onChange, { debounceMs = 400 } = {}) => {
  const { watchImmediate, readTextFile, exists } = await import("@tauri-apps/plugin-fs");
  let timer = null;
  let pending = new Set();
  let hasUnknown = false;

  const run = async () => {
    timer = null;
    const paths = [...pending];
    const unknown = hasUnknown;
    pending = new Set();
    hasUnknown = false;
    if (!unknown) {
      let changed = false;
      for (const rel of paths) {
        if (!(await isOwnEcho(vaultPath, rel, readTextFile, exists))) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
    }
    onChange();
  };

  const unwatch = await watchImmediate(
    vaultPath,
    (event) => {
      const eventPaths = Array.isArray(event?.paths) ? event.paths : [];
      let relevant = eventPaths.length === 0; // no path info: assume it matters
      if (relevant) hasUnknown = true;
      for (const p of eventPaths) {
        const rel = toRelPath(vaultPath, p);
        if (rel === null) {
          relevant = true;
          hasUnknown = true;
        } else if (isNotePath(rel)) {
          relevant = true;
          pending.add(rel);
        }
      }
      if (!relevant) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, debounceMs);
    },
    { recursive: true }
  );
  return () => {
    if (timer) clearTimeout(timer);
    unwatch();
  };
};

export const migrateFromLocalStorage = async (vaultPath, notes) => {
  for (const note of notes) {
    await saveNote(vaultPath, note);
  }
  // localStorage copy is intentionally kept as a backup
  localStorage.setItem(NOTES_MIGRATED_KEY, "true");
};

export const isMigrated = () => localStorage.getItem(NOTES_MIGRATED_KEY) === "true";
