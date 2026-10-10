import { describe, expect, it } from "vitest";
import { ancestorPaths, buildTree, flattenTree, listFolderPaths, normalizeFolder } from "./folderTree.js";

const note = (id, title, folder) => ({ id, title, folder });
const names = (rows) => rows.map((r) => `${r.depth}:${r.name}`);

describe("folderTree", () => {
  it("normalizes folder values", () => {
    expect(normalizeFolder("/A//B/")).toBe("A/B");
    expect(normalizeFolder(undefined)).toBe("");
    expect(ancestorPaths("A/B/C")).toEqual(["A", "A/B", "A/B/C"]);
    expect(ancestorPaths("")).toEqual([]);
  });

  it("nests folders, puts folders before notes, sorts case-insensitively", () => {
    const tree = buildTree(
      [note("1", "zeta", ""), note("2", "Alpha", ""), note("3", "inner", "Areas/Design"), note("4", "b", "Areas")],
      ["Areas", "Areas/Design", "domains"]
    );
    const rows = flattenTree(tree, new Set(["Areas", "Areas/Design"]));
    expect(names(rows)).toEqual([
      "0:Areas", "1:Design", "2:inner", "1:b", "0:domains", "0:Alpha", "0:zeta",
    ]);
  });

  it("keeps empty folders and derives folders and ancestors from notes", () => {
    const tree = buildTree([note("1", "n", "X/Y/Z")], ["Empty"]);
    expect(listFolderPaths(tree)).toEqual(["Empty", "X", "X/Y", "X/Y/Z"]);
    expect(tree.folders.find((f) => f.path === "Empty").noteCount).toBe(0);
  });

  it("counts notes recursively and hides children of collapsed folders", () => {
    const tree = buildTree([note("1", "a", "A"), note("2", "b", "A/B")], []);
    expect(tree.folders[0].noteCount).toBe(2);
    expect(flattenTree(tree, new Set()).map((r) => r.name)).toEqual(["A"]);
    const rows = flattenTree(tree, new Set(["A"]));
    expect(rows.map((r) => r.key)).toEqual(["f:A", "f:A/B", "n:1"]);
    expect(rows[1].parentKey).toBe("f:A");
  });

  it("tolerates missing input and notes without a folder", () => {
    expect(flattenTree(buildTree(undefined, undefined), new Set())).toEqual([]);
    expect(flattenTree(buildTree([{ id: "1" }], null), new Set())[0].name).toBe("Untitled");
  });
});
