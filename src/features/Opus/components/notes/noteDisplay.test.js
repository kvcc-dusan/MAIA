import { describe, expect, it } from "vitest";
import { noteDateLabel, notePreview, stripMarkdown } from "./noteDisplay";

describe("noteDisplay", () => {
  it("strips markdown marks", () => {
    expect(stripMarkdown("# Title\n- **bold** and [link](http://x)\n[[Other note|alias]]")).toBe("Title\nbold and link\nalias");
  });
  it("keeps the first lines and clips long bodies", () => {
    expect(notePreview("a\n\nb\nc\nd\ne").split("\n")).toEqual(["a", "b", "c", "d"]);
    expect(notePreview("x".repeat(500)).length).toBe(280);
  });
  it("skips a first line that repeats the title", () => {
    expect(notePreview("# Plan\nbody", "Plan")).toBe("body");
  });
  it("labels the date", () => {
    expect(noteDateLabel({ createdAt: "2020-10-08T10:00:00Z" })).toBe("8 Oct 2020");
    expect(noteDateLabel({})).toBe("No date");
  });
});
