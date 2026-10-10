import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "./useLocalStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { markdownToNote } from "../lib/noteFile.js";
import { uid } from "../lib/ids.js";
import { normalizeFolderList } from "../lib/vaultFolders.js";
import { invalidateVaultFileIndex } from "../lib/vaultFiles.js";
import { hasPendingCloseFlush, runCloseFlush } from "../lib/closeFlush.js";
import {
  isTauri,
  getVaultPath,
  setVaultPath,
  probeVault,
  loadVault,
  createFolder as createVaultFolder,
  saveNote,
  deleteNoteFile,
  watchVault,
  VaultConflictError,
} from "../lib/vault.js";

const WRITE_DEBOUNCE_MS = 1000;

// Same elements in the same order. Unchanged files come back as the same objects, so a
// focus reload with no outside edits leaves state untouched and re-renders nothing.
const sameList = (a, b) => a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Notes storage seam. Same [notes, setNotes, meta] contract everywhere:
 * - Web/PWA: plain localStorage (unchanged behavior).
 * - Tauri: markdown files in the user's vault folder.
 *
 * meta: { status: 'loading'|'needs-vault'|'ready'|'error', error, reload,
 *   folders, createFolder } — `folders` is every vault folder path ([] on web).
 * Each note carries `folder` ("" = vault root), derived from where its file is.
 */
const IS_TAURI = isTauri();

export function useNotesStore() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- IS_TAURI is fixed for the app's lifetime, so hook order never changes
  return IS_TAURI ? useVaultNotes() : useLocalNotes();
}

function useLocalNotes() {
  const [notes, setNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);
  const meta = useMemo(() => ({
    status: "ready", error: null, reload: () => {}, switchVault: async () => {},
    folders: [],
    createFolder: async () => {
      throw new Error("Folders need the desktop app with a vault.");
    },
  }), []);
  // Older web notes were saved without `folder`; consumers can rely on it.
  const withFolder = useMemo(() => notes.map((n) => (n.folder === undefined ? { ...n, folder: "" } : n)), [notes]);
  return [withFolder, setNotes, meta];
}

function useVaultNotes() {
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [diskFolders, setDiskFolders] = useState([]);

  const prevNotesRef = useRef(null);
  const pendingRef = useRef(new Map()); // id → note (debounce buffer)
  const timerRef = useRef(null);
  const dirtyRef = useRef(new Set()); // ids with unflushed changes
  const inflightRef = useRef(new Set()); // running flushes, so a vault switch can wait for them
  const loadRunRef = useRef(null); // the running load, if any
  const loadQueuedRef = useRef(false);
  const lastLoadCountRef = useRef(-1);

  const loadOnce = useCallback(async () => {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
      setStatus("needs-vault");
      return;
    }
    try {
      const { notes: loaded, folders: loadedFolders, stats } = await loadVault(vaultPath, { keepBaselines: dirtyRef.current });
      // The vault was switched while this load was running: its notes belong to the old one.
      if (getVaultPath() !== vaultPath) return false;
      // No file was read, so no note changed. (A missing stats object means "assume changed".)
      if (!stats || stats.reads > 0 || loaded.length !== lastLoadCountRef.current) invalidateVaultFileIndex(); // attachments may have changed along with the notes
      lastLoadCountRef.current = loaded.length;
      setDiskFolders((prev) => (sameList(prev, loadedFolders) ? prev : loadedFolders));
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

        // The diff baseline is only reset when the state really changes: with nothing new
        // no render follows, and the diff effect would never consume the reset.
        if (dirtyRef.current.size === 0) {
          if (sameList(prev, loaded)) return prev;
          prevNotesRef.current = null;
          return loaded;
        }
        prevNotesRef.current = null;

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

  // Focus, watcher and mount all call this. One load runs at a time; calls that arrive
  // meanwhile share a single follow-up run (a change can land after the running load listed
  // the folders, so the follow-up is not optional).
  const load = useCallback(() => {
    if (loadRunRef.current) {
      loadQueuedRef.current = true;
      return loadRunRef.current;
    }
    const run = (async () => {
      try {
        let result;
        do {
          loadQueuedRef.current = false;
          result = await loadOnce();
        } while (loadQueuedRef.current && result !== false);
        return result;
      } finally {
        loadRunRef.current = null;
      }
    })();
    loadRunRef.current = run;
    return run;
  }, [loadOnce]);

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
    setDiskFolders([]);
    setStatus("loading");
    setError(null);
    // loadOnce, not load: a running load for the old vault must not be shared with this one.
    const isLoaded = await loadOnce();
    if (isLoaded) return;

    if (prevPath) setVaultPath(prevPath);
    await loadOnce();
    throw new Error("The new vault could not be read, so MAIA went back to the previous one.");
  }, [flush, loadOnce]);

  // Diff notes state → schedule per-note writes
  useEffect(() => {
    if (status !== "ready") return;
    const prev = prevNotesRef.current;
    prevNotesRef.current = notes;
    // prev === null: first ready render or a reload, nothing to diff. A reload still has to
    // re-arm the write timer, because this effect's cleanup just cleared it for edits
    // that were already waiting.
    if (prev !== null) {
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

  // Folders on disk plus any a note already points at (a move or create into
  // a folder that the next load has not listed yet).
  const folders = useMemo(
    () => normalizeFolderList([...diskFolders, ...notes.map((n) => n.folder).filter(Boolean)]),
    [diskFolders, notes]
  );

  const createFolder = useCallback(async (path) => {
    const vaultPath = getVaultPath();
    if (!vaultPath) throw new Error("No vault is open.");
    const created = await createVaultFolder(vaultPath, path);
    setDiskFolders((prev) => normalizeFolderList([...prev, created]));
    return created;
  }, []);

  const meta = useMemo(
    () => ({ status, error, reload: load, switchVault, folders, createFolder }),
    [status, error, load, switchVault, folders, createFolder]
  );
  return [notes, setNotes, meta];
}
