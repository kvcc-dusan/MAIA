// @vitest-environment jsdom
// In-memory fs behind the Tauri plugin; files hold text or Uint8Array.
import { describe, it, expect, beforeEach, vi } from "vitest";

let files;
let dirs;
let clock;
let watchCb;
const mtimes = new Map();

const parent = (p) => p.slice(0, p.lastIndexOf("/"));
const addDirs = (p) => {
  for (let d = parent(p); d.length > "/mock".length; d = parent(d)) dirs.add(d);
};
const put = (p, data) => {
  addDirs(p);
  files[p] = data;
  mtimes.set(p, ++clock);
};

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(async (p) => p in files || dirs.has(p) || Object.keys(files).some((f) => f.startsWith(`${p}/`))),
  readTextFile: vi.fn(async (p) => {
    if (!(p in files)) throw new Error(`ENOENT ${p}`);
    return files[p];
  }),
  readFile: vi.fn(async (p) => {
    if (!(p in files)) throw new Error(`ENOENT ${p}`);
    return files[p];
  }),
  writeTextFile: vi.fn(async (p, text) => put(p, text)),
  writeFile: vi.fn(async (p, bytes, opts) => {
    if (opts?.createNew && p in files) throw new Error("exists");
    put(p, bytes);
  }),
  mkdir: vi.fn(async (p) => {
    dirs.add(p);
    addDirs(p);
  }),
  remove: vi.fn(async (p) => {
    delete files[p];
    dirs.delete(p);
  }),
  stat: vi.fn(async (p) => ({ mtime: new Date(mtimes.get(p) ?? 0), size: files[p]?.length ?? 0 })),
  readDir: vi.fn(async (dir) => {
    const out = new Map();
    for (const p of Object.keys(files)) {
      if (p.startsWith(`${dir}/`)) {
        const [first, ...more] = p.slice(dir.length + 1).split("/");
        out.set(first, { name: first, isDirectory: more.length > 0, isFile: more.length === 0 });
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
const ASSETS = `${OPUS}/Atlas/assets`;
const load = () => import("./index.js");
const bytes = (...n) => new Uint8Array(n);

describe("project assets as files", () => {
  beforeEach(() => {
    files = {};
    dirs = new Set([VAULT]);
    clock = 0;
    mtimes.clear();
    watchCb = null;
    vi.clearAllMocks();
    vi.resetModules();
    put(`${OPUS}/Atlas/project.md`, "---\nid: p1\nname: Atlas\n---\nDesc\n");
  });

  it("lists the folder newest first, ignoring hidden files and subfolders", async () => {
    const { loadOpus, listAssets } = await load();
    put(`${ASSETS}/old.pdf`, bytes(1, 2, 3));
    put(`${ASSETS}/new.png`, bytes(1));
    put(`${ASSETS}/.DS_Store`, bytes(0));
    put(`${ASSETS}/sub/inner.txt`, bytes(9));
    await loadOpus(VAULT);
    const list = await listAssets(VAULT, "p1");
    expect(list.map((a) => a.name)).toEqual(["new.png", "old.pdf"]);
    expect(list[1]).toMatchObject({ size: 3, type: "application/pdf", path: `${ASSETS}/old.pdf` });
    expect(list[0].id).toBe((await listAssets(VAULT, "p1"))[0].id);
  });

  it("returns nothing for a project without an assets folder and throws for an unknown project", async () => {
    const { loadOpus, listAssets } = await load();
    await loadOpus(VAULT);
    expect(await listAssets(VAULT, "p1")).toEqual([]);
    await expect(listAssets(VAULT, "nope")).rejects.toThrow(/no folder/);
  });

  it("saves any file type, sanitizes the name and never overwrites", async () => {
    const { loadOpus, saveAsset } = await load();
    await loadOpus(VAULT);
    const a = await saveAsset(VAULT, "p1", { name: "Spec: v1?.zip", bytes: bytes(1, 2) });
    const b = await saveAsset(VAULT, "p1", { name: "Spec: v1?.zip", bytes: bytes(3) });
    const c = await saveAsset(VAULT, "p1", { name: "spec v1.ZIP", bytes: bytes(4) });
    expect([a.name, b.name, c.name]).toEqual(["Spec v1.zip", "Spec v1 2.zip", "spec v1 3.ZIP"]);
    expect(a).toMatchObject({ size: 2, type: "application/zip" });
    expect(files[`${ASSETS}/Spec v1.zip`]).toEqual(bytes(1, 2));
  });

  it("falls back for names with nothing usable and keeps dotfiles from being hidden", async () => {
    const { loadOpus, saveAsset } = await load();
    await loadOpus(VAULT);
    expect((await saveAsset(VAULT, "p1", { name: ".env", bytes: bytes(1) })).name).toBe("env");
    expect((await saveAsset(VAULT, "p1", { name: "///", bytes: bytes(1) })).name).toBe("File");
  });

  it("refuses to save before the project has a folder", async () => {
    const { saveAsset } = await load();
    await expect(saveAsset(VAULT, "p1", { name: "a.pdf", bytes: bytes(1) })).rejects.toThrow(/no folder yet/);
  });

  it("reads and deletes by name, and refuses names that leave the folder", async () => {
    const { loadOpus, readAsset, deleteAsset } = await load();
    put(`${ASSETS}/a.bin`, bytes(7));
    await loadOpus(VAULT);
    expect(await readAsset(VAULT, "p1", "a.bin")).toEqual(bytes(7));
    await expect(readAsset(VAULT, "p1", "../project.md")).rejects.toThrow(/not a file name/);
    await expect(deleteAsset(VAULT, "p1", ".hidden")).rejects.toThrow();
    expect(await deleteAsset(VAULT, "p1", "a.bin")).toBe(true);
    expect(await deleteAsset(VAULT, "p1", "a.bin")).toBe(false);
    expect(`${ASSETS}/a.bin` in files).toBe(false);
  });

  it("never reports _backups or assets files as warnings or items, and writes nothing on load", async () => {
    put(`${OPUS}/_backups/backup-2026-10-10T12-00-00.json`, "{}");
    put(`${ASSETS}/brief.pdf`, bytes(1));
    put(`${ASSETS}/notes.md`, "---\nid: [broken\n---\n");
    const { loadOpus } = await load();
    const result = await loadOpus(VAULT);
    expect(result.warnings).toEqual([]);
    expect(result.projects.map((p) => p.id)).toEqual(["p1"]);
    expect(result.tasks).toEqual([]);
    const fs = await import("@tauri-apps/plugin-fs");
    expect(fs.writeTextFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("does not give a project the reserved _backups or _inbox folder name", async () => {
    const { projectFolderName } = await load();
    expect(projectFolderName({ name: "_backups" })).toBe("_backups 2");
    expect(projectFolderName({ name: "_inbox" })).toBe("_inbox 2");
  });

  it("routes assets changes to onAssetsChange only, and md changes to onChange only", async () => {
    const { loadOpus, watchOpus } = await load();
    await loadOpus(VAULT);
    const onChange = vi.fn();
    const onAssetsChange = vi.fn();
    await watchOpus(VAULT, onChange, { debounceMs: 0, onAssetsChange });
    watchCb({ paths: [`${ASSETS}/drop.pdf`, `${ASSETS}/.DS_Store`, `${OPUS}/_backups/backup-1.json`] });
    await new Promise((r) => setTimeout(r, 10));
    expect(onAssetsChange).toHaveBeenCalledWith({ paths: [`${ASSETS}/drop.pdf`] });
    expect(onChange).not.toHaveBeenCalled();
    put(`${OPUS}/Atlas/tasks/New.md`, "---\nid: t9\n---\n");
    watchCb({ paths: [`${OPUS}/Atlas/tasks/New.md`] });
    await new Promise((r) => setTimeout(r, 10));
    expect(onChange).toHaveBeenCalledWith({ paths: [`${OPUS}/Atlas/tasks/New.md`] });
    expect(onAssetsChange).toHaveBeenCalledTimes(1);
  });
});
