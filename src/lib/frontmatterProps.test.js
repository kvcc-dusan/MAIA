import { describe, it, expect } from "vitest";
import { markdownToNote, noteToMarkdown } from "./noteFile.js";
import {
  readProperties, parseProperty, setFrontmatterProperty, removeFrontmatterProperty,
  renameFrontmatterProperty, validatePropertyKey, formatScalar, isFrontmatterReadable, UNSUPPORTED_HINT,
} from "./frontmatterProps.js";

const opts = { fallbackId: "f1", fallbackTitle: "Plan" };
const load = (text) => markdownToNote(text, opts);
const save = (note) => noteToMarkdown(note);
const row = (note, key) => readProperties(note).find((r) => r.key === key);

describe("type inference", () => {
  const cases = [
    ["name: Lea", { type: "text", value: "Lea" }],
    ["name:", { type: "text", value: "" }],
    ['name: "5"', { type: "text", value: "5" }],
    ["count: 12", { type: "number", value: 12 }],
    ["count: -3.5", { type: "number", value: -3.5 }],
    ["version: 007", { type: "text", value: "007" }],
    ["done: true", { type: "checkbox", value: true }],
    ["done: false", { type: "checkbox", value: false }],
    ["due: 2026-07-13", { type: "date", value: "2026-07-13" }],
    ["at: 2026-07-13T10:30", { type: "datetime", value: "2026-07-13T10:30" }],
    ["at: 2026-07-13 10:30", { type: "datetime", value: "2026-07-13T10:30" }],
    ["people: [a, b]", { type: "list", value: ["a", "b"] }],
    ['people: ["a, b", c]', { type: "list", value: ["a, b", "c"] }],
    ["people:\n  - a\n  - 'b c'", { type: "list", value: ["a", "b c"] }],
    ["people: []", { type: "list", value: [] }],
    ["tags: [#a, b]", { type: "tags", value: ["a", "b"] }],
    ["tags:\n- x\n- '#y'", { type: "tags", value: ["x", "y"] }],
    ["tags: solo", { type: "tags", value: ["solo"] }],
    ["tags:", { type: "tags", value: [] }],
    ["aliases:\n  - Standup", { type: "aliases", value: ["Standup"] }],
    ["cssclasses: wide", { type: "cssclasses", value: ["wide"] }],
    ["url: https://x.com/a?b=1", { type: "text", value: "https://x.com/a?b=1" }],
  ];
  it.each(cases)("%s", (raw, expected) => {
    const key = raw.split(":")[0];
    expect(parseProperty(key, raw)).toMatchObject({ ...expected, isEditable: true });
  });

  it.each([
    "summary: |\n  one\n  two",
    "summary: >\n  folded",
    "nested:\n  a: 1",
    "plain: one\n  two",
    "note: hi # trailing comment",
    "obj: {a: 1}",
    'q: "a" # c',
    "dup: 1\ndup: 2",
    "refs:\n  - [[Other]]",
    "refs: [[[Other]], x]",
    "tags: [a, b",
    'esc: "tab\\u0041"',
  ])("leaves %j to the file", (raw) => {
    expect(parseProperty(raw.split(":")[0], raw)).toMatchObject({ isEditable: false, hint: UNSUPPORTED_HINT });
  });
});

describe("readProperties", () => {
  it("hides MAIA keys and the title, keeps file order", () => {
    const note = load("---\nid: a\ntitle: T\nzed: 1\ntags: [x]\nprojectIds: [p]\nlinks: [l]\nworkstreamId: w\ncreatedAt: 2026-01-01\nalpha: 2\n---\nb");
    expect(readProperties(note).map((r) => r.key)).toEqual(["zed", "tags", "alpha"]);
  });

  it("shows managed fields of a MAIA note that has no file text yet", () => {
    const rows = readProperties({ id: "n", title: "T", tags: ["a"], kind: "spec", status: "draft", owner: "" });
    expect(rows.map((r) => [r.key, r.type, r.value])).toEqual([["tags", "tags", ["a"]], ["kind", "text", "spec"], ["status", "text", "draft"]]);
  });
});

describe("setFrontmatterProperty", () => {
  const base = "---\n# first\nname: Lea\ntags:\n  - a\n  - b\naliases: [x]\nweird: |\n  keep\n  me\ncount: 3\n---\n\nBody\n";

  it("rewrites only that key's lines", () => {
    const out = save(setFrontmatterProperty(load(base), "name", { type: "text", value: "Ana" }));
    expect(out).toBe(base.replace("name: Lea", "name: Ana"));
  });

  it("keeps the comment above the key", () => {
    const out = save(setFrontmatterProperty(load("---\n# why\nname: Lea\nb: 1\n---\nx"), "name", { type: "text", value: "Ana" }));
    expect(out).toBe("---\n# why\nname: Ana\nb: 1\n---\nx");
  });

  it("keeps block style when editing an existing block list, flow style for a flow list", () => {
    let note = setFrontmatterProperty(load(base), "tags", { type: "tags", value: ["a", "b", "#c"] });
    expect(save(note)).toBe(base.replace("  - b\n", "  - b\n  - c\n"));
    note = setFrontmatterProperty(load(base), "aliases", { type: "aliases", value: ["x", "y z"] });
    expect(save(note)).toBe(base.replace("aliases: [x]", "aliases: [x, y z]"));
  });

  it("keeps the dash indent of an existing block list", () => {
    const out = save(setFrontmatterProperty(load("---\nl:\n- a\n---\nx"), "l", { type: "list", value: ["a", "b"] }));
    expect(out).toBe("---\nl:\n- a\n- b\n---\nx");
  });

  it("writes new lists in block style and strips # from tags", () => {
    const out = save(setFrontmatterProperty(load("---\nname: Lea\n---\nx"), "tags", { type: "tags", value: ["#idea", "ops"] }));
    expect(out).toBe("---\nname: Lea\ntags:\n  - idea\n  - ops\n---\nx");
  });

  it("adds a property to a note without frontmatter", () => {
    const out = save(setFrontmatterProperty(load("# Hi\n"), "due", { type: "date", value: "2026-07-13" }));
    expect(out).toBe("---\ndue: 2026-07-13\n---\n# Hi\n");
  });

  it("updates the note's own fields for managed keys", () => {
    const note = setFrontmatterProperty(load("body"), "status", { type: "text", value: "draft" });
    expect(note.status).toBe("draft");
    expect(save(note)).toBe("---\nstatus: draft\n---\nbody");
    const tagged = setFrontmatterProperty(load("body"), "tags", { type: "tags", value: ["#a", "a", "b"] });
    expect(tagged.tags).toEqual(["a", "b"]);
  });

  it("does not turn a MAIA note's identity off when a property is added", () => {
    const created = { id: "n1", title: "Fresh", content: "x", tags: [], projectIds: [], createdAt: "2026-02-02T00:00:00.000Z" };
    const out = save(setFrontmatterProperty(created, "mood", { type: "text", value: "calm" }));
    expect(out).toContain("id: n1");
    expect(out).toContain("title: Fresh");
    expect(out).toContain("mood: calm");
  });

  it("round-trips every type through the file", () => {
    let note = load("body");
    const typed = {
      s: { type: "text", value: "plain" }, n: { type: "number", value: 4.5 }, c: { type: "checkbox", value: true },
      d: { type: "date", value: "2026-07-13" }, t: { type: "datetime", value: "2026-07-13T09:05" }, l: { type: "list", value: ["a", "b"] },
    };
    Object.entries(typed).forEach(([key, value]) => { note = setFrontmatterProperty(note, key, value); });
    const back = readProperties(load(save(note)));
    Object.entries(typed).forEach(([key, value]) => expect(back.find((r) => r.key === key)).toMatchObject(value));
  });

  it.each([
    "has: colon", "a #hash", "#lead", "- dash", "[bracket", "{brace", "*star", "!bang", "'q", '"dq', "  pad", "true", "null", "12", "1.5e3",
    "2026-07-13", "2026-07-13 10:00", "", "x:", "@at", "%pct", "a,b",
  ])("quotes text %j so it reads back as the same text", (value) => {
    const note = setFrontmatterProperty(load("body"), "k", { type: "text", value });
    const back = row(load(save(note)), "k");
    expect(back).toMatchObject({ type: "text", value });
  });

  it("leaves safe text unquoted", () => {
    expect(formatScalar("hello world")).toBe("hello world");
    expect(formatScalar("https://x.com/a")).toBe("https://x.com/a");
    expect(formatScalar("a, b", { isFlow: true })).toBe('"a, b"');
  });

  it("escapes quotes and backslashes", () => {
    const note = setFrontmatterProperty(load("body"), "k", { type: "text", value: 'say "hi" \\o/' });
    expect(row(load(save(note)), "k").value).toBe('say "hi" \\o/');
  });

  it("refuses multi-line values, bad numbers and bad dates", () => {
    const n = load("body");
    expect(() => setFrontmatterProperty(n, "k", { type: "text", value: "a\nb" })).toThrow();
    expect(() => setFrontmatterProperty(n, "k", { type: "number", value: NaN })).toThrow();
    expect(() => setFrontmatterProperty(n, "k", { type: "date", value: "13/07/2026" })).toThrow();
  });

  it("refuses internal keys and values it cannot represent", () => {
    expect(() => setFrontmatterProperty(load(base), "id", { type: "text", value: "x" })).toThrow();
    expect(() => setFrontmatterProperty(load(base), "weird", { type: "text", value: "x" })).toThrow(/only be edited in the file/);
  });

  it("does not mutate the note it was given", () => {
    const note = load(base);
    const snapshot = JSON.stringify(note);
    setFrontmatterProperty(note, "name", { type: "text", value: "Ana" });
    removeFrontmatterProperty(note, "name");
    renameFrontmatterProperty(note, "name", "who");
    expect(JSON.stringify(note)).toBe(snapshot);
  });
});

describe("removeFrontmatterProperty", () => {
  it("removes only that key", () => {
    const out = save(removeFrontmatterProperty(load("---\na: 1\n# c\nb:\n  - x\nc: 3\n---\nbody"), "b"));
    // the comment line sits under `a`, so it belongs to `a`
    expect(out).toBe("---\na: 1\n# c\nc: 3\n---\nbody");
  });

  it("clears a managed field and drops an empty block", () => {
    const note = removeFrontmatterProperty(load("---\ntags: [a]\n---\nbody"), "tags");
    expect(note.tags).toEqual([]);
    expect(save(note)).toBe("body");
  });

  it("keeps a MAIA note's identity lines", () => {
    const out = save(removeFrontmatterProperty({ id: "n1", title: "T", content: "x", tags: [], projectIds: [], createdAt: "2026-02-02", frontmatterExtra: { a: "a: 1" } }, "a"));
    expect(out).toContain("id: n1");
    expect(out).not.toContain("a: 1");
  });
});

describe("renameFrontmatterProperty", () => {
  it("renames in place and keeps the value and its style", () => {
    const out = save(renameFrontmatterProperty(load("---\na: 1\nold:\n  - x\n  - y\nz: 2\n---\nb"), "old", "fresh"));
    expect(out).toBe("---\na: 1\nfresh:\n  - x\n  - y\nz: 2\n---\nb");
  });

  it("refuses managed, internal and duplicate targets", () => {
    const note = load("---\nold: 1\nother: 2\ntags: [a]\n---\nb");
    expect(() => renameFrontmatterProperty(note, "old", "other")).toThrow();
    expect(() => renameFrontmatterProperty(note, "old", "id")).toThrow();
    expect(() => renameFrontmatterProperty(note, "old", "status")).toThrow();
    expect(() => renameFrontmatterProperty(note, "tags", "labels")).toThrow();
  });
});

describe("validatePropertyKey", () => {
  const note = load("---\nName: x\ntags: [a]\n---\nb");
  it.each([
    ["", "Enter a name"],
    ["a:b", /colons/],
    ["a\nb", /line breaks/],
    ["#x", /colons/],
    ["-x", /symbol/],
    ["id", /MAIA/],
    ["createdAt", /MAIA/],
    ["name", /already exists/],
    ["tags", /already exists/],
  ])("rejects %j", (key, message) => {
    expect(validatePropertyKey(note, key)).toMatch(message);
  });

  it("accepts a free name, including managed ones that are not set yet", () => {
    expect(validatePropertyKey(note, "mood")).toBeNull();
    expect(validatePropertyKey(note, "my key")).toBeNull();
    expect(validatePropertyKey(note, "status")).toBeNull();
  });
});

describe("isFrontmatterReadable", () => {
  it("is true for ordinary frontmatter and for none", () => {
    expect(isFrontmatterReadable(load("---\na: 1\nb:\n  - x\n---\nbody"))).toBe(true);
    expect(isFrontmatterReadable(load("body"))).toBe(true);
  });

  it("is false when a line is not key: value, and such a block is never rewritten", () => {
    const src = "---\na: 1\nthis is not yaml\n---\nbody";
    const note = load(src);
    expect(isFrontmatterReadable(note)).toBe(false);
    expect(save({ ...note, content: "changed" })).toBe(src.replace("body", "changed"));
  });
});

describe("removal keeps the patch merge safe", () => {
  it("leaves an empty frontmatterExtra instead of deleting it", () => {
    const note = removeFrontmatterProperty(load("---\na: 1\n---\nbody"), "a");
    expect(note.frontmatterExtra).toEqual({});
    // what DataContext.updateNote does with the stored note
    expect({ ...load("---\na: 1\n---\nbody"), ...note }.frontmatterExtra).toEqual({});
  });
});
