// Notes: every .md file in the vault, nested folders included (the app's note format,
// src/lib/noteFile.js). Opus/ and dot folders are never listed, same as the app.
import path from "node:path";
import { z } from "zod";
import { uid, isoNow } from "../../src/lib/ids.js";
import { markdownToNote, noteToMarkdown, noteFilename } from "../../src/lib/noteFile.js";
import { stableId } from "../../src/lib/stableId.js";
import { isSkippedDir, isNoteFile, joinRel, relBase, relDir, validateFolderPath } from "../../src/lib/vaultFolders.js";
import { findProject } from "../store.js";
import { listDir, readText, safeWrite } from "../fsx.js";
import { logActivity } from "../writer.js";
import { handler, snapshotOf, norm } from "./util.js";
import { defined } from "./schemas.js";

// Same walk and exclusions as the app (src/lib/vault.js): dot entries,
// node_modules, and Opus/ + _backups at the vault root are skipped.
const walk = async (vault, folder = "") => {
  const out = [];
  for (const e of await listDir(folder ? path.join(vault, folder) : vault)) {
    const rel = joinRel(folder, e.name);
    if (e.isDirectory) {
      if (!isSkippedDir(e.name, folder === "")) out.push(...(await walk(vault, rel)));
    } else if (e.isFile && isNoteFile(e.name)) out.push(rel);
  }
  return out;
};

const loadNotes = async (vault) => {
  const notes = [];
  for (const rel of (await walk(vault)).sort()) {
    const text = await readText(path.join(vault, rel));
    if (text === null) continue;
    const note = markdownToNote(text, { fallbackId: stableId(rel), fallbackTitle: relBase(rel).replace(/\.md$/i, "") });
    notes.push({ ...note, file: rel, folder: relDir(rel) });
  }
  return notes;
};

const summary = (n) => ({
  id: n.id, title: n.title, folder: n.folder, tags: n.tags, projectIds: n.projectIds, kind: n.kind ?? null,
  status: n.status ?? null, createdAt: n.createdAt, file: n.file,
});

export const registerNotes = (server, vault) => {
  server.registerTool("list_notes", {
    description: "List vault notes in all folders (each has a folder path). query matches title and body.",
    inputSchema: {
      query: z.string().optional(), folder: z.string().optional().describe("Only notes in this folder and its subfolders"),
      project: z.string().optional().describe("Project name or id"),
      tag: z.string().optional(), limit: z.number().int().min(1).max(500).default(50),
    },
  }, handler(async ({ query, folder, project, tag, limit = 50 }) => {
    const projectId = project ? findProject(await snapshotOf(vault), project).item.id : null;
    const hits = (await loadNotes(vault)).filter((n) => {
      if (query && !`${n.title}\n${n.content}`.toLowerCase().includes(norm(query))) return false;
      if (folder && n.folder !== folder && !n.folder.startsWith(`${folder}/`)) return false;
      if (projectId && !n.projectIds.includes(projectId)) return false;
      return !tag || n.tags.some((t) => norm(t) === norm(tag.replace(/^#/, "")));
    });
    return { total: hits.length, notes: hits.slice(0, limit).map(summary) };
  }));

  server.registerTool("read_note", {
    description: "Read one note by id or title.",
    inputSchema: { id: z.string().optional(), title: z.string().optional() },
  }, handler(async ({ id, title }) => {
    if (!id && !title) throw new Error("Give an id or a title.");
    const notes = await loadNotes(vault);
    const byTitle = id ? [] : notes.filter((n) => norm(n.title) === norm(title));
    if (byTitle.length > 1) throw new Error(`${byTitle.length} notes are titled "${title}", read by id: ${byTitle.map((n) => n.id).join(", ")}`);
    const hit = notes.find((n) => id && n.id === id) ?? byTitle[0];
    if (!hit) throw new Error(`No note found for ${id ? `id "${id}"` : `title "${title}"`}.`);
    return { ...summary(hit), content: hit.content };
  }));

  server.registerTool("create_note", {
    description: "Create a new note, in the vault root or in `folder` (created if missing). Never overwrites an existing file.",
    inputSchema: {
      title: z.string().min(1), content: z.string(), folder: z.string().optional().describe('e.g. "Omnis/PROJECTS"; default vault root'), tags: z.array(z.string()).optional(),
      project: z.string().optional(), kind: z.string().optional(), status: z.string().optional(),
    },
  }, handler(async (a) => {
    const snap = await snapshotOf(vault);
    const proj = a.project ? findProject(snap, a.project) : null;
    const note = defined({
      id: uid(), title: a.title.trim(), content: a.content, createdAt: isoNow(),
      tags: a.tags?.map((t) => t.replace(/^#/, "")), projectIds: proj ? [proj.item.id] : undefined,
      kind: a.kind, status: a.status,
    });
    const folder = validateFolderPath(a.folder ?? "", { allowRoot: true });
    const taken = new Set((await listDir(folder ? path.join(vault, folder) : vault)).map((e) => e.name.toLowerCase()));
    const name = joinRel(folder, noteFilename(note, taken));
    await safeWrite(path.join(vault, name), noteToMarkdown(note), null);
    const warning = await logActivity(snap, {
      projectId: proj ? proj.item.id : null, kind: "created", collection: "notes", itemId: note.id, title: note.title,
    });
    return { id: note.id, folder, file: name, ...(warning ? { warning } : {}) };
  }));
};
