// @maia:vault — markdown vault adapter (Tauri only; web falls back to localStorage)
// All Tauri imports are dynamic so the web/PWA bundle never touches them.
import { markdownToNote, noteToMarkdown, noteFilename } from "./noteFile.js";
import { uid } from "./ids.js";

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

// id → filename map, rebuilt on every loadNotes
let fileMap = new Map();
// id → markdown text as last read from (or written to) disk — the baseline
// a save compares against to detect an external change.
let contentMap = new Map();

const joinPath = (dir, name) => `${dir.replace(/\/+$/, "")}/${name}`;

export const loadNotes = async (vaultPath) => {
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const entries = await readDir(vaultPath);
  const notes = [];
  const nextMap = new Map();
  const nextContentMap = new Map();

  for (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    try {
      const text = await readTextFile(joinPath(vaultPath, entry.name));
      const note = markdownToNote(text, {
        fallbackId: uid(),
        fallbackTitle: entry.name.replace(/\.md$/, ""),
      });
      if (nextMap.has(note.id)) {
        // Don't just drop the loser — a silently vanished note is a data-loss
        // bug in its own right. Give it a fresh id so both survive as
        // separate notes; the user can tell them apart and delete the dupe.
        console.warn(`[MAIA] Duplicate note id "${note.id}" in vault ("${entry.name}") — reassigning a new id so both are kept`);
        note.id = uid();
      }
      nextMap.set(note.id, entry.name);
      nextContentMap.set(note.id, text);
      notes.push(note);
    } catch (e) {
      console.error(`[MAIA] Failed to read vault file "${entry.name}"`, e);
    }
  }

  fileMap = nextMap;
  contentMap = nextContentMap;
  notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notes;
};

export const saveNote = async (vaultPath, note) => {
  const { writeTextFile, remove, exists, readTextFile } = await import("@tauri-apps/plugin-fs");
  const taken = new Set(
    [...fileMap.entries()].filter(([id]) => id !== note.id).map(([, name]) => name)
  );
  const desired = noteFilename(note, taken);
  const current = fileMap.get(note.id);
  const nextText = noteToMarkdown(note);

  // Conflict check: if we have a prior baseline for this note and the file
  // on disk no longer matches it, something else touched the file since we
  // last read it. Overwriting blind would silently destroy that edit.
  if (current) {
    const path = joinPath(vaultPath, current);
    if (await exists(path)) {
      const onDisk = await readTextFile(path);
      const baseline = contentMap.get(note.id);
      if (baseline !== undefined && onDisk !== baseline && onDisk !== nextText) {
        throw new VaultConflictError(note.id, { diskText: onDisk, attemptedText: nextText, filename: current });
      }
    }
  }

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

/**
 * Watches the vault folder for changes made outside MAIA (Obsidian, iCloud,
 * a text editor, `git pull`) and calls `onChange` — debounced, since a
 * single external save can fire several raw fs events. Returns an unwatch
 * function; no-ops (and warns) outside Tauri.
 */
export const watchVault = async (vaultPath, onChange, { debounceMs = 400 } = {}) => {
  const { watchImmediate } = await import("@tauri-apps/plugin-fs");
  let timer = null;
  const scheduled = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs);
  };
  const unwatch = await watchImmediate(vaultPath, () => scheduled());
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
