import { describe, expect, it } from "vitest";
import { folderChain, folderLabelName, labelGroups } from "./folderGroups.js";

const notes = (folder, count, prefix = folder) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}#${i}`, folder }));

describe("folderChain", () => {
  it("lists the folder and its ancestors, deepest first", () => {
    expect(folderChain("a/b/c")).toEqual(["a/b/c", "a/b", "a"]);
    expect(folderChain("a")).toEqual(["a"]);
  });
  it("has nothing for the vault root", () => {
    expect(folderChain("")).toEqual([]);
    expect(folderChain(undefined)).toEqual([]);
  });
});

describe("labelGroups", () => {
  it("names a group by its last path segment, exactly as written", () => {
    const groups = labelGroups(notes("Projects/_team-pack/Wave 1", 5));
    expect(groups.map((g) => g.name)).toContain("Wave 1");
    expect(folderLabelName("Projects/_team-pack/Wave 1")).toBe("Wave 1");
  });

  it("gives nested groups their own label, counting sub-folder notes in the parent", () => {
    const groups = labelGroups([...notes("a/b", 3), ...notes("a", 1)]);
    expect(groups.map((g) => g.path)).toEqual(["a"]); // a/b has 3, a has 4
    expect(groups[0].ids).toHaveLength(4);
    const both = labelGroups([...notes("a/b", 4), ...notes("a", 2)]);
    expect(both.map((g) => g.path)).toEqual(["a", "a/b"]);
  });

  it("skips groups under four notes and never labels the root", () => {
    expect(labelGroups(notes("a", 3))).toEqual([]);
    expect(labelGroups(notes("", 10))).toEqual([]);
  });

  it("orders largest first, ties by path, and caps the count", () => {
    const groups = labelGroups([...notes("small", 4), ...notes("big", 9), ...notes("also", 4)]);
    expect(groups.map((g) => g.path)).toEqual(["big", "also", "small"]);
    const many = Array.from({ length: 30 }, (_, i) => notes(`f${String(i).padStart(2, "0")}`, 4)).flat();
    expect(labelGroups(many)).toHaveLength(24);
    expect(labelGroups(many, { max: 5 })).toHaveLength(5);
  });
});

describe("labelGroups chains", () => {
  const node = (id, folder) => ({ id, folder });
  const many = (folder, count, prefix) => Array.from({ length: count }, (_, i) => node(`${prefix}${i}`, folder));

  it("labels only the deepest folder when parents hold exactly the same notes", () => {
    const groups = labelGroups(many("pack/specs/wave-1", 6, "a"));
    expect(groups.map((g) => g.name)).toEqual(["wave-1"]);
  });

  it("keeps a parent that holds more than its child", () => {
    const groups = labelGroups([...many("pack/specs/wave-1", 5, "a"), ...many("pack/research", 5, "b")]);
    expect(groups.map((g) => g.path).sort()).toEqual(["pack", "pack/research", "pack/specs/wave-1"]);
  });
});
