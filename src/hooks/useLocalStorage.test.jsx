// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { useLocalStorage } from "./useLocalStorage.js";

function TestComponent({ storageKey, initial, onApi }) {
  const [state, setState, writeError] = useLocalStorage(storageKey, initial);
  onApi({ state, setState, writeError });
  return null;
}

function mount(storageKey, initial) {
  let api = null;
  const onApi = (next) => { api = next; };
  const utils = render(
    <TestComponent storageKey={storageKey} initial={initial} onApi={onApi} />
  );
  return { ...utils, getApi: () => api };
}

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("flushes a pending debounced write on unmount instead of dropping it", () => {
    const { getApi, unmount } = mount("maia.test.unmount", { count: 0 });

    act(() => {
      getApi().setState({ count: 1 });
    });

    // Nothing written yet — still inside the 1s debounce window.
    expect(localStorage.getItem("maia.test.unmount")).toBeNull();

    unmount();

    // Unmounting must flush, not cancel, the pending write.
    expect(JSON.parse(localStorage.getItem("maia.test.unmount"))).toEqual({ count: 1 });
  });

  it("flushes a pending write on beforeunload", () => {
    const { getApi } = mount("maia.test.unload", { count: 0 });

    act(() => {
      getApi().setState({ count: 5 });
    });

    expect(localStorage.getItem("maia.test.unload")).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    expect(JSON.parse(localStorage.getItem("maia.test.unload"))).toEqual({ count: 5 });
    cleanup();
  });

  it("preserves the corrupt raw value under a backup key instead of discarding it", () => {
    localStorage.setItem("maia.test.corrupt", "{not valid json");

    const { getApi } = mount("maia.test.corrupt", { fallback: true });

    expect(getApi().state).toEqual({ fallback: true });

    const backupKey = Object.keys(localStorage)
      .find((k) => k.startsWith("maia.test.corrupt.corrupt."));
    expect(backupKey).toBeTruthy();
    expect(localStorage.getItem(backupKey)).toBe("{not valid json");
    cleanup();
  });

  it("surfaces a write failure via the third return value", () => {
    const { getApi } = mount("maia.test.quota", { count: 0 });

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("quota");
      err.name = "QuotaExceededError";
      throw err;
    });

    act(() => {
      getApi().setState({ count: 1 });
    });

    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    expect(getApi().writeError).toBeInstanceOf(Error);
    expect(getApi().writeError.name).toBe("QuotaExceededError");

    setItemSpy.mockRestore();
    cleanup();
  });
});
