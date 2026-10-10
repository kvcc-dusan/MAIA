import { useState, useRef, useCallback } from "react";
import { VaultConflictError } from "../../lib/vault.js";
import { dirtyGroups, flattenGroups, mergeActivity, sameEntries } from "./opusActivity.js";

const EMPTY = [];

const pickNext = (updater, current) => {
  const next = typeof updater === "function" ? updater(current) : updater;
  return Array.isArray(next) ? next : current;
};

/**
 * File-backed activity log for useOpusFiles. The flat list in `activityRef` is
 * the source of truth (updated synchronously so a log right before a flush is
 * seen); `diskRef` is what the files held when last read or written, so what is
 * dirty is always "memory minus disk", with no separate queue to lose.
 */
export function useActivityFiles() {
  const [activity, setState] = useState(EMPTY);
  const activityRef = useRef(EMPTY);
  const diskRef = useRef(new Map()); // projectId|null -> entries

  const setActivity = useCallback((updater) => {
    const next = pickNext(updater, activityRef.current);
    if (next === activityRef.current) return;
    activityRef.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => {
    activityRef.current = EMPTY;
    diskRef.current = new Map();
    setState(EMPTY);
  }, []);

  /** Merge freshly read files with whatever changed in memory since the last read. */
  const applyLoaded = useCallback((activityFiles) => {
    const disk = new Map((activityFiles ?? []).map((g) => [g.projectId, g.entries]));
    const merged = mergeActivity(flattenGroups(diskRef.current), activityRef.current, flattenGroups(disk));
    diskRef.current = disk;
    if (sameEntries(merged, activityRef.current)) return;
    activityRef.current = merged;
    setState(merged);
  }, []);

  const isDirty = useCallback(
    (knownProjectIds) => dirtyGroups(activityRef.current, knownProjectIds, diskRef.current).length > 0,
    [],
  );

  /** @returns {Promise<{ failed: number, needsReload: boolean }>} */
  const write = useCallback(async (api, vaultPath, knownProjectIds) => {
    let failed = 0;
    let needsReload = false;
    for (const { projectId, entries } of dirtyGroups(activityRef.current, knownProjectIds, diskRef.current)) {
      try {
        const result = await api.saveActivity(vaultPath, projectId, entries);
        if (result?.skipped) continue; // project folder not written yet: stays dirty
        const next = new Map(diskRef.current);
        if (entries.length === 0) next.delete(projectId);
        else next.set(projectId, entries);
        diskRef.current = next;
      } catch (e) {
        if (e instanceof VaultConflictError) {
          needsReload = true;
        } else {
          console.error("[MAIA] Activity write failed, will retry on next change", e);
          failed += 1;
        }
      }
    }
    return { failed, needsReload };
  }, []);

  return { activity, setActivity, reset, applyLoaded, isDirty, write };
}
