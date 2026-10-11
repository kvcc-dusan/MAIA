import { describe, expect, it } from "vitest";
import { EMPTY_PREVIEW, notePreview } from "./notePreview.js";

describe("notePreview", () => {
  it("returns the empty message for missing or blank text", () => {
    expect(notePreview(undefined)).toBe(EMPTY_PREVIEW);
    expect(notePreview("  \n\t ")).toBe(EMPTY_PREVIEW);
  });

  it("collapses whitespace so the card text is one flowing line", () => {
    expect(notePreview("# Title\n\nSome   text\nhere")).toBe("# Title Some text here");
  });

  it("cuts long notes and never reads the whole body", () => {
    const long = "word ".repeat(100000);
    const preview = notePreview(long);
    expect(preview.length).toBeLessThanOrEqual(241);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("leaves short notes untouched", () => {
    expect(notePreview("short note")).toBe("short note");
  });
});
