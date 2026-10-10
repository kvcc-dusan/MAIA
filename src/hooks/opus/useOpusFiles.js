import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { VaultConflictError } from "../../lib/vault.js";
import { registerCloseFlush } from "../../lib/closeFlush.js";
import { diffOpus, mergeOps, sortOps, deepEqual } from "./opusDiff.js";
import { mergeDirty, addExtras } from "./opusMerge.js";
import { planConflicts } from "./opusConflict.js";
import { attachAssets, persistAssetChanges } from "./opusAssets.js";
import { runMigration } from "./opusMigration.js";
import { migrateLegacyAssets } from "./assetMigration.js";
import { emitAssetsChanged } from "./assetEvents.js";
import { getOpusApi, runOp } from "./opusOps.js";
import { useActivityFiles } from "./useActivityFiles.js";
import { runActivityMigration } from "./activityMigration.js";

const WRITE_DEBOUNCE_MS = 1000;
const EMPTY_STATE = { projects: [], tasks: [] };
const EMPTY_LIST = [];

const pickNext = (updater, current) => {
  const next = typeof updater === "function" ? updater(current) : updater;
  return Array.isArray(next) ? next : current;
};

/**
 * File-backed projects and tasks (Tauri with a vault). Mirrors useVaultNotes:
 * load, diff by item id into debounced per-item writes, reload on external
 * change, keep both versions on conflict. `vaultPath` null = idle (browser mode).
 */
export function useOpusFiles(vaultPath) {
  const [data, setData] = useState(EMPTY_STATE);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState(EMPTY_LIST);
  const [rootExists, setRootExists] = useState(false);
  const {
    activity, setActivity: setActivityState, reset: resetActivity, applyLoaded: applyActivity,
    isDirty: isActivityDirty, write: writeActivity,
  } = useActivityFiles();

  const statusRef = useRef(status);
  statusRef.current = status;
  const dataRef = useRef(data);
  dataRef.current = data;
  const knownIds = () => new Set(dataRef.current.projects.map((p) => p.id));
  const vaultRef = useRef(vaultPath); // the vault the in-memory state belongs to
  const generationRef = useRef(0); // bumped per vault so a stale load is dropped
  const baselineRef = useRef(null); // state as last read from / written to disk
  const pendingRef = useRef(new Map()); // op key -> op, waiting for the debounce
  const timerRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const scheduleRef = useRef(() => {}); // set once flush exists; writePending needs it for retries

  // Loads and flushes never overlap: a reload resets the adapter's remembered files.
  const exclusive = useCallback((fn) => {
    const run = queueRef.current.then(() => fn());
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  const loadInner = useCallback(async (generation, { revertKeys, extras } = {}) => {
    const path = vaultRef.current;
    if (!path || generation !== generationRef.current) return false;
    try {
      const api = await getOpusApi();
      const { loaded, status: migration } = await runMigration(api, path, await api.loadOpus(path));
      if (generation !== generationRef.current) return false;
      // Copies legacy browser-side assets into assets/ folders once; files only, no project or task write.
      if (migration !== "failed") await migrateLegacyAssets(api, path, loaded.projects);
      // Not after a failed project move: entries would land in _inbox for projects that have no folder yet.
      const withActivity = migration === "failed" ? { loaded, status: "skipped" } : await runActivityMigration(api, path, loaded);
      if (generation !== generationRef.current) return false;
      const final = withActivity.loaded;

      const disk = { projects: attachAssets(final.projects), tasks: final.tasks };
      revertKeys?.forEach((key) => pendingRef.current.delete(key));
      const baselineBefore = baselineRef.current;
      const queued = pendingRef.current;
      baselineRef.current = disk;
      setData((prev) => {
        const unseen = baselineBefore ? diffOpus(baselineBefore, prev) : [];
        const dirty = sortOps([...mergeOps(queued, unseen).values()]);
        const merged = addExtras(mergeDirty(disk, prev, dirty, revertKeys), extras ?? []);
        return deepEqual(merged, prev) ? prev : merged;
      });
      applyActivity(final.activityFiles);
      setWarnings((prev) => (deepEqual(prev, final.warnings) ? prev : final.warnings));
      setRootExists(final.exists);
      setError(null);
      statusRef.current = "ready";
      setStatus("ready");
      emitAssetsChanged(); // a reload resets the adapter's folder map, so open panels re-list
      return true;
    } catch (e) {
      console.error("[MAIA] Failed to load Opus files", e);
      // A failed background reload keeps working with what is in memory.
      if (statusRef.current !== "ready") {
        setError(e);
        statusRef.current = "error";
        setStatus("error");
      }
      return false;
    }
  }, [applyActivity]);

  const reload = useCallback(() => {
    const generation = generationRef.current;
    return exclusive(() => loadInner(generation));
  }, [exclusive, loadInner]);

  const writePending = useCallback(async () => {
    const path = vaultRef.current;
    if (!path || statusRef.current !== "ready") return;
    if (pendingRef.current.size === 0 && !isActivityDirty(knownIds())) return;
    const generation = generationRef.current;
    const batch = sortOps([...pendingRef.current.values()]);
    pendingRef.current = new Map();
    const api = await getOpusApi();
    const conflicts = [];
    let failed = 0;
    for (const op of batch) {
      try {
        await runOp(api, path, op);
        setRootExists(true);
      } catch (e) {
        if (e instanceof VaultConflictError) {
          console.warn("[MAIA] Opus conflict on save, keeping both versions", e);
          conflicts.push({ op });
        } else {
          console.error("[MAIA] Opus write failed, will retry on next change", e);
          failed += 1;
          if (!pendingRef.current.has(op.key)) pendingRef.current.set(op.key, op);
        }
      }
    }
    // Activity goes last so a new project's folder exists. A file changed outside MAIA is
    // merged by a reload, never copied aside: appended lines from Claude are not a conflict.
    const activityResult = await writeActivity(api, path, knownIds());
    failed += activityResult.failed;
    if (failed > 0) toast.error(`Couldn't save ${failed} change${failed === 1 ? "" : "s"} to the vault. MAIA will retry.`);
    if (generation !== generationRef.current) return;
    if (conflicts.length === 0 && activityResult.needsReload) {
      await loadInner(generation);
      scheduleRef.current();
      return;
    }
    if (conflicts.length === 0) return;
    const { extras, revertKeys, messages } = planConflicts(conflicts);
    await loadInner(generation, { revertKeys, extras });
    messages.forEach((message) => toast.error(message));
  }, [loadInner, writeActivity, isActivityDirty]);

  const flush = useCallback(() => exclusive(writePending), [exclusive, writePending]);
  const hasPending = useCallback(
    () => pendingRef.current.size > 0 || isActivityDirty(knownIds()),
    [isActivityDirty],
  );
  scheduleRef.current = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, WRITE_DEBOUNCE_MS);
  };

  // New vault (or none): drop everything tied to the old one, then load.
  // Pending edits were already flushed by the caller (DataContext switchVault).
  useEffect(() => {
    generationRef.current += 1;
    vaultRef.current = vaultPath;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingRef.current.size > 0) console.warn("[MAIA] Dropping unsaved Opus changes: the vault changed");
    pendingRef.current = new Map();
    baselineRef.current = null;
    resetActivity();
    if (!vaultPath) return;
    statusRef.current = "loading";
    setData(EMPTY_STATE);
    setWarnings(EMPTY_LIST);
    setError(null);
    setRootExists(false);
    setStatus("loading");
    reload();
  }, [vaultPath, reload, resetActivity]);

  // Diff state against the baseline and queue per-item writes.
  useEffect(() => {
    if (!vaultPath || status !== "ready") return;
    const baseline = baselineRef.current;
    if (baseline === null || baseline === data) return;
    baselineRef.current = data;
    try {
      persistAssetChanges(baseline, data);
    } catch (e) {
      console.error("[MAIA] Could not save project assets", e);
      toast.error("Couldn't save project assets: browser storage is full or blocked.");
    }
    const ops = diffOpus(baseline, data);
    if (ops.length === 0) return;
    pendingRef.current = mergeOps(pendingRef.current, ops);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, WRITE_DEBOUNCE_MS);
  }, [data, status, vaultPath, flush]);

  // Activity edits write on the same debounce as everything else.
  useEffect(() => {
    if (!vaultPath || status !== "ready" || !isActivityDirty(knownIds())) return;
    scheduleRef.current();
  }, [vaultPath, status, activity, data.projects, isActivityDirty]);

  // Watch Opus/ for edits from Claude, Obsidian or scripts. Own writes are
  // filtered inside watchOpus; the watcher is re-armed once Opus/ exists.
  useEffect(() => {
    if (!vaultPath || status !== "ready" || !rootExists) return;
    let cancelled = false;
    let unwatch = null;
    getOpusApi()
      .then((api) => api.watchOpus(vaultPath, () => reload(), { onAssetsChange: emitAssetsChanged, onActivityChange: () => reload() }))
      .then((fn) => {
        if (cancelled) fn();
        else unwatch = fn;
      })
      .catch((e) => console.error("[MAIA] Failed to watch Opus folder", e));
    return () => {
      cancelled = true;
      if (unwatch) unwatch();
    };
  }, [vaultPath, status, rootExists, reload]);

  // Belt and braces for a dropped fs event, like the notes store.
  useEffect(() => {
    if (!vaultPath || status !== "ready") return;
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [vaultPath, status, reload]);

  // Write what is waiting when the window goes away or loses focus.
  useEffect(() => {
    if (!vaultPath) return;
    const flushNow = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
    window.addEventListener("beforeunload", flushNow);
    window.addEventListener("pagehide", flushNow);
    window.addEventListener("blur", flushNow);
    const unregister = registerCloseFlush({ hasPending, flush });
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      window.removeEventListener("pagehide", flushNow);
      window.removeEventListener("blur", flushNow);
      unregister();
    };
  }, [vaultPath, flush, hasPending]);

  useEffect(() => () => {
    flush();
  }, [flush]);

  // Edits while the first read is running would be replaced by it, so they are refused.
  const setCollection = useCallback((key, updater) => {
    if (statusRef.current === "loading") {
      console.warn(`[MAIA] Ignored a ${key} change: the Opus files are still loading`);
      return;
    }
    setData((prev) => {
      const next = pickNext(updater, prev[key]);
      return next === prev[key] ? prev : { ...prev, [key]: next };
    });
  }, []);
  const setProjects = useCallback((updater) => setCollection("projects", updater), [setCollection]);
  const setTasks = useCallback((updater) => setCollection("tasks", updater), [setCollection]);

  const setActivity = useCallback((updater) => {
    if (statusRef.current === "loading") {
      console.warn("[MAIA] Ignored an activity change: the Opus files are still loading");
      return;
    }
    setActivityState(updater);
  }, [setActivityState]);

  return { data, setProjects, setTasks, activity: activity, setActivity, status, error, warnings, reload, flush, hasPending };
}
