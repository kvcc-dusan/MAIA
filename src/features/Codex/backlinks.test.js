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
});
