// All vault writes go through here: file naming, atomic guarded writes and
// the activity entry that every write appends.
import path from "node:path";
import { makeActivityEntry } from "../src/features/Opus/lib/activityLog.js";
import { parseActivity, serializeActivity } from "../src/lib/opusFiles/activityFile.js";
import { projectFolderName, taskFileName, decisionFileName, questionFileName } from "../src/lib/opusFiles/names.js";
import { EMPTY_CONTEXT } from "../src/lib/opusFiles/fileCodec.js";
import { isoNow } from "../src/lib/ids.js";
import {
  INBOX_DIR, PROJECT_FILE, ACTIVITY_FILE, KIND_DIRS, ConflictError, listDir, readText, safeWrite, removeIfUnchanged,
} from "./fsx.js";
import { CODECS } from "./store.js";

export const ACTOR = "claude-mcp";
const NAMERS = { task: taskFileName, decision: decisionFileName, question: questionFileName };

const takenNames = async (dir) => (await listDir(dir)).map((e) => e.name);

/** Appends one entry to the project's (or _inbox's) activity.jsonl. Returns a warning string or null. */
export const logActivity = async (snap, { projectId, kind, collection, itemId, title, from, to }) => {
  try {
    const project = projectId == null ? null : snap.projects.find((p) => p.item.id === projectId);
    const dir = project ? project.dir : path.join(snap.root, INBOX_DIR);
    const file = path.join(dir, ACTIVITY_FILE);
    const text = await readText(file);
    const { entries, badLines } = parseActivity(text ?? "");
    // `actor` is an extra field: the app only needs at/kind, and merges entries by identity.
    const entry = { ...makeActivityEntry({ kind, collection, itemId, projectId: project ? projectId : null, title, from, to }, isoNow()), actor: ACTOR };
    await safeWrite(file, serializeActivity([...entries, entry], badLines), text);
    return null;
  } catch (e) {
    return `Activity entry not written: ${e?.message ?? e}`;
  }
};

/** New decision / question / task file in a project (or the inbox when projectRec is null). */
export const createItemFile = async (snap, kind, item, projectRec) => {
  const dir = projectRec ? path.join(projectRec.dir, KIND_DIRS[kind]) : path.join(snap.root, INBOX_DIR, KIND_DIRS[kind]);
  const file = path.join(dir, NAMERS[kind](item, await takenNames(dir)));
  const text = CODECS[kind].toFile(item, projectRec?.ctx ?? EMPTY_CONTEXT);
  await safeWrite(file, text, null);
  return file;
};

/** Rewrites an existing item file from its last-read text; untouched content stays byte-identical. */
export const updateItemFile = async (rec, nextItem, ctx) => {
  const text = CODECS[rec.kind].toFile(nextItem, ctx ?? EMPTY_CONTEXT, { source: rec.text });
  return safeWrite(rec.path, text, rec.text);
};

/** Moves a task file: new file first, old one removed only if it is still unchanged. */
export const moveTaskFile = async (snap, rec, nextTask, toProjectRec) => {
  const dir = toProjectRec ? path.join(toProjectRec.dir, KIND_DIRS.task) : path.join(snap.root, INBOX_DIR, KIND_DIRS.task);
  const file = path.join(dir, taskFileName(nextTask, await takenNames(dir)));
  const text = CODECS.task.toFile(nextTask, toProjectRec?.ctx ?? EMPTY_CONTEXT, { source: rec.text });
  const current = await readText(rec.path);
  if (current !== rec.text) throw new ConflictError(rec.path, "File changed on disk since it was read");
  await safeWrite(file, text, null);
  await removeIfUnchanged(rec.path, rec.text);
  return file;
};

export const createProjectFile = async (snap, project) => {
  const folder = projectFolderName(project, await takenNames(snap.root));
  const dir = path.join(snap.root, folder);
  const file = path.join(dir, PROJECT_FILE);
  await safeWrite(file, CODECS.project.toFile(project, undefined), null);
  return { dir, file, folder };
};
