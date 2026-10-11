import { describe, expect, it } from "vitest";
import { buildTree } from "./folderTree.js";
import {
  createdTime, DEFAULT_SORT, modifiedTime, noteComparator, parseSort, serializeSort, SORT_OPTIONS, sortStorageKey,
} from "./sortOrder.js";

const t = (iso) => new Date(iso).getTime();
const notes = [
  { id: "1", title: "banana", folder: "", modifiedAt: t("2026-03-01"), birthAt: t("2026-01-03") },
  { id: "2", title: "Apple", folder: "", modifiedAt: t("2026-01-01"), birthAt: t("2026-02-01") },
  { id: "3", title: "cherry", folder: "", modifiedAt: t("2026-02-01"), birthAt: t("2026-01-01") },
];
const folders = ["beta", "Alpha", "gamma"];
const order = (sort) => {
  const tree = buildTree(notes, folders, sort);
  return [...tree.folders.map((f) => f.name), ...tree.notes.map((n) => n.title)];
};

describe("sortOrder", () => {
  it("parses stored values and falls back to the default for junk", () => {
    expect(DEFAULT_SORT).toBe("name-asc");
    for (const { id } of SORT_OPTIONS) expect(parseSort(id)).toBe(id);
    for (const junk of [null, undefined, "", "nope", 5, {}, "name-asc;drop"]) expect(parseSort(junk)).toBe("name-asc");
    expect(serializeSort("created-asc")).toBe("created-asc");
    expect(serializeSort("junk")).toBe("name-asc");
  });

  it("keys storage per vault, with a plain key on the web", () => {
    expect(sortStorageKey("/v/one")).toBe("maia.codex.sort:/v/one");
    expect(sortStorageKey(null)).toBe("maia.codex.sort");
  });

  it("offers the six labelled options", () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toEqual([
      "File name (A to Z)", "File name (Z to A)", "Modified time (new to old)",
      "Modified time (old to new)", "Created time (new to old)", "Created time (old to new)",
    ]);
  });

  it.each([
    ["name-asc", ["Alpha", "beta", "gamma", "Apple", "banana", "cherry"]],
    ["name-desc", ["gamma", "beta", "Alpha", "cherry", "banana", "Apple"]],
    ["modified-desc", ["Alpha", "beta", "gamma", "banana", "cherry", "Apple"]],
    ["modified-asc", ["Alpha", "beta", "gamma", "Apple", "cherry", "banana"]],
    ["created-desc", ["Alpha", "beta", "gamma", "Apple", "banana", "cherry"]],
    ["created-asc", ["Alpha", "beta", "gamma", "cherry", "banana", "Apple"]],
  ])("orders folders first, then notes, for %s", (sort, expected) => {
    expect(order(sort)).toEqual(expected);
  });

  it("breaks ties by name, then id, so the order is stable", () => {
    const same = [
      { id: "b", title: "same", modifiedAt: 5 },
      { id: "a", title: "same", modifiedAt: 5 },
      { id: "c", title: "Aaa", modifiedAt: 5 },
    ];
    expect([...same].sort(noteComparator("modified-desc")).map((n) => n.id)).toEqual(["c", "a", "b"]);
    expect([...same].reverse().sort(noteComparator("modified-asc")).map((n) => n.id)).toEqual(["c", "a", "b"]);
  });

  it("falls back to updatedAt / createdAt for notes without loader times", () => {
    expect(modifiedTime({ updatedAt: "2026-01-02T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" })).toBe(t("2026-01-02T00:00:00.000Z"));
    expect(modifiedTime({ createdAt: "2026-01-01T00:00:00.000Z" })).toBe(t("2026-01-01T00:00:00.000Z"));
    expect(createdTime({ createdAt: "2026-01-01T00:00:00.000Z" })).toBe(t("2026-01-01T00:00:00.000Z"));
    expect(createdTime({ birthAt: 7, createdAt: "2026-01-01T00:00:00.000Z" })).toBe(7);
    expect(createdTime({})).toBe(0);
  });
});
