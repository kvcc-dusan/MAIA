import { useCallback, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { isoNow } from "../lib/ids.js";
import { appendActivity, appendActivityBatch, makeActivityEntry } from "../features/Opus/lib/activityLog.js";

/**
 * Owns the activity log. logActivity is fire-and-forget: the log is best
 * effort and must never break the edit that triggered it, but a failure
 * is still reported to the console.
 *
 * `fileActivity` ({ activity, setActivity } from useOpusStore) is set in file
 * mode: the log then lives in activity.jsonl files and `maia.activity` is left
 * untouched as the pre-migration copy. The cap is per file there (applied when
 * writing), so the in-memory list is not trimmed here.
 */
export const useActivityLog = (fileActivity = null) => {
  const [localActivity, setLocalActivity] = useLocalStorage(STORAGE_KEYS.ACTIVITY, []);
  const isFiles = fileActivity != null;
  const rawActivity = isFiles ? fileActivity.activity : localActivity;
  const setActivity = isFiles ? fileActivity.setActivity : setLocalActivity;
  const cap = isFiles ? Infinity : undefined;
  // A hand-edited or corrupt store must not hand consumers a non-array.
  const activity = useMemo(() => (Array.isArray(rawActivity) ? rawActivity : []), [rawActivity]);

  const logActivity = useCallback((entry) => {
    try {
      // Built outside the updater so a StrictMode double-invoke stamps one time.
      const full = makeActivityEntry(entry, isoNow());
      setActivity((prev) => {
        try {
          return appendActivity(prev, full, cap);
        } catch (error) {
          console.warn("[MAIA] Could not append to the activity log", error);
          return prev;
        }
      });
    } catch (error) {
      console.warn("[MAIA] Could not log activity", error);
    }
  }, [setActivity, cap]);

  // Sample data and similar bulk adds; entries already carry their timestamps.
  const addActivity = useCallback(
    (entries) => setActivity((prev) => appendActivityBatch(prev, entries, cap)),
    [setActivity, cap],
  );

  return { activity, setActivity, logActivity, addActivity };
};
