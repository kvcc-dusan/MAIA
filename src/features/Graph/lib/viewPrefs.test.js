// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUP_BY_FOLDER_KEY, readGroupByFolder, writeGroupByFolder } from "./viewPrefs.js";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("group by folder preference", () => {
  it("defaults to on", () => {
    expect(readGroupByFolder()).toBe(true);
  });

  it("persists both choices", () => {
    writeGroupByFolder(false);
    expect(localStorage.getItem(GROUP_BY_FOLDER_KEY)).toBe("off");
    expect(readGroupByFolder()).toBe(false);
    writeGroupByFolder(true);
    expect(readGroupByFolder()).toBe(true);
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readGroupByFolder()).toBe(true);
    expect(() => writeGroupByFolder(false)).not.toThrow();
  });
});
