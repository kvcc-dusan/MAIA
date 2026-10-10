// @vitest-environment jsdom
// useOpusStore's file mode, with the S1 adapter replaced by an in-memory fake
// so diffing, reload, migration and conflicts run deterministically.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

class MockVaultConflictError extends Error {
  constructor(id, { diskText, attemptedText, filename }) {
    super("conflict");
    this.name = "VaultConflictError";
    this.noteId = id;
    this.diskText = diskText;
    this.attemptedText = attemptedText;
    this.filename = filename;
  }
}

const h = vi.hoisted(() => ({
  vaultPath: "/mock/vault",
  disk: { exists: true, projects: [], tasks: [], warnings: [] },
  onWatch: null,
  api: {},
}));

vi.mock("../lib/vault.js", () => ({
  isTauri: () => true,
  getVaultPath: () => h.vaultPath,
  VaultConflictError: MockVaultConflictError,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../lib/opusFiles/index.js", () => h.api);

import { toast } from "sonner";

const clone = (v) => structuredClone(v);
const project = (id, extra = {}) => ({
  id, name: `Project ${id}`, status: "Active", decisions: [], questions: [], workstreams: [], milestones: [], assets: [], ...extra,
});
const task = (id, extra = {}) => ({ id, title: `Task ${id}`, status: "todo", done: false, projectId: "p1", ...extra });

// In-memory stand-in for the vault: write-through, so a reload sees what was saved.
const installFakeApi = () => {
  const touchProject = (id, fn) => {
    h.disk.exists = true;
    h.disk.projects = h.disk.projects.map((p) => (p.id === id ? fn(p) : p));
  };
  Object.assign(h.api, {
    loadOpus: vi.fn(async () => clone(h.disk)),
    saveProject: vi.fn(async (_v, p) => {
      h.disk.exists = true;
      const old = h.disk.projects.find((x) => x.id === p.id);
      const body = { ...p, decisions: old?.decisions ?? [], questions: old?.questions ?? [] };
      h.disk.projects = old ? h.disk.projects.map((x) => (x.id === p.id ? body : x)) : [...h.disk.projects, body];
      return { path: "x", warnings: [] };
    }),
    saveDecision: vi.fn(async (_v, pid, d) => touchProject(pid, (p) => ({ ...p, decisions: [...p.decisions.filter((x) => x.id !== d.id), d] }))),
    saveQuestion: vi.fn(async (_v, pid, q) => touchProject(pid, (p) => ({ ...p, questions: [...p.questions.filter((x) => x.id !== q.id), q] }))),
    saveTask: vi.fn(async (_v, t) => {
      h.disk.exists = true;
      h.disk.tasks = [...h.disk.tasks.filter((x) => x.id !== t.id), t];
      return { path: "x" };
    }),
    deleteItem: vi.fn(async (_v, kind, id) => {
      if (kind === "task") h.disk.tasks = h.disk.tasks.filter((t) => t.id !== id);
      if (kind === "project") h.disk.projects = h.disk.projects.filter((p) => p.id !== id);
      return { skipped: [] };
    }),
    moveTask: vi.fn(),
    watchOpus: vi.fn(async (_v, cb) => {
      h.onWatch = cb;
      return () => {};
    }),
  });
};

const writeCalls = () =>
  ["saveProject", "saveDecision", "saveQuestion", "saveTask", "deleteItem"].flatMap((n) => h.api[n].mock.calls.map((c) => [n, c]));

const mount = async () => {
  vi.resetModules();
  const { useOpusStore } = await import("./useOpusStore.js");
  const hook = renderHook(() => useOpusStore());
  await waitFor(() => expect(hook.result.current[2].status).toBe("ready"));
  return hook;
};
const flush = (hook) => act(() => hook.result.current[2].flush());
const state = (hook) => hook.result.current[0];
const setters = (hook) => hook.result.current[1];

// Vitest runs without globals, so Testing Library does not unmount between tests.
// A hook left mounted keeps its 1s localStorage write-back and overwrites the
// seeded legacy data during a later test.
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  h.vaultPath = "/mock/vault";
  h.onWatch = null;
  h.disk = {
    exists: true,
    projects: [project("p1", { decisions: [{ id: "d1", title: "D1", date: "2026-01-01" }] })],
    tasks: [task("t1"), task("t2")],
    warnings: [],
  };
  installFakeApi();
});

describe("useOpusStore (files)", () => {
  it("maps loaded files to state and writes nothing", async () => {
    const hook = await mount();
    expect(hook.result.current[2].mode).toBe("files");
    expect(state(hook).projects.map((p) => p.id)).toEqual(["p1"]);
    expect(state(hook).tasks).toHaveLength(2);
    await flush(hook);
    expect(writeCalls()).toEqual([]);
  });

  it("a task edit writes exactly one task", async () => {
    const hook = await mount();
    act(() => setters(hook).setTasks((prev) => prev.map((t) => (t.id === "t1" ? { ...t, title: "Edited" } : t))));
    await flush(hook);
    expect(writeCalls().map(([n]) => n)).toEqual(["saveTask"]);
    expect(h.api.saveTask.mock.calls[0][1]).toMatchObject({ id: "t1", title: "Edited" });
  });

  it("a decision edit writes the decision and not project.md", async () => {
    const hook = await mount();
    act(() => setters(hook).setProjects((prev) => prev.map((p) => ({ ...p, decisions: p.decisions.map((d) => ({ ...d, detail: "why" })) }))));
    await flush(hook);
    expect(writeCalls().map(([n]) => n)).toEqual(["saveDecision"]);
    expect(h.api.saveDecision.mock.calls[0].slice(1)).toEqual(["p1", expect.objectContaining({ id: "d1", detail: "why" })]);
  });

  it("a project field edit writes only the project", async () => {
    const hook = await mount();
    act(() => setters(hook).setProjects((prev) => prev.map((p) => ({ ...p, headline: "New" }))));
    await flush(hook);
    expect(writeCalls().map(([n]) => n)).toEqual(["saveProject"]);
  });

  it("deletes call deleteItem; a new debounce-free edit batch is one write per item", async () => {
    const hook = await mount();
    act(() => {
      setters(hook).setTasks((prev) => prev.filter((t) => t.id !== "t2"));
      setters(hook).setProjects((prev) => prev.map((p) => ({ ...p, decisions: [] })));
    });
    await flush(hook);
    expect(h.api.deleteItem.mock.calls.map((c) => c.slice(1))).toEqual([["decision", "d1"], ["task", "t2"]]);
  });

  it("changing a task's project writes the task with the new projectId", async () => {
    h.disk.projects.push(project("p2"));
    const hook = await mount();
    act(() => setters(hook).setTasks((prev) => prev.map((t) => (t.id === "t1" ? { ...t, projectId: "p2" } : t))));
    await flush(hook);
    expect(h.api.saveTask.mock.calls[0][1]).toMatchObject({ id: "t1", projectId: "p2" });
  });

  it("debounces writes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const hook = await mount();
      act(() => setters(hook).setTasks((prev) => prev.map((t) => ({ ...t, title: "A" }))));
      expect(h.api.saveTask).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
      expect(h.api.saveTask).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reloads on an external change without writing, and keeps unsaved local edits", async () => {
    const hook = await mount();
    act(() => setters(hook).setTasks((prev) => prev.map((t) => (t.id === "t1" ? { ...t, title: "Mine" } : t))));
    h.disk.tasks = [task("t1"), task("t2", { title: "From Claude" }), task("t3")];
    await act(async () => { await h.onWatch({ paths: ["x"] }); });
    await waitFor(() => expect(state(hook).tasks.map((t) => t.title)).toContain("From Claude"));
    expect(state(hook).tasks.find((t) => t.id === "t1").title).toBe("Mine");
    expect(state(hook).tasks.map((t) => t.id)).toContain("t3");
    await flush(hook);
    expect(h.api.saveTask.mock.calls.map((c) => c[1].id)).toEqual(["t1"]);
  });

  it("keeps both versions on a conflict and tells the user", async () => {
    const hook = await mount();
    h.api.saveTask.mockRejectedValueOnce(new MockVaultConflictError("t1", { diskText: "d", attemptedText: "a", filename: "f.md" }));
    h.disk.tasks = [task("t1", { title: "Disk version" }), task("t2")];
    act(() => setters(hook).setTasks((prev) => prev.map((t) => (t.id === "t1" ? { ...t, title: "My edit" } : t))));
    await flush(hook);
    await waitFor(() => expect(state(hook).tasks.map((t) => t.title).sort()).toEqual(["Disk version", "My edit (conflict copy)", "Task t2"]));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("conflict copy"));
    await flush(hook);
    expect(h.api.saveTask.mock.calls.at(-1)[1].title).toBe("My edit (conflict copy)");
  });

  it("retries a failed write on the next change and never drops it", async () => {
    const hook = await mount();
    h.api.saveTask.mockRejectedValueOnce(new Error("disk full"));
    act(() => setters(hook).setTasks((prev) => prev.map((t) => (t.id === "t1" ? { ...t, title: "X" } : t))));
    await flush(hook);
    expect(toast.error).toHaveBeenCalled();
    expect(hook.result.current[2].hasPending()).toBe(true);
    await flush(hook);
    expect(h.api.saveTask).toHaveBeenCalledTimes(2);
    expect(hook.result.current[2].hasPending()).toBe(false);
  });

  it("exposes warnings and keeps project assets in localStorage", async () => {
    h.disk.warnings = [{ path: "/mock/vault/Opus/A/project.md", message: "Project skipped, not valid frontmatter: bad" }];
    const hook = await mount();
    expect(hook.result.current[2].warnings).toHaveLength(1);
    act(() => setters(hook).setProjects((prev) => prev.map((p) => ({ ...p, assets: [{ id: "a1", name: "f.png" }] }))));
    await flush(hook);
    expect(JSON.parse(localStorage.getItem("maia.projectAssets"))).toEqual({ p1: [{ id: "a1", name: "f.png" }] });
    expect(h.api.saveProject).not.toHaveBeenCalled();
    hook.unmount();
    const again = await mount();
    expect(state(again).projects[0].assets).toEqual([{ id: "a1", name: "f.png" }]);
  });

  it("is plain localStorage with no vault", async () => {
    h.vaultPath = null;
    localStorage.setItem("maia.tasks", JSON.stringify([task("L1")]));
    const hook = await mount();
    expect(hook.result.current[2].mode).toBe("browser");
    expect(state(hook).tasks.map((t) => t.id)).toEqual(["L1"]);
    expect(h.api.loadOpus).not.toHaveBeenCalled();
  });
});

describe("migration from localStorage", () => {
  const seed = () => {
    localStorage.setItem("maia.projects", JSON.stringify([
      project("p1", { decisions: [{ id: "d1", title: "D1", date: "2026-01-01" }], questions: [{ id: "q1", question: "Q?" }] }),
    ]));
    localStorage.setItem("maia.tasks", JSON.stringify([task("t1"), task("t2", { projectId: null })]));
  };

  beforeEach(() => {
    h.disk = { exists: false, projects: [], tasks: [], warnings: [] };
  });

  it("writes everything, sets the flag and leaves localStorage untouched", async () => {
    seed();
    const before = [localStorage.getItem("maia.projects"), localStorage.getItem("maia.tasks")];
    const hook = await mount();
    expect(h.api.saveProject).toHaveBeenCalledTimes(1);
    expect(h.api.saveDecision).toHaveBeenCalledTimes(1);
    expect(h.api.saveQuestion).toHaveBeenCalledTimes(1);
    expect(h.api.saveTask.mock.calls.map((c) => [c[1].id, c[1].projectId])).toEqual([["t1", "p1"], ["t2", null]]);
    expect(h.api.saveProject.mock.invocationCallOrder[0]).toBeLessThan(h.api.saveTask.mock.invocationCallOrder[0]);
    expect(localStorage.getItem("maia.opusMigrated")).toBe("true");
    expect([localStorage.getItem("maia.projects"), localStorage.getItem("maia.tasks")]).toEqual(before);
    expect(state(hook).tasks).toHaveLength(2);
  });

  it("skips when Opus already exists and the vault wins", async () => {
    seed();
    h.disk = { exists: true, projects: [project("other")], tasks: [], warnings: [] };
    const hook = await mount();
    expect(writeCalls()).toEqual([]);
    expect(localStorage.getItem("maia.opusMigrated")).toBeNull();
    expect(state(hook).projects.map((p) => p.id)).toEqual(["other"]);
  });

  it("never migrates twice", async () => {
    seed();
    localStorage.setItem("maia.opusMigrated", "true");
    await mount();
    expect(writeCalls()).toEqual([]);
  });

  it("does not set the flag when a write fails, and finishes on the next launch", async () => {
    seed();
    h.api.saveTask.mockRejectedValueOnce(new Error("disk full"));
    const first = await mount();
    expect(localStorage.getItem("maia.opusMigrated")).toBeNull();
    expect(toast.error).toHaveBeenCalled();
    expect(h.disk.tasks.map((t) => t.id)).toEqual(["t2"]);

    // Relaunch: the first app session is gone before the second one reads localStorage.
    first.unmount();
    vi.clearAllMocks();
    installFakeApi();
    await mount();
    expect(h.api.saveProject).not.toHaveBeenCalled();
    expect(h.api.saveTask.mock.calls.map((c) => c[1].id)).toEqual(["t1"]);
    expect(localStorage.getItem("maia.opusMigrated")).toBe("true");
  });
});
