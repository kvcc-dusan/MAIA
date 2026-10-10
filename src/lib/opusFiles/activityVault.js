// @maia:opusFiles - reads and writes the per-project activity.jsonl files.
// Tracked like every other file (kind "activity", id = project id or "_inbox"),
// so guardedWrite's conflict check and deleteProject's cleanup apply unchanged.
import { VaultConflictError } from "../vault.js";
import { parseActivity, serializeActivity } from "./activityFile.js";
import {
  INBOX_DIR, ACTIVITY_FILE, joinPath, opusRoot, loadFs, state, keyOf, statMtime, trackInto,
  guardedWrite, track,
} from "./opusFs.js";

const trackId = (projectId) => projectId ?? INBOX_DIR;

/**
 * Loader side. Returns { projectId, entries } or null when there is no file.
 * Bad lines become warnings. `fresh` is the private state a load builds.
 */
export const readActivity = async (fs, dir, projectId, { warnings, fresh }) => {
  const path = joinPath(dir, ACTIVITY_FILE);
  if (!(await fs.exists(path))) return null;
  let text;
  try {
    text = await fs.readTextFile(path);
  } catch (e) {
    warnings.push({ path, message: `Could not read file: ${e?.message ?? e}` });
    return null;
  }
  const { entries, badLines } = parseActivity(text);
  badLines.forEach((b) => warnings.push({ path, message: `Line ${b.line} skipped, not a valid activity entry (kept in the file)` }));
  trackInto(fresh, "activity", trackId(projectId), projectId, { path, text, mtimeMs: await statMtime(fs, path) });
  return { projectId, entries };
};

/**
 * Writes the full entry list of one file (null projectId = _inbox).
 * Returns { skipped: true } when the project has no folder yet (its save is
 * still pending), so the caller keeps the change and retries later.
 * A file changed on disk since it was read throws VaultConflictError; the
 * caller reloads and merges instead of keeping a conflict copy.
 */
export const saveActivity = async (vaultPath, projectId, entries) => {
  const fs = await loadFs();
  const entry = state.tracked.get(keyOf("activity", trackId(projectId)));
  if (!entry && entries.length === 0) return { skipped: false };

  let path = entry?.path;
  if (!entry) {
    const folder = projectId == null ? INBOX_DIR : state.projectDirs.get(projectId);
    if (!folder) return { skipped: true };
    path = joinPath(opusRoot(vaultPath), folder, ACTIVITY_FILE);
    if (await fs.exists(path)) {
      // Created outside MAIA after our last read: merge it in via a reload.
      throw new VaultConflictError(trackId(projectId), { diskText: await fs.readTextFile(path), attemptedText: "", filename: path });
    }
  }
  const badLines = entry ? parseActivity(entry.text).badLines : [];
  const text = serializeActivity(entries, badLines);
  const written = await guardedWrite(fs, { entry, path, text, kind: "activity", id: trackId(projectId) });
  track("activity", trackId(projectId), projectId, written);
  return { skipped: false };
};
