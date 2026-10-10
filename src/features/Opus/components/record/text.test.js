import { describe, it, expect } from "vitest";
import { clipText, clipDetail, DETAIL_CLIP_CHARS } from "./text.js";

describe("clipText", () => {
  it("returns short text unchanged and collapses whitespace", () => {
    expect(clipText("  Ship   the\nreport ")).toBe("Ship the report");
  });

  it("cuts long text with an ellipsis inside the limit", () => {
    const out = clipText("a".repeat(100), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });

  it("tolerates missing input", () => {
    expect(clipText(undefined)).toBe("");
    expect(clipText(null)).toBe("");
  });
});

describe("clipDetail", () => {
  it("leaves short single-paragraph text alone", () => {
    expect(clipDetail("Short note.")).toEqual({ text: "Short note.", isClipped: false });
  });

  it("clips by characters", () => {
    const { text, isClipped } = clipDetail("word ".repeat(100));
    expect(isClipped).toBe(true);
    expect(text.length).toBeLessThanOrEqual(DETAIL_CLIP_CHARS);
    expect(text.endsWith("…")).toBe(true);
  });

  it("clips by lines and keeps the line breaks it shows", () => {
    const { text, isClipped } = clipDetail("one\ntwo\nthree\nfour\nfive");
    expect(isClipped).toBe(true);
    expect(text).toBe("one\ntwo\nthree…");
  });

  it("does not clip exactly at the line limit", () => {
    expect(clipDetail("one\ntwo\nthree").isClipped).toBe(false);
  });

  it("does not clip exactly at the character limit", () => {
    const exact = "a".repeat(DETAIL_CLIP_CHARS);
    expect(clipDetail(exact)).toEqual({ text: exact, isClipped: false });
  });

  it("handles empty and missing input", () => {
    expect(clipDetail("")).toEqual({ text: "", isClipped: false });
    expect(clipDetail(undefined)).toEqual({ text: "", isClipped: false });
  });
});
