// Safe delete: items are MOVED to Opus/_trash/<YYYY-MM-DD>/<ProjectFolder|_inbox>/<kindDir>/<file>
// and can be restored. Nothing is ever deleted for good. Plain visible names only (no dot paths).
import path from "node:path";
import { z } from "zod";
import { short, medium } from "./schemas.js";
import { isoNow } from "../../src/lib/ids.js";
import { uniqueName } from "../../src/lib/opusFiles/names.js";
import { EMPTY_CONTEXT } from "../../src/lib/opusFiles/fileCodec.js";
import { findRecord, projectRecordOf, CODECS } from "../store.js";
import {
  TRASH_DIR, INBOX_DIR, PROJECT_FILE, KIND_DIRS, exists, listDir, readText, moveGuarded,
} from "../fsx.js";
import { logActivity } from "../writer.js";
import { handler, snapshotOf, rel } from "./util.js";

const COLLECTIONS = { task: "tasks", decision: "decisions", question: "questions" };
const KIND_OF_DIR = Object.fromEntries(Object.entries(KIND_DIRS).map(([kind, dir]) => [dir, kind]));
const titleOf = (kind, item) => (kind === "question" ? item.question : item.title);

const trashItem = async (vault, kind, id) => {
  const snap = await snapshotOf(vault);
  const rec = findRecord(snap, kind, id);
  const proj = projectRecordOf(snap, rec.projectId);
  const folder = proj ? proj.folder : INBOX_DIR;
  const date = isoNow().slice(0, 10);
  const dir = path.join(snap.root, TRASH_DIR, date, folder, KIND_DIRS[kind]);
  const original = path.basename(rec.path);
  const taken = (await listDir(dir)).map((e) => e.name);
  const target = path.join(dir, uniqueName(original.replace(/\.md$/i, ""), taken, ".md"));
  await moveGuarded(rec.path, target, rec.text);
  const warning = await logActivity(snap, {
    projectId: rec.projectId, kind: "deleted", collection: COLLECTIONS[kind], itemId: id, title: titleOf(kind, rec.item),
  });
  return { id, trashed: true, title: titleOf(kind, rec.item), trashPath: rel(snap, target), ...(warning ? { warning } : {}) };
};

/** Opus-relative trash path -> its parts, or a readable error. */
const parseTrashPath = (input) => {
  const parts = String(input).split(/[\\/]+/).filter(Boolean);
  const [root, date, folder, kindDir, file, ...extra] = parts;
  const valid = root === TRASH_DIR && file && extra.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && KIND_OF_DIR[kindDir] && /\.md$/i.test(file) && ![date, folder, file].some((p) => p === "." || p === ".." || p.startsWith("."));
  if (!valid) throw new Error(`"${input}" is not a trash path. Use a trashPath from list_trash (_trash/<date>/<project>/<kind>/<file>.md).`);
  return { date, folder, kindDir, kind: KIND_OF_DIR[kindDir], file };
};

const listTrashItems = async (root) => {
  const out = [];
  const base = path.join(root, TRASH_DIR);
  for (const d of (await listDir(base)).filter((e) => e.isDirectory)) {
    for (const f of (await listDir(path.join(base, d.name))).filter((e) => e.isDirectory)) {
      for (const [kindDir, kind] of Object.entries(KIND_OF_DIR)) {
        const dir = path.join(base, d.name, f.name, kindDir);
        for (const file of (await listDir(dir)).filter((e) => e.isFile && /\.md$/i.test(e.name))) {
          const text = await readText(path.join(dir, file.name)).catch(() => null);
          const parsed = text === null ? null : CODECS[kind].fromFile(text, {
            fallbackId: null, fallbackTitle: file.name.replace(/\.md$/i, ""), projectContext: EMPTY_CONTEXT,
          });
          const item = parsed?.ok ? parsed.item : null;
          out.push({
            kind, id: item?.id ?? null, title: item ? titleOf(kind, item) : file.name.replace(/\.md$/i, ""),
            project: f.name === INBOX_DIR ? null : f.name, deleted: d.name,
            trashPath: path.join(TRASH_DIR, d.name, f.name, kindDir, file.name),
            ...(item ? {} : { unreadable: true }),
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.deleted.localeCompare(a.deleted) || a.title.localeCompare(b.title));
};

const restore = async (vault, input) => {
  const snap = await snapshotOf(vault);
  const { folder, kindDir, kind, file } = parseTrashPath(input);
  const src = path.join(snap.root, TRASH_DIR, ...input.split(/[\\/]+/).filter(Boolean).slice(1));
  const text = await readText(src);
  if (text === null) throw new Error(`Nothing in the trash at "${input}".`);

  const isInbox = folder === INBOX_DIR;
  if (isInbox && kind !== "task") throw new Error("Only tasks live in the inbox; this item cannot be restored there.");
  const proj = isInbox ? null : snap.projects.find((p) => p.folder === folder);
  if (!isInbox && !proj) {
    throw new Error(`Project folder "${folder}" no longer exists (or has no ${PROJECT_FILE}), so this ${kind} cannot be restored. Recreate the project or move the file by hand.`);
  }
  const parsed = CODECS[kind].fromFile(text, { fallbackId: null, fallbackTitle: file.replace(/\.md$/i, ""), projectContext: proj?.ctx ?? EMPTY_CONTEXT });
  if (!parsed.ok) throw new Error(`The trashed file does not parse (${parsed.error}), so it was not restored.`);
  const pool = kind === "task" ? [...snap.projects.flatMap((p) => p.tasks), ...snap.inboxTasks]
    : snap.projects.flatMap((p) => (kind === "decision" ? p.decisions : p.questions));
  if (parsed.item.id && pool.some((r) => r.item.id === parsed.item.id)) {
    throw new Error(`A ${kind} with id "${parsed.item.id}" already exists, so this one was not restored.`);
  }

  const dest = path.join(proj ? proj.dir : path.join(snap.root, INBOX_DIR), kindDir, file);
  if (await exists(dest)) throw new Error(`"${file}" already exists in ${rel(snap, path.dirname(dest))}. Rename or remove it first; nothing was restored.`);
  await moveGuarded(src, dest, text);
  const warning = await logActivity(snap, {
    projectId: proj ? proj.item.id : null, kind: "created", collection: COLLECTIONS[kind], itemId: parsed.item.id,
    title: titleOf(kind, parsed.item),
  });
  return { restored: true, kind, id: parsed.item.id, file: rel(snap, dest), ...(warning ? { warning } : {}) };
};

export const registerTrash = (server, vault) => {
  const del = (kind, what) => server.registerTool(`delete_${kind}`, {
    description: `Delete a ${kind} by id. It is moved to Opus/_trash (recoverable with restore_from_trash), never erased. Use when the user asks to remove ${what}.`,
    inputSchema: { id: short },
  }, handler(({ id }) => trashItem(vault, kind, id)));
  del("task", "a task");
  del("decision", "a decision");
  del("question", "a question");

  server.registerTool("list_trash", {
    description: "List deleted tasks, decisions and questions in Opus/_trash (newest first) with original project, kind, title, deleted date and trashPath. Use before restore_from_trash.",
    inputSchema: { project: short.optional().describe("Original project folder name; 'inbox' for inbox tasks"), limit: z.number().int().min(1).max(500).default(50) },
  }, handler(async ({ project, limit = 50 }) => {
    const wanted = project?.trim().toLowerCase();
    const items = (await listTrashItems(path.join(vault, "Opus"))).filter((i) => {
      if (!wanted) return true;
      return wanted === "inbox" ? i.project === null : i.project?.toLowerCase() === wanted;
    });
    return { total: items.length, items: items.slice(0, limit) };
  }));

  server.registerTool("restore_from_trash", {
    description: "Move a trashed item back to its original folder. path = trashPath from list_trash. Refuses if a file with that name exists there, if the project folder is gone, or if the file no longer parses.",
    inputSchema: { path: medium },
  }, handler(({ path: p }) => restore(vault, p)));
};
