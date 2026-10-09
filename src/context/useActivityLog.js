import { useCallback, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { isoNow } from "../lib/ids.js";
import { appendActivity, makeActivityEntry } from "../features/Opus/lib/activityLog.js";

/**
 * Owns the `maia.activity` store. logActivity is fire-and-forget: the log is
 * best effort and must never break the edit that triggered it, but a failure
 * is still reported to the console.
 */
export const useActivityLog = () => {
  const [rawActivity, setActivity] = useLocalStorage(STORAGE_KEYS.ACTIVITY, []);
  // A hand-edited or corrupt store must not hand consumers a non-array.
  const activity = useMemo(() => (Array.isArray(rawActivity) ? rawActivity : []), [rawActivity]);

  const logActivity = useCallback((entry) => {
    try {
      // Built outside the updater so a StrictMode double-invoke stamps one time.
      const full = makeActivityEntry(entry, isoNow());
      setActivity((prev) => {
        try {
          return appendActivity(prev, full);
        } catch (error) {
          console.warn("[MAIA] Could not append to the activity log", error);
          return prev;
        }
      });
    } catch (error) {
      console.warn("[MAIA] Could not log activity", error);
    }
  }, [setActivity]);

  return { activity, setActivity, logActivity };
};
