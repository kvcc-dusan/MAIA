// @maia:vault — markdown vault adapter (Tauri only; web falls back to localStorage)
// All Tauri imports are dynamic so the web/PWA bundle never touches them.
import { noteToMarkdown, slugifyTitle } from "./noteFile.js";
import {
  isNotePath, relDir, relBase, joinRel,
  toRelPath, validateFolderPath,
} from "./vaultFolders.js";
import { snapshotVault, joinPath } from "./vaultLoad.js";
import { writeTextAtomic, ATOMIC_WRITES } from "./atomicWrite.js";

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
// id → title as last read from (or written to) disk. A file is renamed only when the title
// changed in MAIA since then: saving a note whose title differs from its file name (an Obsidian
// note with a frontmatter title) used to rename it to the title's slug and break links to it.
let titleMap = new Map();
// Files that exist but could not be read on the last load. They have no id in
// fileMap, so their names must still count as taken or a save could overwrite them.
let unreadable = new Set();

const MAX_LOAD_ATTEMPTS = 3;

// Last read of every note file (see vaultLoad.js), tied to one vault so a switch starts cold.
let fileCache = new Map();
let cacheVault = null;
// A load that overlaps a save/delete can see half of a rename (old and new file both
// present, or neither). These counters let the loader notice and take a fresh snapshot.
let mutationSeq = 0;
let activeMutations = 0;
let loadToken = 0;

const trackMutation = async (fn) => {
  mutationSeq += 1;
  activeMutations += 1;
  try {
    return await fn();
  } finally {
    activeMutations -= 1;
    mutationSeq += 1;
  }
};

/**
 * Reads every note under the vault, recursively; only files whose mtime or size changed
 * since the previous load are read again. Never writes. Returns { notes, folders, stats }:
 * each note carries `folder` (derived from its location, never stored in the file);
 * `folders` lists every folder including empty ones; `stats.reads` is how many files
 * were really read. `keepBaselines` (a Set of note ids, read at commit time) are notes with
 * unsaved edits: their conflict baseline stays what MAIA last read, so an outside edit that
 * lands before the save is still reported as a conflict instead of being adopted silently.
 */
export const loadVault = async (vaultPath, { keepBaselines } = {}) => {
  const fs = await import("@tauri-apps/plugin-fs");
  if (cacheVault !== vaultPath) {
    fileCache = new Map();
    cacheVault = vaultPath;
  }
  const token = (loadToken += 1);
  let snap;
  let totalReads = 0;
  for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt += 1) {
    const seq = mutationSeq;
    const wasQuiet = activeMutations === 0;
    snap = await snapshotVault(vaultPath, fs, fileCache);
    totalReads += snap.stats.reads;
    const stable = wasQuiet && activeMutations === 0 && seq === mutationSeq;
    // A save that finished mid-load is not in this snapshot: keep the read files (cheap
    // next time) and look again. After the last attempt, accept what we have.
    if (token === loadToken) fileCache = snap.nextCache;
    if (stable) break;
  }
  // A newer load started meanwhile (or the vault changed): only the latest may set the
  // baselines, or an older snapshot could roll back what a save just recorded.
  if (token === loadToken) {
    for (const id of keepBaselines ?? []) {
      if (contentMap.has(id) && snap.nextMap.has(id)) snap.nextContentMap.set(id, contentMap.get(id));
    }
    const keep = new Set(keepBaselines ?? []);
    titleMap = new Map(snap.notes.map((n) => [n.id, keep.has(n.id) && titleMap.has(n.id) ? titleMap.get(n.id) : n.title]));
    fileMap = snap.nextMap;
    contentMap = snap.nextContentMap;
    unreadable = snap.nextUnreadable;
  }
  return { notes: snap.notes, folders: snap.folders, stats: { ...snap.stats, reads: totalReads } };
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

// An existing file keeps its name unless the title was changed in MAIA since the file was read:
// a foreign "Design System.md" or "00-overview.md" (title "Speculum Mundi") must not become a slug
// just because it was edited. A title changed in MAIA renames the file as before.
const pickName = (note, current, taken) => {
  const currentBase = current ? relBase(current).replace(/\.md$/i, "") : null;
  const slug = slugifyTitle(note.title);
  if (currentBase && titleMap.get(note.id) === note.title) return uniqueMd(currentBase, taken);
  if (currentBase && slug && slugifyTitle(currentBase) === slug) return uniqueMd(currentBase, taken);
  // The loader skips dot files, so a title like ".env notes" must not produce one: the
  // note would be saved and then vanish from the list on the next load.
  const base = slugifyTitle(note.title).replace(/^\.+/, "") || `untitled-${String(note.id).slice(0, 5)}`;
  return uniqueMd(base, taken);
};

const saveNoteNow = async (vaultPath, note) => {
  const fs = await import("@tauri-apps/plugin-fs");
  const { remove, exists, readTextFile, mkdir } = fs;
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
    return false;
  }

  if (folder) await mkdir(joinPath(vaultPath, folder), { recursive: true });
  // The cache holds the pre-write stat of these paths; never let a reload trust it.
  fileCache.delete(desired);
  if (current) fileCache.delete(current);
  await writeTextAtomic(fs, joinPath(vaultPath, desired), nextText, { atomic: ATOMIC_WRITES });

  // On a case-insensitive disk (macOS) "Omnis/projects" and "Omnis/PROJECTS" are the same
  // folder: the write above already replaced the file, so removing "the old one" would
  // delete the note we just saved.
  const isSameFile = current?.toLowerCase() === desired.toLowerCase();
  if (current && current !== desired && !isSameFile) {
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
  titleMap.set(note.id, note.title);
  return true;
};

// Resolves true when the file was written, false when it already matched (mtime untouched).
export const saveNote = (vaultPath, note) => trackMutation(() => saveNoteNow(vaultPath, note));

const deleteNoteNow = async (vaultPath, id) => {
  const name = fileMap.get(id);
  if (!name) return;
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  fileCache.delete(name);
  try {
    if (await exists(joinPath(vaultPath, name))) {
      await remove(joinPath(vaultPath, name));
    }
  } finally {
    fileMap.delete(id);
    contentMap.delete(id);
    titleMap.delete(id);
  }
};

export const deleteNoteFile = (vaultPath, id) => trackMutation(() => deleteNoteNow(vaultPath, id));

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
