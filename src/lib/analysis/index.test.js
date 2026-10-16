import { describe, it, expect } from "vitest";
import { findClusters } from "./index.js";

const note = (id, title, folder, fileName, content = "") => ({ id, title, folder, fileName, content });

describe("findClusters", () => {
  it("joins notes that link by title, alias or heading", () => {
    const notes = [
      note("a", "Alpha", "", undefined, "see [[beta|B]] and [[Gamma#Part]]"),
      note("b", "Beta"),
      note("c", "Gamma"),
      note("d", "Lonely"),
    ];
    const clusters = findClusters(notes);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].notes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("joins notes that link by folder path when titles differ from file names", () => {
    const notes = [
      note("root", "Speculum Mundi", "sm", "index", "[[cosmos/00-overview]] [[mind/00-overview]]"),
      note("co", "COSMOS — Overview", "sm/cosmos", "00-overview", "[[cosmos/01-reading-path#COS-F-04]]"),
      note("cr", "COSMOS — Reading path", "sm/cosmos", "01-reading-path"),
      note("mo", "MIND — Overview", "sm/mind", "00-overview"),
      note("stray", "Stray", "elsewhere", "stray"),
    ];
    const clusters = findClusters(notes);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].notes.map((n) => n.id).sort()).toEqual(["co", "cr", "mo", "root"]);
  });

  it("does not treat a link to itself as a connection", () => {
    expect(findClusters([note("a", "Alpha", "", undefined, "[[alpha]]")])).toEqual([]);
  });
});
