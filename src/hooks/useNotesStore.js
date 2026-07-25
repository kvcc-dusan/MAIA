import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import {
  isTauri,
  getVaultPath,
  loadNotes,
  saveNote,
  deleteNoteFile,
} from "../lib/vault.js";

const WRITE_DEBOUNCE_MS = 1000;

/**
 * Notes storage seam. Same [notes, setNotes, meta] contract everywhere:
 * - Web/PWA: plain localStorage (unchanged behavior).
 * - Tauri: markdown files in the user's vault folder.
 *
 * meta: { status: 'loading'|'needs-vault'|'ready'|'error', error, reload }
 */
const IS_TAURI = isTauri();

export function useNotesStore() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- IS_TAURI is fixed for the app's lifetime, so hook order never changes
  return IS_TAURI ? useVaultNotes() : useLocalNotes();
}

function useLocalNotes() {
  const [notes, setNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);
  const meta = useMemo(() => ({ status: "ready", error: null, reload: () => {} }), []);
  return [notes, setNotes, meta];
}

function useVaultNotes() {
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const prevNotesRef = useRef(null);
  const pendingRef = useRef(new Map()); // id → note (debounce buffer)
  const timerRef = useRef(null);
  const dirtyRef = useRef(new Set()); // ids with unflushed changes

  const load = useCallback(async () => {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
      setStatus("needs-vault");
      return;
    }
    try {
      const loaded = await loadNotes(vaultPath);
      // Don't clobber notes that have edits waiting to hit disk
      setNotes((prev) => {
        if (dirtyRef.current.size === 0) return loaded;
        const dirty = new Map(
          prev.filter((n) => dirtyRef.current.has(n.id)).map((n) => [n.id, n])
        );
        return loaded.map((n) => dirty.get(n.id) || n);
      });
      prevNotesRef.current = null; // reset diff baseline after external reload
      setStatus("ready");
      setError(null);
    } catch (e) {
      console.error("[MAIA] Failed to load vault", e);
      setError(e);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-read vault when the window regains focus (external edits: Obsidian, iCloud)
  useEffect(() => {
    if (status !== "ready") return;
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, load]);

  const flush = useCallback(async () => {
    const vaultPath = getVaultPath();
    if (!vaultPath) return;
    const batch = [...pendingRef.current.values()];
    pendingRef.current = new Map();
    for (const item of batch) {
      try {
        if (item.deleted) {
          await deleteNoteFile(vaultPath, item.id);
        } else {
          await saveNote(vaultPath, item.note);
        }
        dirtyRef.current.delete(item.id);
      } catch (e) {
        console.error("[MAIA] Vault write failed — will retry on next change", e);
        pendingRef.current.set(item.id, item); // keep for retry
      }
    }
  }, []);

  // Diff notes state → schedule per-note writes
  useEffect(() => {
    if (status !== "ready") return;
    const prev = prevNotesRef.current;
    prevNotesRef.current = notes;
    if (prev === null) return; // first ready render — nothing to persist

    const prevById = new Map(prev.map((n) => [n.id, n]));
    const nextById = new Map(notes.map((n) => [n.id, n]));

    for (const note of notes) {
      if (prevById.get(note.id) !== note) {
        pendingRef.current.set(note.id, { id: note.id, note });
        dirtyRef.current.add(note.id);
      }
    }
    for (const old of prev) {
      if (!nextById.has(old.id)) {
        pendingRef.current.set(old.id, { id: old.id, deleted: true });
        dirtyRef.current.add(old.id);
      }
    }

    if (pendingRef.current.size === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, WRITE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, status, flush]);

  // Flush pending writes when the app closes
  useEffect(() => {
    const onBeforeUnload = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  const meta = useMemo(() => ({ status, error, reload: load }), [status, error, load]);
  return [notes, setNotes, meta];
}
