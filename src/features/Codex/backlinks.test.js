import { describe, it, expect } from "vitest";
import { countBacklinks } from "./backlinks.js";

const note = { id: "a", title: "Alpha" };

describe("countBacklinks", () => {
  it("counts other notes linking to the title, ignoring case and spacing", () => {
    const notes = [
      note,
      { id: "b", links: ["  alpha "] },
      { id: "c", links: ["ALPHA", "x"] },
      { id: "d", links: ["beta"] },
    ];
    expect(countBacklinks(notes, note)).toBe(2);
  });

  it("does not count the note itself or a note twice", () => {
    const notes = [{ id: "a", title: "Alpha", links: ["Alpha"] }, { id: "b", links: ["Alpha", "alpha"] }];
    expect(countBacklinks(notes, note)).toBe(1);
  });

  it("is zero for missing data or an empty title", () => {
    expect(countBacklinks(undefined, note)).toBe(0);
    expect(countBacklinks([{ id: "b", links: [""] }], { id: "a", title: "" })).toBe(0);
    expect(countBacklinks([{ id: "b" }], note)).toBe(0);
  });

  it("counts links by folder path and file name, not only by title", () => {
    const overview = { id: "o", title: "COSMOS — Overview", folder: "sm/cosmos", fileName: "00-overview" };
    const other = { id: "m", title: "MIND — Overview", folder: "sm/mind", fileName: "00-overview" };
    const notes = [
      overview,
      other,
      { id: "x", title: "X", folder: "sm", links: ["cosmos/00-overview"] },
      { id: "y", title: "Y", folder: "sm/cosmos", links: ["00-overview"] },
      { id: "z", title: "Z", folder: "sm", links: ["mind/00-overview"] },
    ];
    expect(countBacklinks(notes, overview)).toBe(2);
    expect(countBacklinks(notes, other)).toBe(1);
  });

  it("resolves against the open copy when its title is newer than the stored one", () => {
    const stored = { id: "a", title: "Alpha" };
    const open = { id: "a", title: "Alpha 2" };
    const notes = [stored, { id: "b", links: ["Alpha 2"] }];
    expect(countBacklinks(notes, open)).toBe(1);
    expect(countBacklinks([{ id: "b", links: ["Alpha"] }], note)).toBe(1);
  });
});
