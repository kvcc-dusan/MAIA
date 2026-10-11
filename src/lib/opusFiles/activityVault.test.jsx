// @vitest-environment jsdom
// Activity files against an in-memory fs: load, write, watcher, delete, migration, reload during write.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

let files;
let dirs;
let clock;
let watchCb;
const mtimes = new Map();

const parent = (p) => p.slice(0, p.lastIndexOf("/"));
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
    mtimes.set(p, ++clock);
  }),
  mkdir: vi.fn(async (p) => {
    dirs.add(p);
    addDirs(p);
  }),
  remove: vi.fn(async (p) => {
    delete files[p];
    dirs.delete(p);
  }),
  rename: vi.fn(async (from, to) => {
    if (!(from in files)) throw new Error(`ENOENT ${from}`);
    addDirs(to);
    files[to] = files[from];
    mtimes.set(to, ++clock);
    delete files[from];
  }),
  stat: vi.fn(async (p) => ({ mtime: new Date(mtimes.get(p) ?? 0) })),
  readDir: vi.fn(async (dir) => {
    const out = new Map();
    for (const p of Object.keys(files)) {
      if (p.startsWith(`${dir}/`)) {
        const [first, ...more] = p.slice(dir.length + 1).split("/");
        out.set(first, { name: first, isDirectory: more.length > 0, isFile: more.length === 0 });
      }
    }
    for (const d of dirs) if (parent(d) === dir) out.set(d.slice(dir.length + 1), { name: d.slice(dir.length + 1), isDirectory: true, isFile: false });
    return [...out.values()];
  }),
  watchImmediate: vi.fn(async (_p, cb) => {
    watchCb = cb;
    return () => {};
  }),
}));

const VAULT = "/mock/vault";
const OPUS = `${VAULT}/Opus`;
const ATLAS = `${OPUS}/Atlas/activity.jsonl`;
const INBOX = `${OPUS}/_inbox/activity.jsonl`;
const PROJECT = "---\nid: p1\nname: Atlas\n---\n";

const e = (n, projectId = "p1", extra = {}) => ({
  at: `2026-10-01T00:00:${String(n).padStart(2, "0")}.000Z`, kind: "created", collection: "tasks", itemId: `t${n}`,
  projectId, title: `T${n}`, from: null, to: null, ...extra,
});
const lines = (...list) => `${list.map((x) => JSON.stringify(x)).join("\n")}\n`;
const api = () => import("./index.js");

describe("activity files", () => {
  beforeEach(() => {
    files = {};
    dirs = new Set([VAULT]);
    clock = 0;
    mtimes.clear();
    watchCb = null;
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
    files[`${OPUS}/Atlas/project.md`] = PROJECT;
  });

  it("loads per-project and inbox files, ignoring them as items", async () => {
    files[ATLAS] = lines(e(1), e(2));
    files[INBOX] = lines(e(3, null));
    const { loadOpus } = await api();
    const r = await loadOpus(VAULT);
    expect(r.tasks).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.activityFiles.map((g) => [g.projectId, g.entries.length]).sort()).toEqual([[null, 1], ["p1", 2]]);
  });

  it("warns on a malformed line, skips it, and keeps it when rewriting", async () => {
    files[ATLAS] = `${JSON.stringify(e(1))}\n{broken\n`;
    const { loadOpus, saveActivity } = await api();
    const r = await loadOpus(VAULT);
    expect(r.warnings).toEqual([{ path: ATLAS, message: expect.stringContaining("Line 2") }]);
    expect(r.activityFiles[0].entries).toHaveLength(1);
    await saveActivity(VAULT, "p1", [e(1), e(2)]);
    expect(files[ATLAS]).toContain("{broken");
    expect(files[ATLAS].split("\n").filter(Boolean)).toHaveLength(3);
  });

  it("creates files, never rewrites an unchanged one, and refuses to clobber an external change", async () => {
    const { loadOpus, saveActivity } = await api();
    await loadOpus(VAULT);
    await saveActivity(VAULT, "p1", [e(1)]);
    await saveActivity(VAULT, null, [e(2, null)]);
    expect(files[ATLAS]).toBe(lines(e(1)));
    expect(files[INBOX]).toBe(lines(e(2, null)));
    const writes = vi.mocked((await import("@tauri-apps/plugin-fs")).writeTextFile).mock.calls.length;
    await saveActivity(VAULT, "p1", [e(1)]);
    expect(vi.mocked((await import("@tauri-apps/plugin-fs")).writeTextFile).mock.calls.length).toBe(writes);
    files[ATLAS] = lines(e(1), e(9));
    await expect(saveActivity(VAULT, "p1", [e(1), e(2)])).rejects.toMatchObject({ name: "VaultConflictError" });
    expect(files[ATLAS]).toBe(lines(e(1), e(9)));
  });

  it("skips a project that has no folder yet", async () => {
    const { loadOpus, saveActivity } = await api();
    await loadOpus(VAULT);
    expect(await saveActivity(VAULT, "nope", [e(1, "nope")])).toEqual({ skipped: true });
  });

  it("deleting a project removes its activity file and folder without warnings", async () => {
    const { loadOpus, saveActivity, deleteItem } = await api();
    await loadOpus(VAULT);
    await saveActivity(VAULT, "p1", [e(1)]);
    expect(await deleteItem(VAULT, "project", "p1")).toEqual({ skipped: [] });
    expect(Object.keys(files).filter((f) => f.includes("Atlas"))).toEqual([]);
    expect((await (await api()).loadOpus(VAULT)).warnings).toEqual([]);
  });

  it("reports activity.jsonl through onActivityChange only", async () => {
    files[ATLAS] = lines(e(1));
    const { loadOpus, watchOpus } = await api();
    await loadOpus(VAULT);
    const onChange = vi.fn();
    const onActivityChange = vi.fn();
    await watchOpus(VAULT, onChange, { debounceMs: 0, onActivityChange });
    files[ATLAS] = lines(e(1), e(2));
    watchCb({ paths: [ATLAS, INBOX] });
    await vi.waitFor(() => expect(onActivityChange).toHaveBeenCalledWith({ paths: [ATLAS, INBOX] }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("filters the echo of its own activity write", async () => {
    const { loadOpus, saveActivity, watchOpus } = await api();
    await loadOpus(VAULT);
    const onActivityChange = vi.fn();
    await watchOpus(VAULT, vi.fn(), { debounceMs: 0, onActivityChange });
    await saveActivity(VAULT, "p1", [e(1)]);
    watchCb({ paths: [ATLAS] });
    await new Promise((r) => setTimeout(r, 30));
    expect(onActivityChange).not.toHaveBeenCalled();
  });

  describe("migration", () => {
    const seedLegacy = (list) => localStorage.setItem("maia.activity", JSON.stringify(list));

    it("routes by folder, sends the rest to _inbox, keeps localStorage, and is idempotent", async () => {
      const { loadOpus, ...rest } = await api();
      const { runActivityMigration } = await import("../../hooks/opus/activityMigration.js");
      const legacy = [e(1), e(2, "ghost"), e(3, null)];
      seedLegacy(legacy);
      const result = await runActivityMigration({ loadOpus, ...rest }, VAULT, await loadOpus(VAULT));
      expect(result.status).toBe("done");
      expect(files[ATLAS]).toBe(lines(e(1)));
      expect(files[INBOX]).toBe(lines(e(2, "ghost"), e(3, null)));
      expect(localStorage.getItem("maia.activity")).toBe(JSON.stringify(legacy));
      expect(localStorage.getItem("maia.activityMigrated")).toBe("true");

      // Flag lost (crash before it was set): a second run adds nothing.
      localStorage.removeItem("maia.activityMigrated");
      const again = await runActivityMigration({ loadOpus, ...rest }, VAULT, await loadOpus(VAULT));
      expect(again.status).toBe("done");
      expect(files[ATLAS]).toBe(lines(e(1)));
      expect(files[INBOX]).toBe(lines(e(2, "ghost"), e(3, null)));
    });

    it("does nothing once flagged or when there is no legacy log", async () => {
      const { loadOpus, ...rest } = await api();
      const { runActivityMigration } = await import("../../hooks/opus/activityMigration.js");
      expect((await runActivityMigration({ loadOpus, ...rest }, VAULT, await loadOpus(VAULT))).status).toBe("skipped");
      seedLegacy([e(1)]);
      localStorage.setItem("maia.activityMigrated", "true");
      expect((await runActivityMigration({ loadOpus, ...rest }, VAULT, await loadOpus(VAULT))).status).toBe("skipped");
      expect(files[ATLAS]).toBeUndefined();
    });

    it("merges into an existing file instead of replacing it", async () => {
      files[ATLAS] = lines(e(5));
      seedLegacy([e(1)]);
      const { loadOpus, ...rest } = await api();
      const { runActivityMigration } = await import("../../hooks/opus/activityMigration.js");
      await runActivityMigration({ loadOpus, ...rest }, VAULT, await loadOpus(VAULT));
      expect(files[ATLAS]).toBe(lines(e(1), e(5)));
    });
  });

  it("a reload during a write does not lose entries", async () => {
    const adapter = await api();
    const { useActivityFiles } = await import("../../hooks/opus/useActivityFiles.js");
    const known = new Set(["p1"]);
    await adapter.loadOpus(VAULT);
    const { result } = renderHook(() => useActivityFiles());
    act(() => result.current.applyLoaded([]));

    act(() => result.current.setActivity([e(1)]));
    // An external append lands, and a reload merges it before our write goes out.
    files[ATLAS] = lines(e(2));
    const reloaded = await adapter.loadOpus(VAULT);
    act(() => result.current.applyLoaded(reloaded.activityFiles));
    expect(result.current.activity.map((x) => x.itemId)).toEqual(["t1", "t2"]);

    const outcome = await result.current.write(adapter, VAULT, known);
    expect(outcome).toEqual({ failed: 0, needsReload: false });
    expect(files[ATLAS]).toBe(lines(e(1), e(2)));
    expect(result.current.isDirty(known)).toBe(false);
  });

  it("a conflict on write asks for a reload and keeps the pending entry", async () => {
    const adapter = await api();
    const { useActivityFiles } = await import("../../hooks/opus/useActivityFiles.js");
    const known = new Set(["p1"]);
    files[ATLAS] = lines(e(1));
    const first = await adapter.loadOpus(VAULT);
    const { result } = renderHook(() => useActivityFiles());
    act(() => result.current.applyLoaded(first.activityFiles));
    act(() => result.current.setActivity((prev) => [...prev, e(3)]));
    files[ATLAS] = lines(e(1), e(2)); // external append after our read

    expect(await result.current.write(adapter, VAULT, known)).toEqual({ failed: 0, needsReload: true });
    expect(files[ATLAS]).toBe(lines(e(1), e(2)));
    act(() => result.current.applyLoaded([]));
    const second = await adapter.loadOpus(VAULT);
    act(() => result.current.applyLoaded(second.activityFiles));
    await result.current.write(adapter, VAULT, known);
    expect(files[ATLAS]).toBe(lines(e(1), e(2), e(3)));
  });
});
