import { describe, it, expect } from "vitest";
import { noteToMarkdown, markdownToNote, slugifyTitle, noteFilename } from "./noteFile.js";

const sampleNote = {
  id: "abc1234",
  title: "My Note: a \"test\"",
  content: "# Hello\n\nSome [[wikilink]] body.\n",
  tags: ["journal", "deep work"],
  links: [],
  projectIds: ["p1"],
  createdAt: "2026-07-13T10:00:00.000Z",
  project: null,
};

describe("noteToMarkdown / markdownToNote round-trip", () => {
  it("preserves all fields and content", () => {
    const md = noteToMarkdown(sampleNote);
    const back = markdownToNote(md);
    expect(back).toEqual(sampleNote);
  });

  it("handles empty content and empty arrays", () => {
    const note = { ...sampleNote, content: "", tags: [], projectIds: [] };
    const back = markdownToNote(noteToMarkdown(note));
    expect(back).toEqual(note);
  });

  it("preserves content that contains --- lines", () => {
    const note = { ...sampleNote, content: "before\n---\nafter" };
    const back = markdownToNote(noteToMarkdown(note));
    expect(back.content).toBe("before\n---\nafter");
  });
});

describe("markdownToNote with external / partial files", () => {
  it("tolerates a plain md file without frontmatter", () => {
    const note = markdownToNote("# Just text\nbody", {
      fallbackId: "x1",
      fallbackTitle: "External Note",
    });
    expect(note.id).toBe("x1");
    expect(note.title).toBe("External Note");
    expect(note.content).toBe("# Just text\nbody");
    expect(note.tags).toEqual([]);
    expect(note.createdAt).toBeTruthy();
  });

  it("generates an id when nothing is provided", () => {
    const note = markdownToNote("body");
    expect(note.id).toMatch(/^[a-z0-9]+$/);
  });

  it("coerces a scalar tag into an array", () => {
    const note = markdownToNote('---\nid: a\ntags: journal\n---\nbody');
    expect(note.tags).toEqual(["journal"]);
  });
});

describe("slugifyTitle / noteFilename", () => {
  it("slugifies diacritics and illegal chars", () => {
    expect(slugifyTitle("Dušan's Plan: v2 / final?")).toBe("dusan's-plan-v2-final");
  });

  it("falls back to untitled-<id> for empty titles", () => {
    expect(noteFilename({ id: "abc1234", title: "" })).toBe("untitled-abc12.md");
  });

  it("suffixes collisions", () => {
    const taken = new Set(["plan.md", "plan-2.md"]);
    expect(noteFilename({ id: "z", title: "Plan" }, taken)).toBe("plan-3.md");
  });
});
