import { describe, it, expect } from "vitest";
import {unlinkedNotesFor, filterNotesByTitle, withProject, noteTitle} from "./noteModel.js";

const notes = [
  { id: "a", title: "Alpha", projectIds: ["p1"], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: "b", title: "Beta", projectIds: ["p1", "p2"], createdAt: "2026-02-01T00:00:00Z" },
  { id: "c", title: "Gamma", projectIds: [], createdAt: "2026-01-15T00:00:00Z" },
  { id: "d", title: "", createdAt: "2026-01-20T00:00:00Z" },
];

describe("linked and unlinked selection", () => {

  it("returns the complement, tolerating a missing projectIds", () => {
    expect(unlinkedNotesFor(notes, "p1").map((n) => n.id)).toEqual(["c", "d"]);
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

});

