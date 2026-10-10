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

describe("unknown frontmatter keys", () => {
  const obsidian = [
    "---",
    "id: abc1234",
    "title: Meeting notes",
    "aliases:",
    "  - Standup",
    '  - "Daily: sync"',
    "created: 2026-07-13 10:00",
    "status: draft",
    "cssclasses: [wide, dim]",
    'quote: "He said \\"hi\\" # not a comment"',
    "single: 'it''s: fine'",
    "nested:",
    "  author:",
    "    name: Dusan",
    "  count: 3",
    "summary: |",
    "  line one",
    "",
    "  line three",
    "# a comment between keys",
    "tags: [a, b]",
    "list:",
    "- zero-indent item",
    "- other",
    "---",
    "Body",
  ].join("\n");

  it("keeps unknown keys out of the known fields and in frontmatterExtra", () => {
    const note = markdownToNote(obsidian);
    expect(note.id).toBe("abc1234");
    expect(note.tags).toEqual(["a", "b"]);
    expect(Object.keys(note.frontmatterExtra)).toEqual([
      "aliases", "created", "cssclasses", "quote", "single", "nested", "summary", "list",
    ]);
    expect(note.frontmatterExtra.aliases).toBe('aliases:\n  - Standup\n  - "Daily: sync"');
    expect(note.frontmatterExtra.created).toBe("created: 2026-07-13 10:00");
  });

  it("writes every unknown line back verbatim, after the known keys", () => {
    const out = noteToMarkdown(markdownToNote(obsidian));
    const fm = out.split("\n---\n")[0].split("\n");
    ["aliases:", "  - Standup", '  - "Daily: sync"', "created: 2026-07-13 10:00",
      "cssclasses: [wide, dim]", "  author:", "    name: Dusan", "summary: |",
      "  line one", "", "  line three", "- zero-indent item", "- other"]
      .forEach((line) => expect(fm).toContain(line));
    expect(fm.indexOf("aliases:")).toBeGreaterThan(fm.indexOf("tags: [a, b]"));
    expect(out.endsWith("Body")).toBe(true);
  });

  it("is stable across repeated read/write cycles", () => {
    const once = noteToMarkdown(markdownToNote(obsidian));
    const twice = noteToMarkdown(markdownToNote(once));
    expect(twice).toBe(once);
    expect(markdownToNote(twice).frontmatterExtra).toEqual(markdownToNote(obsidian).frontmatterExtra);
  });

  it("does not attach block-list lines of a known key to an unknown key", () => {
    const note = markdownToNote("---\nid: a\ntags:\n  - x\nfoo: bar\n---\nb");
    expect(note.frontmatterExtra).toEqual({ foo: "foo: bar" });
  });

  it("reads Obsidian block-list tags and keeps them across a save", () => {
    const src = '---\nid: a\ntags:\n  - alpha\n  - "two words"\n- beta\nprojectIds:\n  - p1\nlinks:\nfoo: bar\n---\nb';
    const note = markdownToNote(src);
    expect(note.tags).toEqual(["alpha", "two words", "beta"]);
    expect(note.projectIds).toEqual(["p1"]);
    expect(note.links).toEqual([]);
    expect(note.frontmatterExtra).toEqual({ foo: "foo: bar" });
    expect(markdownToNote(noteToMarkdown(note)).tags).toEqual(["alpha", "two words", "beta"]);
  });

  it("omits frontmatterExtra when there are no unknown keys", () => {
    expect("frontmatterExtra" in markdownToNote(noteToMarkdown(sampleNote))).toBe(false);
  });

  it("keeps duplicate unknown keys and survives edits to known fields", () => {
    const note = markdownToNote("---\nid: a\nx: 1\nx: 2\n---\nb");
    const out = noteToMarkdown({ ...note, title: "New title" });
    expect(out).toContain("x: 1\nx: 2");
    expect(out).toContain("title: New title");
  });

  it("does not duplicate a key that is also written as a known key", () => {
    const note = { ...sampleNote, frontmatterExtra: { title: "title: old" } };
    const out = noteToMarkdown(note);
    expect(out).not.toContain("title: old");
  });

  it("still writes an extra key when the note has no value for it", () => {
    const out = noteToMarkdown({ ...sampleNote, title: undefined, frontmatterExtra: { title: "title: old" } });
    expect(out).toContain("title: old");
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

describe("document fields", () => {
  it("round-trips kind, status, workstreamId and owner", () => {
    const doc = { ...sampleNote, kind: "spec", status: "notStarted", workstreamId: "ws1", owner: "Lea Horvat" };
    const back = markdownToNote(noteToMarkdown(doc));
    expect(back).toEqual(doc);
  });

  it("leaves them undefined on a plain note", () => {
    const back = markdownToNote(noteToMarkdown(sampleNote));
    expect(back.kind).toBeUndefined();
    expect(back.status).toBeUndefined();
    expect(back.workstreamId).toBeUndefined();
    expect(back.owner).toBeUndefined();
    expect(noteToMarkdown(sampleNote)).not.toContain("kind:");
  });
});

describe("frontmatter that does not start at byte 0", () => {
  const body = "Body **b**";

  it("reads frontmatter after a BOM", () => {
    const note = markdownToNote(`\uFEFF---\nid: a\ntitle: T\n---\n${body}`);
    expect(note.id).toBe("a");
    expect(note.title).toBe("T");
    expect(note.content).toBe(body);
  });

  it("reads frontmatter after leading blank lines", () => {
    const note = markdownToNote(`\n\n---\nid: a\ntitle: T\n---\n${body}`);
    expect(note.title).toBe("T");
    expect(note.content).toBe(body);
  });

  it("reads frontmatter after a BOM and CRLF blank lines", () => {
    const note = markdownToNote(`\uFEFF\r\n---\r\nid: a\r\n---\r\n${body}`);
    expect(note.id).toBe("a");
    expect(note.content).toBe(body);
  });

  it("does not treat a rule after real text as frontmatter", () => {
    const note = markdownToNote(`intro\n---\nid: a\n---\n${body}`);
    expect(note.id).not.toBe("a");
    expect(note.content).toBe(`intro\n---\nid: a\n---\n${body}`);
  });
});
