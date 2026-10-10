// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAssetUploads } from "./useAssetUploads";


const makeFile = (name, size = 4) => new File([new Uint8Array(size)], name, { type: "image/png" });

const setup = (assets = []) => {
  let project = { id: "p1", assets };
  const updateProject = vi.fn((_id, patch) => { project = { ...project, ...patch }; });
  const hook = renderHook(() => useAssetUploads({ project, updateProject }));
  return { hook, updateProject, get: () => project };
};

describe("useAssetUploads", () => {
  it("keeps every file of a multi-file drop", async () => {
    const { hook, get } = setup([{ id: "old", name: "old.png", dataUrl: "x" }]);
    await act(async () => { await hook.result.current.addFiles([makeFile("a.png"), makeFile("b.png")]); });
    expect(get().assets.map((a) => a.name)).toEqual(["old.png", "a.png", "b.png"]);
    expect(hook.result.current.pending).toEqual([]);
  });

  it("reports an oversized file with a fix and still adds the others", async () => {
    const { hook, get } = setup();
    await act(async () => {
      await hook.result.current.addFiles([makeFile("huge.png", 6 * 1024 * 1024), makeFile("ok.png")]);
    });
    expect(get().assets.map((a) => a.name)).toEqual(["ok.png"]);
    await waitFor(() => expect(hook.result.current.errors).toHaveLength(1));
    expect(hook.result.current.errors[0].message).toMatch(/huge\.png.*Compress it/);
  });

  it("removes one asset and dismisses errors", async () => {
    const { hook, get } = setup([{ id: "1", name: "a" }, { id: "2", name: "b" }]);
    await act(async () => { await hook.result.current.removeAsset({ id: "1" }); });
    expect(get().assets.map((a) => a.id)).toEqual(["2"]);
    act(() => hook.result.current.reportError("x", "boom"));
    const id = hook.result.current.errors[0].id;
    act(() => hook.result.current.dismissError(id));
    expect(hook.result.current.errors).toEqual([]);
  });
});
