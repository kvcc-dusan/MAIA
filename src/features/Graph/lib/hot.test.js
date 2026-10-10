import { describe, it, expect } from "vitest";
import { isHotNode } from "./hot.js";
import { noteTags } from "../../../lib/noteTags.js";

describe("isHotNode", () => {
  it("matches a mixed-case node tag against a lowercase hot tag", () => {
    expect(isHotNode(["Alpha"], new Set(["alpha"]))).toBe(true);
  });

  it("matches when the hot tag is one of several node tags", () => {
    expect(isHotNode(["Beta", "ALPHA"], new Set(["alpha"]))).toBe(true);
  });

  it("does not match unrelated tags", () => {
    expect(isHotNode(["Gamma"], new Set(["alpha"]))).toBe(false);
  });

  it("matches a note whose inline #Alpha tag comes through noteTags", () => {
    const note = { content: "Some text #Alpha", tags: [] };
    expect(isHotNode(noteTags(note), new Set(["alpha"]))).toBe(true);
  });

  it("matches a note whose frontmatter tag is '#Alpha'", () => {
    const note = { content: "", tags: ["#Alpha"] };
    expect(isHotNode(noteTags(note), new Set(["alpha"]))).toBe(true);
  });

  it("returns false when there are no hot tags", () => {
    expect(isHotNode(["alpha"], new Set())).toBe(false);
    expect(isHotNode(["alpha"], undefined)).toBe(false);
  });

  it("returns false for empty or missing node tags", () => {
    expect(isHotNode([], new Set(["alpha"]))).toBe(false);
    expect(isHotNode(undefined, new Set(["alpha"]))).toBe(false);
  });
});
