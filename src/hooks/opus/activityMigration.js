// One-time copy of the localStorage activity log (maia.activity) into the
// per-project activity.jsonl files. The localStorage copy is never deleted.
// Idempotent: entries already in a file are matched by content, so a re-run
// (flag not yet set after a crash) adds nothing twice.
import { STORAGE_KEYS } from "../../lib/constants.js";
import { dirtyGroups, entryKey, flattenGroups, groupActivity, sortByAt } from "./opusActivity.js";

export const ACTIVITY_MIGRATED_KEY = "maia.activityMigrated";

const isEntry = (v) => v != null && typeof v === "object" && typeof v.at === "string" && typeof v.kind === "string";

const readLegacy = () => {
  try {
    if (localStorage.getItem(ACTIVITY_MIGRATED_KEY) === "true") return [];
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
};

/**
 * @param loaded the current loadOpus result
 * @returns {Promise<{ loaded: object, status: "skipped" | "done" | "failed" }>}
 */
export const runActivityMigration = async (api, vaultPath, loaded) => {
  const legacy = readLegacy();
  if (legacy.length === 0) return { loaded, status: "skipped" };

  const known = new Set(loaded.projects.map((p) => p.id)); // only projects that have a folder
  const diskGroups = new Map((loaded.activityFiles ?? []).map((g) => [g.projectId, g.entries]));
  const onDisk = flattenGroups(diskGroups);
  const have = new Set(onDisk.map(entryKey));
  const fresh = legacy.filter((e) => !have.has(entryKey(e)));
  if (fresh.length > 0) {
    // Written files hold disk + legacy together, so existing lines are never dropped.
    const all = sortByAt([...onDisk, ...fresh]);
    const targets = new Set(dirtyGroups(all, known, diskGroups).map((g) => g.projectId));
    try {
      for (const [projectId, entries] of groupActivity(all, known)) {
        if (targets.has(projectId)) await api.saveActivity(vaultPath, projectId, entries);
      }
    } catch (e) {
      console.error("[MAIA] Activity migration failed; it will be retried on the next launch", e);
      return { loaded, status: "failed" };
    }
  }
  try {
    localStorage.setItem(ACTIVITY_MIGRATED_KEY, "true");
  } catch { /* storage blocked: the next launch finds nothing new to add and retries the flag */ }
  console.info(`[MAIA] Moved ${fresh.length} activity entries into the vault's Opus folder.`);
  return { loaded: fresh.length > 0 ? await api.loadOpus(vaultPath) : loaded, status: "done" };
};
