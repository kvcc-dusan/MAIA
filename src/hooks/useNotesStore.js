import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "./useLocalStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { markdownToNote } from "../lib/noteFile.js";
import { uid } from "../lib/ids.js";
import { hasPendingCloseFlush, runCloseFlush } from "../lib/closeFlush.js";
import {
  isTauri,
  getVaultPath,
  setVaultPath,
  probeVault,
  loadNotes,
  saveNote,
  deleteNoteFile,
  watchVault,
  VaultConflictError,
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
  const meta = useMemo(() => ({ status: "ready", error: null, reload: () => {}, switchVault: async () => {} }), []);
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
  const inflightRef = useRef(new Set()); // running flushes, so a vault switch can wait for them

  const load = useCallback(async () => {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
      setStatus("needs-vault");
      return;
    }
    try {
      const loaded = await loadNotes(vaultPath);
      setNotes((prev) => {
        const loadedIds = new Set(loaded.map((n) => n.id));
        // A clean (already-saved) note whose file is no longer in the vault
        // was removed outside MAIA (Obsidian, Finder, `git checkout`, iCloud
        // conflict resolution). It previously just vanished with no signal —
        // now the user is told why.
        const vanished = prev.filter((n) => !dirtyRef.current.has(n.id) && !loadedIds.has(n.id));
        vanished.forEach((n) => {
          toast.error(`"${n.title || "Untitled"}" is gone — its file was removed or moved outside MAIA.`);
        });

        if (dirtyRef.current.size === 0) return loaded;

        // Don't clobber notes that have edits waiting to hit disk. A dirty
        // note that hasn't been written yet at all (brand new, still inside
        // the debounce window) won't be in `loaded` — it must be kept as an
        // extra, not dropped, or a reload right after creating a note would
        // silently erase it.
        const prevById = new Map(prev.map((n) => [n.id, n]));
        const merged = loaded.map((n) => (dirtyRef.current.has(n.id) ? prevById.get(n.id) || n : n));
        const extras = prev.filter((n) => dirtyRef.current.has(n.id) && !loadedIds.has(n.id));
        return [...extras, ...merged];
      });
      prevNotesRef.current = null; // reset diff baseline after external reload
      setStatus("ready");
      setError(null);
      return true;
    } catch (e) {
      console.error("[MAIA] Failed to load vault", e);
      setError(e);
      setStatus("error");
      return false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-read vault when the window regains focus (belt-and-suspenders: the
  // watcher below covers real-time external edits, focus covers anything
  // it misses — a dropped fs event, a network volume, etc).
  useEffect(() => {
    if (status !== "ready") return;
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, load]);

  // Live-watch the vault folder so external edits (Obsidian, iCloud, git)
  // show up without waiting for the window to regain focus.
  useEffect(() => {
    if (status !== "ready") return;
    const vaultPath = getVaultPath();
    if (!vaultPath) return;
    let unwatch = null;
    let cancelled = false;
    watchVault(vaultPath, load)
      .then((fn) => {
        if (cancelled) fn();
        else unwatch = fn;
      })
      .catch((e) => console.error("[MAIA] Failed to watch vault folder", e));
    return () => {
      cancelled = true;
      if (unwatch) unwatch();
    };
  }, [status, load]);

  const runFlush = useCallback(async () => {
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
        if (e instanceof VaultConflictError) {
          // Someone/something else changed this file since we last read it.
          // Keep BOTH versions instead of picking a winner: the original
          // slot reverts to what's actually on disk, and the edit we were
          // about to save becomes its own note for the user to merge by hand.
          console.warn("[MAIA] Vault conflict on save — keeping both versions", e);

          const diskNote = markdownToNote(e.diskText, {
            fallbackId: item.id,
            fallbackTitle: item.note.title || "Untitled",
          });
          diskNote.id = item.id;

          const conflictNote = {
            ...item.note,
            id: uid(),
            title: `${item.note.title || "Untitled"} (conflict copy)`,
          };

          setNotes((prev) => [
            conflictNote,
            ...prev.map((n) => (n.id === item.id ? diskNote : n)),
          ]);
          // The notes-diff effect below picks up both the reverted original
          // and the new conflict-copy note and schedules their writes.

          toast.error(
            `"${item.note.title || "Untitled"}" changed outside MAIA — your edit is kept as "${conflictNote.title}" for you to merge by hand.`
          );
        } else {
          console.error("[MAIA] Vault write failed — will retry on next change", e);
          pendingRef.current.set(item.id, item); // keep for retry
          toast.error(`Couldn't save "${item.note?.title || "a note"}" to the vault — will retry.`);
        }
      }
    }
  }, []);

  const flush = useCallback(() => {
    const run = runFlush();
    inflightRef.current.add(run);
    const done = () => inflightRef.current.delete(run);
    run.then(done, done);
    return run;
  }, [runFlush]);

  // Point the app at another vault folder. Order matters: the target is probed
  // first (a bad folder changes nothing), pending edits are written to the OLD
  // vault, and only then is the path swapped and the in-memory state reset, so
  // the old vault's notes can never be written into the new one.
  const switchVault = useCallback(async (nextPath) => {
    const prevPath = getVaultPath();
    if (!nextPath || nextPath === prevPath) return;
    await probeVault(nextPath);

    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
    await Promise.allSettled([...inflightRef.current]);
    if (pendingRef.current.size > 0) {
      throw new Error("Some notes could not be saved to the current vault yet, so nothing was switched. Try again in a moment.");
    }

    setVaultPath(nextPath);
    dirtyRef.current.clear();
    prevNotesRef.current = null;
    setNotes([]);
    setStatus("loading");
    setError(null);
    const isLoaded = await load();
    if (isLoaded) return;

    if (prevPath) setVaultPath(prevPath);
    await load();
    throw new Error("The new vault could not be read, so MAIA went back to the previous one.");
  }, [flush, load]);

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

  // Flush pending writes when the app closes. `beforeunload` covers the web
  // preview and most in-webview navigations; it is not guaranteed to fire
  // for a native window-close/Cmd+Q in every Tauri configuration, so we also
  // hook the window's own close-requested event and hold the close until the
  // flush resolves.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    let unlisten = null;
    let cancelled = false;
    if (isTauri()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          if (cancelled) return;
          return getCurrentWindow().onCloseRequested(async (event) => {
            // Other stores (Opus) share this one close handler, see closeFlush.js.
            if (pendingRef.current.size === 0 && !hasPendingCloseFlush()) return; // nothing to hold up
            event.preventDefault();
            if (timerRef.current) clearTimeout(timerRef.current);
            try {
              await Promise.all([flush(), runCloseFlush()]);
            } finally {
              await getCurrentWindow().destroy();
            }
          });
        })
        .then((fn) => {
          if (cancelled) fn?.();
          else unlisten = fn;
        })
        .catch((e) => console.error("[MAIA] Failed to register close handler", e));
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (unlisten) unlisten();
    };
  }, [flush]);

  const meta = useMemo(() => ({ status, error, reload: load, switchVault }), [status, error, load, switchVault]);
  return [notes, setNotes, meta];
}
