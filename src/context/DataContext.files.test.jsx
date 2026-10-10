// @vitest-environment jsdom
// DataContext in file mode (Tauri with a vault): sample data must not replace
// real files, and a vault switch must write pending Opus edits first.
import React from "react";
import { render, act, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  switchVault: vi.fn(async () => {}),
  disk: { exists: true, projects: [], tasks: [], warnings: [] },
  api: {},
}));

vi.mock("../lib/vault.js", () => ({
  isTauri: () => true,
  getVaultPath: () => "/mock/vault",
  VaultConflictError: class VaultConflictError extends Error {},
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../hooks/useNotesStore.js", async () => {
  const React = await import("react");
  return {
    useNotesStore: () => {
      const meta = React.useMemo(() => ({ status: "ready", error: null, reload: () => {}, switchVault: h.switchVault }), []);
      return [[], () => {}, meta];
    },
  };
});
vi.mock("../lib/opusFiles/index.js", () => h.api);

import { DataProvider, useData } from "./DataContext.jsx";

let ctx;
const Probe = () => {
  ctx = useData();
  return null;
};

describe("DataContext in file mode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    h.disk = {
      exists: true,
      projects: [{ id: "p1", name: "Real project", status: "Active", decisions: [], questions: [] }],
      tasks: [{ id: "t1", title: "Real task", status: "todo", projectId: "p1" }],
      warnings: [],
    };
    Object.assign(h.api, {
      loadOpus: vi.fn(async () => structuredClone(h.disk)),
      saveTask: vi.fn(async () => ({ path: "x" })),
      saveProject: vi.fn(async () => ({ path: "x", warnings: [] })),
      saveDecision: vi.fn(),
      saveQuestion: vi.fn(),
      deleteItem: vi.fn(async () => ({ skipped: [] })),
      watchOpus: vi.fn(async () => () => {}),
    });
  });
  afterEach(cleanup);

  const mount = async () => {
    render(<DataProvider><Probe /></DataProvider>);
    expect(ctx.projectsLoading).toBe(true);
    await waitFor(() => expect(ctx.opusMeta.status).toBe("ready"));
  };

  it("loads from files and reports the mode", async () => {
    await mount();
    expect(ctx.opusMeta.mode).toBe("files");
    expect(ctx.projectsLoading).toBe(false);
    expect(ctx.projects.map((p) => p.name)).toEqual(["Real project"]);
    expect(ctx.opusMeta).toMatchObject({ projectCount: 1, taskCount: 1 });
  });

  it("generateSamples is a no-op that returns false", async () => {
    await mount();
    let result;
    act(() => { result = ctx.generateSamples(); });
    expect(result).toBe(false);
    expect(ctx.projects.map((p) => p.name)).toEqual(["Real project"]);
    expect(ctx.tasks).toHaveLength(1);
  });

  it("flushes pending Opus writes before the notes store switches vault", async () => {
    await mount();
    act(() => { ctx.updateTask("t1", { title: "Edited just now" }); });
    expect(h.api.saveTask).not.toHaveBeenCalled(); // still inside the debounce
    await act(async () => { await ctx.notesMeta.switchVault("/other"); });
    expect(h.api.saveTask).toHaveBeenCalledTimes(1);
    expect(h.switchVault).toHaveBeenCalledWith("/other");
    expect(h.api.saveTask.mock.invocationCallOrder[0]).toBeLessThan(h.switchVault.mock.invocationCallOrder[0]);
  });

  it("refuses to switch when Opus edits could not be saved", async () => {
    await mount();
    h.api.saveTask.mockRejectedValue(new Error("disk full"));
    act(() => { ctx.updateTask("t1", { title: "Unsaved" }); });
    await expect(act(() => ctx.notesMeta.switchVault("/other"))).rejects.toThrow(/nothing was switched/);
    expect(h.switchVault).not.toHaveBeenCalled();
  });
});
