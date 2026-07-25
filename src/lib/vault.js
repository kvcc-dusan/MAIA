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
  return typeof selected === "string" ? selected : null;
};

// id → filename map, rebuilt on every loadNotes
let fileMap = new Map();

const joinPath = (dir, name) => `${dir.replace(/\/+$/, "")}/${name}`;

export const loadNotes = async (vaultPath) => {
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const entries = await readDir(vaultPath);
  const notes = [];
  const nextMap = new Map();

  for (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    try {
      const text = await readTextFile(joinPath(vaultPath, entry.name));
      const note = markdownToNote(text, {
        fallbackId: uid(),
        fallbackTitle: entry.name.replace(/\.md$/, ""),
      });
      if (nextMap.has(note.id)) {
        console.warn(`[MAIA] Duplicate note id "${note.id}" in vault — keeping last read (${entry.name})`);
      }
      nextMap.set(note.id, entry.name);
      notes.push(note);
    } catch (e) {
      console.error(`[MAIA] Failed to read vault file "${entry.name}"`, e);
    }
  }

  fileMap = nextMap;
  notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notes;
};

export const saveNote = async (vaultPath, note) => {
  const { writeTextFile, remove, exists } = await import("@tauri-apps/plugin-fs");
  const taken = new Set(
    [...fileMap.entries()].filter(([id]) => id !== note.id).map(([, name]) => name)
  );
  const desired = noteFilename(note, taken);
  const current = fileMap.get(note.id);

  await writeTextFile(joinPath(vaultPath, desired), noteToMarkdown(note));

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
  }
};

export const migrateFromLocalStorage = async (vaultPath, notes) => {
  for (const note of notes) {
    await saveNote(vaultPath, note);
  }
  // localStorage copy is intentionally kept as a backup
  localStorage.setItem(NOTES_MIGRATED_KEY, "true");
};

export const isMigrated = () => localStorage.getItem(NOTES_MIGRATED_KEY) === "true";
