// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePropertiesOpen } from "./usePropertiesOpen.js";

beforeEach(() => localStorage.clear());

describe("usePropertiesOpen", () => {
  it("defaults to open only when the note has properties", () => {
    expect(renderHook(() => usePropertiesOpen("a", true)).result.current[0]).toBe(true);
    expect(renderHook(() => usePropertiesOpen("b", false)).result.current[0]).toBe(false);
  });

  it("remembers the choice per note", () => {
    const first = renderHook(() => usePropertiesOpen("a", true));
    act(() => first.result.current[1](false));
    expect(first.result.current[0]).toBe(false);
    expect(renderHook(() => usePropertiesOpen("a", true)).result.current[0]).toBe(false);
    expect(renderHook(() => usePropertiesOpen("other", true)).result.current[0]).toBe(true);
  });

  it("survives storage that throws", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const { result } = renderHook(() => usePropertiesOpen("a", false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    get.mockRestore();
    set.mockRestore();
  });
});
