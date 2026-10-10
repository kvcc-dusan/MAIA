// @vitest-environment jsdom
// Adversarial cases for the Tauri adapter: unreadable and oversized files, races on new files.
import { describe, it, expect, beforeEach, vi } from "vitest";

let files;
let dirs;
let sizes;
let unreadable;
let existsLies;

const parent = (p) => p.slice(0, p.lastIndexOf("/"));
const addDirs = (p) => {
  for (let d = parent(p); d.length > "/mock".length; d = parent(d)) dirs.add(d);
};

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(async (p) => {
    if (existsLies.has(p)) return false;
    return p in files || dirs.has(p) || Object.keys(files).some((f) => f.startsWith(`${p}/`));
  }),
  readTextFile: vi.fn(async (p) => {
    if (unreadable.has(p)) throw new Error("stream did not contain valid UTF-8");
    if (!(p in files)) throw new Error(`ENOENT ${p}`);
    return files[p];
  }),
  writeTextFile: vi.fn(async (p, text, opts) => {
    if (opts?.createNew && p in files) throw new Error("File exists (os error 17)");
    addDirs(p);
    files[p] = text;
  }),
  writeFile: vi.fn(async (p, bytes, opts) => {
    if (opts?.createNew && p in files) throw new Error("File exists (os error 17)");
    addDirs(p);
    files[p] = bytes;
  }),
  mkdir: vi.fn(async (p) => {
    dirs.add(p);
    addDirs(p);
  }),
  remove: vi.fn(async (p) => {
    delete files[p];
    dirs.delete(p);
  }),
  stat: vi.fn(async (p) => ({ mtime: new Date(1), size: sizes.get(p) ?? files[p]?.length ?? 0 })),
  readDir: vi.fn(async (dir) => {
    const out = new Map();
    for (const p of Object.keys(files)) {
      if (!p.startsWith(`${dir}/`)) continue;
      const [first, ...more] = p.slice(dir.length + 1).split("/");
      out.set(first, { name: first, isDirectory: more.length > 0, isFile: more.length === 0 });
    }
    for (const d of dirs) if (parent(d) === dir) out.set(d.slice(dir.length + 1), { name: d.slice(dir.length + 1), isDirectory: true, isFile: false });
    return [...out.values()];
  }),
  watchImmediate: vi.fn(async () => () => {}),
}));

const VAULT = "/mock/vault";
const OPUS = `${VAULT}/Opus`;
const load = () => import("./index.js");
const PROJECT = "---\nid: p1\nname: Atlas\n---\nDesc\n";
const GB = 1024 * 1024 * 1024;

describe("opus adapter on hostile input", () => {
  beforeEach(() => {
    files = {};
    dirs = new Set([VAULT]);
    sizes = new Map();
    unreadable = new Set();
    existsLies = new Set();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("loads the other projects when one project.md cannot be read", async () => {
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
    files[`${OPUS}/Broken/project.md`] = "---\nid: p2\nname: Broken\n---\n";
    unreadable.add(`${OPUS}/Broken/project.md`);
    const { loadOpus } = await load();
    const result = await loadOpus(VAULT);
    expect(result.projects.map((p) => p.id)).toEqual(["p1"]);
    expect(result.warnings.map((w) => w.path)).toContain(`${OPUS}/Broken/project.md`);
  });

  it("skips oversized item and project files with a warning instead of reading them", async () => {
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
    files[`${OPUS}/Atlas/tasks/Huge.md`] = "---\nid: t9\n---\n";
    files[`${OPUS}/Giant/project.md`] = "---\nid: p3\nname: Giant\n---\n";
    sizes.set(`${OPUS}/Atlas/tasks/Huge.md`, GB);
    sizes.set(`${OPUS}/Giant/project.md`, GB);
    const { loadOpus } = await load();
    const readTextFile = (await import("@tauri-apps/plugin-fs")).readTextFile;
    const result = await loadOpus(VAULT);
    expect(result.tasks).toEqual([]);
    expect(result.projects.map((p) => p.id)).toEqual(["p1"]);
    expect(result.warnings.filter((w) => /too large/i.test(w.message))).toHaveLength(2);
    expect(readTextFile).not.toHaveBeenCalledWith(`${OPUS}/Atlas/tasks/Huge.md`);
  });

  it("reports a binary .md instead of loading it as a task", async () => {
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
    files[`${OPUS}/Atlas/tasks/scan.md`] = "%PDF-1.4\u0000\u0001\u0002";
    const { loadOpus } = await load();
    const result = await loadOpus(VAULT);
    expect(result.tasks).toEqual([]);
    expect(result.warnings.some((w) => /binary/i.test(w.message))).toBe(true);
  });

  it("never replaces a file that appeared between the exists check and the write", async () => {
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
    const { loadOpus, saveTask } = await load();
    await loadOpus(VAULT);
    const racing = `${OPUS}/Atlas/tasks/Plan.md`;
    files[racing] = "written by Obsidian a moment ago";
    existsLies.add(racing).add(`${OPUS}/Atlas/tasks`);
    await expect(saveTask(VAULT, { id: "t1", title: "Plan", projectId: "p1" })).rejects.toThrow();
    expect(files[racing]).toBe("written by Obsidian a moment ago");
  });

  it("refuses an asset above the size limit before writing", async () => {
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
    const { loadOpus, saveAsset } = await load();
    await loadOpus(VAULT);
    await expect(saveAsset(VAULT, "p1", { name: "big.zip", bytes: { byteLength: 251 * 1024 * 1024 } })).rejects.toThrow(/too large/i);
    expect(Object.keys(files).some((f) => f.includes("/assets/"))).toBe(false);
  });
});
