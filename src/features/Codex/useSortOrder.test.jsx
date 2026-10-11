// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSortOrder } from "./useSortOrder.js";

describe("useSortOrder", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("defaults to A to Z and ignores a junk stored value", () => {
    localStorage.setItem("maia.codex.sort:/v/one", "garbage");
    expect(renderHook(() => useSortOrder("/v/one")).result.current[0]).toBe("name-asc");
  });

  it("remembers the choice per vault", () => {
    const { result, rerender } = renderHook(({ path }) => useSortOrder(path), { initialProps: { path: "/v/one" } });
    act(() => result.current[1]("modified-desc"));
    expect(localStorage.getItem("maia.codex.sort:/v/one")).toBe("modified-desc");

    rerender({ path: "/v/two" });
    expect(result.current[0]).toBe("name-asc");
    act(() => result.current[1]("created-asc"));

    rerender({ path: "/v/one" });
    expect(result.current[0]).toBe("modified-desc");
    expect(localStorage.getItem("maia.codex.sort:/v/two")).toBe("created-asc");
  });

  it("uses a plain key on the web", () => {
    const { result } = renderHook(() => useSortOrder(null));
    act(() => result.current[1]("name-desc"));
    expect(localStorage.getItem("maia.codex.sort")).toBe("name-desc");
  });

  it("still applies the choice when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useSortOrder(null));
    expect(result.current[0]).toBe("name-asc");
    act(() => result.current[1]("created-desc"));
    expect(result.current[0]).toBe("created-desc");
  });
});
