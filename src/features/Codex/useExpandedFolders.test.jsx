// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXPANDED_KEY, useExpandedFolders } from "./useExpandedFolders.js";

const stored = () => JSON.parse(localStorage.getItem(EXPANDED_KEY));
const setStored = (value) => localStorage.setItem(EXPANDED_KEY, value);

describe("useExpandedFolders", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("starts collapsed when nothing is stored", () => {
    const { result } = renderHook(() => useExpandedFolders());
    expect([...result.current.expanded]).toEqual([]);
  });

  it("restores saved paths and drops non-string entries", () => {
    setStored(JSON.stringify(["Omnis", 42, null, "Areas/Sub"]));
    const { result } = renderHook(() => useExpandedFolders());
    expect([...result.current.expanded].sort()).toEqual(["Areas/Sub", "Omnis"]);
  });

  it("starts collapsed when the stored JSON is corrupt", () => {
    setStored("{not json");
    const { result } = renderHook(() => useExpandedFolders());
    expect([...result.current.expanded]).toEqual([]);
  });

  it("starts collapsed when the stored value is not an array", () => {
    setStored(JSON.stringify({ Omnis: true }));
    const { result } = renderHook(() => useExpandedFolders());
    expect([...result.current.expanded]).toEqual([]);
  });

  it("starts collapsed and does not throw when localStorage read throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useExpandedFolders());
    expect([...result.current.expanded]).toEqual([]);
  });

  it("toggles a folder and persists the change", () => {
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.toggle("Omnis"));
    expect(result.current.expanded.has("Omnis")).toBe(true);
    expect(stored()).toEqual(["Omnis"]);
    act(() => result.current.toggle("Omnis"));
    expect(result.current.expanded.has("Omnis")).toBe(false);
    expect(stored()).toEqual([]);
  });

  it("replaces the set instead of mutating the previous one", () => {
    const { result } = renderHook(() => useExpandedFolders());
    const before = result.current.expanded;
    act(() => result.current.toggle("Omnis"));
    expect(result.current.expanded).not.toBe(before);
    expect(before.has("Omnis")).toBe(false);
  });

  it("setOpen is a no-op when the folder is already in the requested state", () => {
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.setOpen("Omnis", true));
    const open = result.current.expanded;
    act(() => result.current.setOpen("Omnis", true));
    expect(result.current.expanded).toBe(open);
    act(() => result.current.setOpen("Omnis", false));
    expect(result.current.expanded.has("Omnis")).toBe(false);
  });

  it("expandAll adds the given paths and keeps the existing ones", () => {
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.toggle("Areas"));
    act(() => result.current.expandAll(["Omnis", "Omnis/PROJECTS"]));
    expect([...result.current.expanded].sort()).toEqual(["Areas", "Omnis", "Omnis/PROJECTS"]);
    expect(stored().sort()).toEqual(["Areas", "Omnis", "Omnis/PROJECTS"]);
  });

  it("expandAll does not change state when every path is already open", () => {
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.expandAll(["Omnis"]));
    const open = result.current.expanded;
    act(() => result.current.expandAll(["Omnis"]));
    expect(result.current.expanded).toBe(open);
  });

  it("keeps working in memory when localStorage write throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.toggle("Omnis"));
    expect(result.current.expanded.has("Omnis")).toBe(true);
    expect(localStorage.getItem(EXPANDED_KEY)).toBeNull();
  });

  it("collapseAll clears everything, persists it, and keeps the same state when already empty", () => {
    setStored(JSON.stringify(["A", "A/B"]));
    const { result } = renderHook(() => useExpandedFolders());
    act(() => result.current.collapseAll());
    expect([...result.current.expanded]).toEqual([]);
    expect(stored()).toEqual([]);
    const before = result.current.expanded;
    act(() => result.current.collapseAll());
    expect(result.current.expanded).toBe(before);
  });
});
