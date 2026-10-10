import { describe, it, expect } from "vitest";
import {
  linkedNotesFor,
  unlinkedNotesFor,
  filterNotesByTitle,
  withProject,
  withoutProject,
  excerptOf,
  noteTitle,
} from "./noteModel.js";

const notes = [
  { id: "a", title: "Alpha", projectIds: ["p1"], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: "b", title: "Beta", projectIds: ["p1", "p2"], createdAt: "2026-02-01T00:00:00Z" },
  { id: "c", title: "Gamma", projectIds: [], createdAt: "2026-01-15T00:00:00Z" },
  { id: "d", title: "", createdAt: "2026-01-20T00:00:00Z" },
];

describe("linked and unlinked selection", () => {
  it("returns linked notes newest first, using updatedAt before createdAt", () => {
    expect(linkedNotesFor(notes, "p1").map((n) => n.id)).toEqual(["a", "b"]);
    expect(linkedNotesFor(notes, "p2").map((n) => n.id)).toEqual(["b"]);
  });

  it("returns the complement, tolerating a missing projectIds", () => {
    expect(unlinkedNotesFor(notes, "p1").map((n) => n.id)).toEqual(["c", "d"]);
  });

  it("does not reorder the input", () => {
    const before = notes.map((n) => n.id);
    linkedNotesFor(notes, "p1");
    expect(notes.map((n) => n.id)).toEqual(before);
  });

  it("falls back to 'Untitled'", () => {
    expect(noteTitle(notes[3])).toBe("Untitled");
    expect(noteTitle(notes[0])).toBe("Alpha");
  });
});

describe("filterNotesByTitle", () => {
  it("matches case-insensitively and reports the full match count", () => {
    expect(filterNotesByTitle(notes, "  ALP ")).toEqual({ shown: [notes[0]], total: 1 });
  });

  it("returns everything for an empty query, capped by the limit", () => {
    const result = filterNotesByTitle(notes, "", 2);
    expect(result.shown).toHaveLength(2);
    expect(result.total).toBe(4);
  });

  it("treats a missing title as an empty string", () => {
    expect(filterNotesByTitle(notes, "zzz").total).toBe(0);
  });
});

describe("link edits", () => {
  it("adds the project without mutating the note", () => {
    const next = withProject(notes[2], "p1");
    expect(next.projectIds).toEqual(["p1"]);
    expect(notes[2].projectIds).toEqual([]);
    expect(withProject(notes[3], "p1").projectIds).toEqual(["p1"]);
  });

  it("removes only the given project", () => {
    expect(withoutProject(notes[1], "p1").projectIds).toEqual(["p2"]);
    expect(notes[1].projectIds).toEqual(["p1", "p2"]);
    expect(withoutProject(notes[3], "p1").projectIds).toEqual([]);
  });
});

describe("excerptOf", () => {
  it("strips markdown markers and collapses whitespace", () => {
    expect(excerptOf("# Title\n\n**bold** and `code` [link]")).toBe("Title bold and code link");
  });

  it("caps the length and tolerates missing content", () => {
    expect(excerptOf("x".repeat(200))).toHaveLength(80);
    expect(excerptOf(undefined)).toBe("");
  });
});
