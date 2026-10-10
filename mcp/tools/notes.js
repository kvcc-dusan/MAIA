// Notes: top-level vault .md files (the app's note format, src/lib/noteFile.js).
// The Opus/ folder is never listed here, same as the app (top level only).
import path from "node:path";
import { z } from "zod";
import { uid, isoNow } from "../../src/lib/ids.js";
import { markdownToNote, noteToMarkdown, noteFilename } from "../../src/lib/noteFile.js";
import { findProject } from "../store.js";
import { listDir, readText, safeWrite } from "../fsx.js";
import { logActivity } from "../writer.js";
import { handler, snapshotOf, norm } from "./util.js";
import { defined } from "./schemas.js";

const loadNotes = async (vault) => {
  const files = (await listDir(vault)).filter((e) => e.isFile && /\.md$/i.test(e.name));
  const notes = [];
  for (const f of files) {
    const file = path.join(vault, f.name);
    const text = await readText(file);
    if (text === null) continue;
    notes.push({ ...markdownToNote(text, { fallbackId: `file:${f.name}`, fallbackTitle: f.name.replace(/\.md$/i, "") }), file: f.name });
  }
  return notes;
};

const summary = (n) => ({
  id: n.id, title: n.title, tags: n.tags, projectIds: n.projectIds, kind: n.kind ?? null,
  status: n.status ?? null, createdAt: n.createdAt, file: n.file,
});

export const registerNotes = (server, vault) => {
  server.registerTool("list_notes", {
    description: "List top-level vault notes. query matches title and body.",
    inputSchema: {
      query: z.string().optional(), project: z.string().optional().describe("Project name or id"),
      tag: z.string().optional(), limit: z.number().int().min(1).max(500).default(50),
    },
  }, handler(async ({ query, project, tag, limit = 50 }) => {
    const projectId = project ? findProject(await snapshotOf(vault), project).item.id : null;
    const hits = (await loadNotes(vault)).filter((n) => {
      if (query && !`${n.title}\n${n.content}`.toLowerCase().includes(norm(query))) return false;
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
    description: "Create a new top-level note. Never overwrites an existing file.",
    inputSchema: {
      title: z.string().min(1), content: z.string(), tags: z.array(z.string()).optional(),
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
    const taken = new Set((await listDir(vault)).map((e) => e.name.toLowerCase()));
    const name = noteFilename(note, taken);
    await safeWrite(path.join(vault, name), noteToMarkdown(note), null);
    const warning = await logActivity(snap, {
      projectId: proj ? proj.item.id : null, kind: "created", collection: "notes", itemId: note.id, title: note.title,
    });
    return { id: note.id, file: name, ...(warning ? { warning } : {}) };
  }));
};
