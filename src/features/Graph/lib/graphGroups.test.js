import { describe, expect, it } from "vitest";
import {
  GHOST_GROUP, NO_TAG_GROUP, OTHER_GROUP, PROJECT_GROUP, ROOT_GROUP, MAX_TAG_GROUPS,
  assignGroups, buildPalette, colorsByGroup, topLevelFolder,
} from "./graphGroups.js";

const note = (id, folder, tags = []) => ({ id, type: "note", folder, tags });

describe("topLevelFolder", () => {
  it("takes the first segment of nested folders", () => {
    expect(topLevelFolder("Work/Clients/Acme")).toBe("Work");
    expect(topLevelFolder("Work")).toBe("Work");
  });
  it("treats root, empty and missing as no folder", () => {
    expect(topLevelFolder("")).toBe("");
    expect(topLevelFolder(undefined)).toBe("");
  });
});

describe("assignGroups by folder", () => {
  const nodes = [
    note("a", "Work/Clients"), note("b", "Work"), note("c", "Life"), note("d", ""), note("e", undefined),
    { id: "p", type: "project" }, { id: "g", type: "ghost" },
  ];
  const { groupOf, groups } = assignGroups(nodes, "folder");

  it("merges nested folders into their top-level folder", () => {
    expect(groupOf.get("a")).toBe("Work");
    expect(groupOf.get("b")).toBe("Work");
  });
  it("puts root notes in a neutral root group", () => {
    expect(groupOf.get("d")).toBe(ROOT_GROUP);
    expect(groupOf.get("e")).toBe(ROOT_GROUP);
    expect(groups.find((g) => g.key === ROOT_GROUP).rank).toBe(-1);
  });
  it("gives projects and ghosts their own groups", () => {
    expect(groupOf.get("p")).toBe(PROJECT_GROUP);
    expect(groupOf.get("g")).toBe(GHOST_GROUP);
  });
  it("ranks coloured groups by size, biggest first", () => {
    const coloured = groups.filter((g) => g.rank >= 0);
    expect(coloured.map((g) => g.key)).toEqual(["Work", "Life"]);
    expect(coloured.map((g) => g.rank)).toEqual([0, 1]);
  });
});

describe("assignGroups by tag", () => {
  it("uses the most common tag of a note, case-insensitively", () => {
    const nodes = [note("a", "", ["Dev", "misc"]), note("b", "", ["dev"]), note("c", "", ["misc"]), note("d", "", [])];
    const { groupOf, groups } = assignGroups(nodes, "tag");
    expect(groupOf.get("a")).toBe("Dev");
    expect(groupOf.get("b")).toBe("Dev");
    expect(groupOf.get("c")).toBe("misc");
    expect(groupOf.get("d")).toBe(NO_TAG_GROUP);
    expect(groups.find((g) => g.key === NO_TAG_GROUP).rank).toBe(-1);
  });
  it("folds the long tail into one neutral group", () => {
    const nodes = Array.from({ length: MAX_TAG_GROUPS + 3 }, (_, i) => note(`n${i}`, "", [`tag${String(i).padStart(2, "0")}`]));
    const { groups } = assignGroups(nodes, "tag");
    expect(groups.some((g) => g.key === OTHER_GROUP)).toBe(true);
    expect(groups.filter((g) => g.rank >= 0)).toHaveLength(MAX_TAG_GROUPS);
  });
});

describe("palette", () => {
  const base = [100, 200, 300, 400];
  it("starts with the token colours", () => {
    expect(buildPalette(base, 3)).toEqual([100, 200, 300]);
  });
  it("derives further colours instead of repeating", () => {
    const palette = buildPalette([0x3366cc, 0xcc3366, 0x33cc66, 0xcccc33], 8);
    expect(new Set(palette).size).toBe(8);
  });
  it("maps groups to colours with neutral and project overrides", () => {
    const groups = [
      { key: "Work", rank: 0 }, { key: ROOT_GROUP, rank: -1 }, { key: PROJECT_GROUP, rank: -1 },
    ];
    const map = colorsByGroup(groups, [11], 22, 33);
    expect([map.get("Work"), map.get(ROOT_GROUP), map.get(PROJECT_GROUP)]).toEqual([11, 22, 33]);
  });
});
