// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUP_PULL_DEFAULT } from "./graphForces.js";
import { GROUP_BY_FOLDER_KEY, GROUP_PULL_KEY, readGroupByFolder, readGroupPull, writeGroupByFolder, writeGroupPull } from "./viewPrefs.js";

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

describe("group pull preference", () => {
  it("defaults to the constant", () => {
    expect(readGroupPull()).toBe(GROUP_PULL_DEFAULT);
  });

  it("persists the value", () => {
    writeGroupPull(65);
    expect(localStorage.getItem(GROUP_PULL_KEY)).toBe("65");
    expect(readGroupPull()).toBe(65);
    writeGroupPull(0);
    expect(readGroupPull()).toBe(0);
  });

  it("clamps and ignores corrupt values", () => {
    localStorage.setItem(GROUP_PULL_KEY, "900");
    expect(readGroupPull()).toBe(100);
    localStorage.setItem(GROUP_PULL_KEY, "-4");
    expect(readGroupPull()).toBe(0);
    for (const bad of ["abc", "", "NaN"]) {
      localStorage.setItem(GROUP_PULL_KEY, bad);
      expect(readGroupPull()).toBe(GROUP_PULL_DEFAULT);
    }
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readGroupPull()).toBe(GROUP_PULL_DEFAULT);
    expect(() => writeGroupPull(50)).not.toThrow();
  });
});
