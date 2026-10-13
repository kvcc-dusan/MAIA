import { describe, it, expect } from "vitest";
import { clipText, DETAIL_CLIP_CHARS } from "./text.js";

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

