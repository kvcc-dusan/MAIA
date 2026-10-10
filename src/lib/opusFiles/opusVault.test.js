// @vitest-environment jsdom
// In-memory fs behind the Tauri plugin so the adapter runs without a disk.
import { describe, it, expect, beforeEach, vi } from "vitest";

let files;
let dirs;
let clock;
let watchCb;
const mtimes = new Map();

const parent = (p) => p.slice(0, p.lastIndexOf("/"));
const touch = (p) => mtimes.set(p, ++clock);
const addDirs = (p) => {
  for (let d = parent(p); d.length > "/mock".length; d = parent(d)) dirs.add(d);
};

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(async (p) => p in files || dirs.has(p) || Object.keys(files).some((f) => f.startsWith(`${p}/`))),
  readTextFile: vi.fn(async (p) => {
    if (!(p in files)) throw new Error(`ENOENT ${p}`);
    return files[p];
  }),
  writeTextFile: vi.fn(async (p, text) => {
    addDirs(p);
    files[p] = text;
    touch(p);
  }),
  mkdir: vi.fn(async (p) => {
    dirs.add(p);
    addDirs(p);
  }),
  remove: vi.fn(async (p) => {
    delete files[p];
    dirs.delete(p);
  }),
  stat: vi.fn(async (p) => ({ mtime: new Date(mtimes.get(p) ?? 0) })),
  readDir: vi.fn(async (dir) => {
    const out = new Map();
    for (const p of Object.keys(files)) {
      if (p.startsWith(`${dir}/`)) {
        const rest = p.slice(dir.length + 1);
        const [first, ...more] = rest.split("/");
        out.set(first, more.length > 0 ? { name: first, isDirectory: true, isFile: false } : { name: first, isDirectory: false, isFile: true });
      }
    }
    for (const d of dirs) {
      if (parent(d) === dir) out.set(d.slice(dir.length + 1), { name: d.slice(dir.length + 1), isDirectory: true, isFile: false });
    }
    return [...out.values()];
  }),
  watchImmediate: vi.fn(async (_p, cb) => {
    watchCb = cb;
    return () => {};
  }),
}));

const VAULT = "/mock/vault";
const OPUS = `${VAULT}/Opus`;
const load = () => import("./index.js");

const PROJECT = "---\nid: p1\nname: Atlas\nworkstreams:\n  - id: w1\n    name: Design\n---\nDesc\n";
const TASK = "---\nid: t1\ntitle: First\nworkstream: Design\ncreatedAt: 2026-10-01T00:00:00.000Z\n---\nBody\n";

const seed = () => {
  files[`${OPUS}/Atlas/project.md`] = PROJECT;
  files[`${OPUS}/Atlas/tasks/First.md`] = TASK;
  files[`${OPUS}/Atlas/decisions/Pick.md`] = "---\nid: d1\ntitle: Pick\ndate: 2026-10-02\n---\nWhy\n";
  files[`${OPUS}/Atlas/questions/Which.md`] = "---\nid: q1\nquestion: Which?\n---\n";
  files[`${OPUS}/_inbox/tasks/Loose.md`] = "---\nid: t2\ntitle: Loose\n---\n";
};

describe("opus vault adapter", () => {
  beforeEach(async () => {
    files = {};
    dirs = new Set([VAULT]);
    clock = 0;
    mtimes.clear();
    watchCb = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("reports an absent Opus folder without creating anything", async () => {
    const { loadOpus } = await load();
    expect(await loadOpus(VAULT)).toEqual({ exists: false, projects: [], tasks: [], warnings: [] });
    expect(dirs.has(OPUS)).toBe(false);
  });

  it("loads projects with embedded collections, flat tasks and the inbox", async () => {
    seed();
    const { loadOpus, getOpusMeta } = await load();
    const { exists, projects, tasks, warnings } = await loadOpus(VAULT);
    expect(exists).toBe(true);
    expect(warnings).toEqual([]);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ id: "p1", name: "Atlas", assets: [] });
    expect(projects[0].decisions.map((d) => d.id)).toEqual(["d1"]);
    expect(projects[0].questions.map((q) => q.id)).toEqual(["q1"]);
    expect(tasks.find((t) => t.id === "t1")).toMatchObject({ projectId: "p1", workstreamId: "w1" });
    expect(tasks.find((t) => t.id === "t2").projectId).toBeNull();
    expect(getOpusMeta("task", "t1")).toEqual({ path: `${OPUS}/Atlas/tasks/First.md`, mtimeMs: expect.any(Number) });
  });

  it("skips broken files with a warning and never writes over them", async () => {
    seed();
    files[`${OPUS}/Atlas/tasks/Broken.md`] = "---\nid: [oops\n---\nmy precious body";
    files[`${OPUS}/NoProject/tasks/x.md`] = "---\nid: zz\n---\n";
    files[`${OPUS}/Bad/project.md`] = "---\nname: [x\n---\n";
    const { loadOpus, saveTask } = await load();
    const { tasks, projects, warnings } = await loadOpus(VAULT);
    expect(tasks.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(projects).toHaveLength(1);
    expect(warnings.map((w) => w.path)).toEqual(expect.arrayContaining([
      `${OPUS}/Atlas/tasks/Broken.md`, `${OPUS}/NoProject`, `${OPUS}/Bad/project.md`,
    ]));
    await saveTask(VAULT, { id: "new", title: "Broken", projectId: "p1" });
    expect(files[`${OPUS}/Atlas/tasks/Broken.md`]).toBe("---\nid: [oops\n---\nmy precious body");
    expect(files[`${OPUS}/Atlas/tasks/Broken 2.md`]).toContain("id: new");
  });

  it("keeps both items when two files share an id", async () => {
    seed();
    files[`${OPUS}/Atlas/tasks/Copy.md`] = TASK;
    const { loadOpus } = await load();
    const { tasks, warnings } = await loadOpus(VAULT);
    expect(tasks.filter((t) => t.projectId === "p1")).toHaveLength(2);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(3);
    expect(warnings.some((w) => /Duplicate/.test(w.message))).toBe(true);
  });

  it("gives files without an id the same id on every load", async () => {
    seed();
    files[`${OPUS}/Atlas/tasks/Hand written.md`] = "no frontmatter at all";
    const { loadOpus } = await load();
    const a = (await loadOpus(VAULT)).tasks.find((t) => t.title === "Hand written");
    const b = (await loadOpus(VAULT)).tasks.find((t) => t.title === "Hand written");
    expect(a.id).toBe(b.id);
  });

  it("does not rewrite files that were not changed", async () => {
    seed();
    const fs = await import("@tauri-apps/plugin-fs");
    const { loadOpus, saveTask, saveProject } = await load();
    const { tasks, projects } = await loadOpus(VAULT);
    await saveTask(VAULT, tasks.find((t) => t.id === "t1"));
    await saveProject(VAULT, projects[0]);
    expect(fs.writeTextFile).not.toHaveBeenCalled();
  });

  it("creates a project folder and files for new items, with collision-safe names", async () => {
    const { loadOpus, saveProject, saveTask, saveDecision, saveQuestion } = await load();
    await loadOpus(VAULT);
    await saveProject(VAULT, { id: "p1", name: "Atlas", status: "Active", description: "D", workstreams: [], milestones: [] });
    await saveProject(VAULT, { id: "p2", name: "atlas", status: "Active", description: "", workstreams: [], milestones: [] });
    expect(files[`${OPUS}/Atlas/project.md`]).toContain("id: p1");
    expect(files[`${OPUS}/atlas 2/project.md`]).toContain("id: p2");
    await saveTask(VAULT, { id: "t1", title: "Do it", projectId: "p1", status: "todo", desc: "x" });
    await saveTask(VAULT, { id: "t2", title: "do it", projectId: "p1", status: "todo" });
    await saveTask(VAULT, { id: "t3", title: "Inbox thing", projectId: null });
    await saveDecision(VAULT, "p1", { id: "d1", title: "Choose", date: "2026-10-01" });
    await saveQuestion(VAULT, "p1", { id: "q1", question: "Why though?" });
    expect(Object.keys(files).sort()).toEqual([
      `${OPUS}/Atlas/decisions/Choose.md`,
      `${OPUS}/Atlas/project.md`,
      `${OPUS}/Atlas/questions/Why though.md`,
      `${OPUS}/Atlas/tasks/Do it.md`,
      `${OPUS}/Atlas/tasks/do it 2.md`,
      `${OPUS}/_inbox/tasks/Inbox thing.md`,
      `${OPUS}/atlas 2/project.md`,
    ]);
  });

  it("refuses to save a task for a project that has no folder yet", async () => {
    const { loadOpus, saveTask } = await load();
    await loadOpus(VAULT);
    await expect(saveTask(VAULT, { id: "t", title: "x", projectId: "ghost" })).rejects.toThrow(/save the project first/);
  });

  it("keeps the file name when a title changes and only touches changed keys", async () => {
    seed();
    const { loadOpus, saveTask } = await load();
    const { tasks } = await loadOpus(VAULT);
    await saveTask(VAULT, { ...tasks.find((t) => t.id === "t1"), title: "Renamed", status: "doing" });
    const text = files[`${OPUS}/Atlas/tasks/First.md`];
    expect(text).toContain("title: Renamed");
    expect(text).toContain("status: doing");
    expect(text).toContain("workstream: Design");
    expect(Object.keys(files).filter((p) => p.includes("tasks/"))).toHaveLength(2);
  });

  it("throws VaultConflictError and writes nothing when the file changed on disk", async () => {
    seed();
    const { loadOpus, saveTask } = await load();
    const { VaultConflictError } = await import("../vault.js");
    const { tasks } = await loadOpus(VAULT);
    const edited = "---\nid: t1\ntitle: First\n---\nEdited in Obsidian\n";
    files[`${OPUS}/Atlas/tasks/First.md`] = edited;
    const err = await saveTask(VAULT, { ...tasks.find((t) => t.id === "t1"), status: "done" }).catch((e) => e);
    expect(err).toBeInstanceOf(VaultConflictError);
    expect(err.diskText).toBe(edited);
    expect(err.attemptedText).toContain("status: done");
    expect(files[`${OPUS}/Atlas/tasks/First.md`]).toBe(edited);
  });

  it("moves a task between projects and to the inbox, writing before removing", async () => {
    seed();
    files[`${OPUS}/Beta/project.md`] = "---\nid: p2\nname: Beta\n---\n";
    const { loadOpus, saveTask, moveTask, getOpusMeta } = await load();
    const { tasks } = await loadOpus(VAULT);
    const task = tasks.find((t) => t.id === "t1");
    await saveTask(VAULT, { ...task, projectId: "p2" });
    expect(`${OPUS}/Atlas/tasks/First.md` in files).toBe(false);
    expect(files[`${OPUS}/Beta/tasks/First.md`]).toContain("id: t1");
    await moveTask(VAULT, { ...task, projectId: null });
    expect(files[`${OPUS}/_inbox/tasks/First.md`]).toContain("id: t1");
    expect(`${OPUS}/Beta/tasks/First.md` in files).toBe(false);
    expect(getOpusMeta("task", "t1").path).toBe(`${OPUS}/_inbox/tasks/First.md`);
    const reloaded = (await loadOpus(VAULT)).tasks.find((t) => t.id === "t1");
    expect(reloaded.projectId).toBeNull();
    expect(reloaded.desc).toBe("Body");
  });

  it("refuses to move a task whose file changed on disk", async () => {
    seed();
    const { loadOpus, moveTask } = await load();
    const { tasks } = await loadOpus(VAULT);
    files[`${OPUS}/Atlas/tasks/First.md`] = "changed";
    await expect(moveTask(VAULT, { ...tasks.find((t) => t.id === "t1"), projectId: null })).rejects.toThrow(/changed on disk/);
    expect(files[`${OPUS}/Atlas/tasks/First.md`]).toBe("changed");
  });

  it("rewrites name references in task files when a workstream is renamed", async () => {
    seed();
    const { loadOpus, saveProject } = await load();
    const { projects } = await loadOpus(VAULT);
    const renamed = { ...projects[0], workstreams: [{ ...projects[0].workstreams[0], name: "Product design" }] };
    const { warnings } = await saveProject(VAULT, renamed);
    expect(warnings).toEqual([]);
    expect(files[`${OPUS}/Atlas/tasks/First.md`]).toContain("workstream: Product design");
    const { tasks } = await loadOpus(VAULT);
    expect(tasks.find((t) => t.id === "t1").workstreamId).toBe("w1");
  });

  it("deletes a single item and refuses when it was edited elsewhere", async () => {
    seed();
    const { loadOpus, deleteItem } = await load();
    const { VaultConflictError } = await import("../vault.js");
    await loadOpus(VAULT);
    await deleteItem(VAULT, "decision", "d1");
    expect(`${OPUS}/Atlas/decisions/Pick.md` in files).toBe(false);
    files[`${OPUS}/Atlas/tasks/First.md`] = "edited elsewhere";
    await expect(deleteItem(VAULT, "task", "t1")).rejects.toBeInstanceOf(VaultConflictError);
    expect(files[`${OPUS}/Atlas/tasks/First.md`]).toBe("edited elsewhere");
  });

  it("deletes a project's tracked files and its empty folder, but keeps foreign files", async () => {
    seed();
    files[`${OPUS}/Atlas/notes.txt`] = "mine";
    const { loadOpus, deleteItem } = await load();
    await loadOpus(VAULT);
    await deleteItem(VAULT, "project", "p1");
    expect(Object.keys(files).filter((p) => p.startsWith(`${OPUS}/Atlas/`))).toEqual([`${OPUS}/Atlas/notes.txt`]);
    expect(files[`${OPUS}/_inbox/tasks/Loose.md`]).toBeDefined();
  });

  it("skips edited files when deleting a project", async () => {
    seed();
    const { loadOpus, deleteItem } = await load();
    await loadOpus(VAULT);
    files[`${OPUS}/Atlas/tasks/First.md`] = "edited";
    const { skipped } = await deleteItem(VAULT, "project", "p1");
    expect(skipped).toEqual([`${OPUS}/Atlas/tasks/First.md`]);
    expect(files[`${OPUS}/Atlas/tasks/First.md`]).toBe("edited");
  });

  it("watchOpus reports external changes and drops echoes of its own writes", async () => {
    seed();
    vi.useFakeTimers();
    const { loadOpus, saveTask, watchOpus } = await load();
    const { tasks } = await loadOpus(VAULT);
    const onChange = vi.fn();
    await watchOpus(VAULT, onChange, { debounceMs: 10 });
    const path = `${OPUS}/Atlas/tasks/First.md`;

    await saveTask(VAULT, { ...tasks.find((t) => t.id === "t1"), status: "doing" });
    watchCb({ paths: [path, `${OPUS}/.DS_Store`] });
    await vi.advanceTimersByTimeAsync(20);
    expect(onChange).not.toHaveBeenCalled();

    files[path] = "edited by claude";
    watchCb({ paths: [path] });
    await vi.advanceTimersByTimeAsync(20);
    expect(onChange).toHaveBeenCalledWith({ paths: [path] });
    vi.useRealTimers();
  });

  it("watchOpus is a no-op when the folder does not exist yet", async () => {
    const { watchOpus } = await load();
    const fs = await import("@tauri-apps/plugin-fs");
    const unwatch = await watchOpus(VAULT, vi.fn());
    expect(fs.watchImmediate).not.toHaveBeenCalled();
    expect(() => unwatch()).not.toThrow();
  });
});
