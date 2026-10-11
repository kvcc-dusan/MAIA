// @vitest-environment jsdom
//
// Incremental vault reloads (mtime+size cache) and the save-path hardening that came
// with them. The fs is an in-memory mock with real mtimes and sizes; `caseInsensitive`
// makes it behave like default macOS.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { noteToMarkdown } from "./noteFile.js";

let fsState;
const key = (p) => (fsState.caseInsensitive ? p.toLowerCase() : p);
const find = (p) => Object.keys(fsState.files).find((k) => key(k) === key(p));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn((dir) => {
    const prefix = dir + "/";
    const children = new Map();
    for (const p of Object.keys(fsState.files)) {
      if (!p.startsWith(prefix)) continue;
      const [first, ...tail] = p.slice(prefix.length).split("/");
      children.set(first, tail.length > 0);
    }
    for (const d of fsState.dirs) {
      if (d.startsWith(prefix)) children.set(d.slice(prefix.length).split("/")[0], true);
    }
    return Promise.resolve([...children].map(([name, isDir]) => ({ name, isFile: !isDir, isDirectory: isDir })));
  }),
  mkdir: vi.fn((path) => {
    fsState.dirs.add(path);
    return Promise.resolve();
  }),
  stat: vi.fn((path) => {
    if (fsState.statFails) return Promise.reject(new Error("stat failed"));
    const real = find(path);
    if (real === undefined) return Promise.reject(new Error(`ENOENT: ${path}`));
    return Promise.resolve({ mtime: new Date(fsState.mtimes[real] ?? OLD), size: new TextEncoder().encode(fsState.files[real]).length });
  }),
  readTextFile: vi.fn((path) => {
    const real = find(path);
    return real === undefined ? Promise.reject(new Error(`ENOENT: ${path}`)) : Promise.resolve(fsState.files[real]);
  }),
  writeTextFile: vi.fn((path, content) => {
    const real = find(path) ?? path;
    fsState.files[real] = content;
    fsState.mtimes[real] = Date.now(); // a write really does move mtime
    return Promise.resolve();
  }),
  rename: vi.fn((from, to) => {
    const real = find(from);
    if (real === undefined) return Promise.reject(new Error(`ENOENT: ${from}`));
    fsState.files[find(to) ?? to] = fsState.files[real];
    fsState.mtimes[to] = Date.now();
    delete fsState.files[real];
    return Promise.resolve();
  }),
  remove: vi.fn((path) => {
    const real = find(path);
    if (real !== undefined) delete fsState.files[real];
    return Promise.resolve();
  }),
  exists: vi.fn((path) => Promise.resolve(find(path) !== undefined || fsState.dirs.has(path))),
  watchImmediate: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const VAULT = "/mock/vault";
const OLD = new Date("2025-01-01T00:00:00.000Z").getTime();
const md = (over = {}) => noteToMarkdown({
  id: "n1", title: "Note", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", ...over,
});
const base = { content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };

const setup = async () => {
  const fs = await import("@tauri-apps/plugin-fs");
  const vault = await import("./vault.js");
  return { fs, ...vault };
};
const setFile = (rel, text, mtime) => {
  fsState.files[`${VAULT}/${rel}`] = text;
  if (mtime !== undefined) fsState.mtimes[`${VAULT}/${rel}`] = mtime;
};

describe("vault.js incremental loads", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set(), mtimes: {}, caseInsensitive: false, statFails: false };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reads every file once, then none while nothing changed (stat only)", async () => {
    const { fs, loadVault } = await setup();
    for (let i = 0; i < 20; i += 1) setFile(`f${i % 3}/n${i}.md`, md({ id: `n${i}`, title: `T${i}` }));

    const first = await loadVault(VAULT);
    expect(first.stats).toMatchObject({ files: 20, reads: 20 });
    expect(fs.readTextFile).toHaveBeenCalledTimes(20);

    fs.readTextFile.mockClear();
    fs.stat.mockClear();
    const second = await loadVault(VAULT);
    expect(fs.readTextFile).not.toHaveBeenCalled();
    expect(fs.stat).toHaveBeenCalledTimes(20);
    expect(second.stats).toMatchObject({ files: 20, reads: 0, reused: 20 });
    expect(second.notes.map((n) => n.id)).toEqual(first.notes.map((n) => n.id));
    // untouched notes are the same objects, so state does not re-render
    expect(second.notes.every((n, i) => n === first.notes[i])).toBe(true);
  });

  it("re-reads only the file whose mtime changed", async () => {
    const { fs, loadVault } = await setup();
    setFile("a.md", md({ id: "a" }));
    setFile("b.md", md({ id: "b" }));
    await loadVault(VAULT);
    fs.readTextFile.mockClear();

    setFile("a.md", md({ id: "a", content: "same length?" }), OLD + 5000);
    const { notes } = await loadVault(VAULT);
    expect(fs.readTextFile).toHaveBeenCalledTimes(1);
    expect(fs.readTextFile).toHaveBeenCalledWith(`${VAULT}/a.md`);
    expect(notes.find((n) => n.id === "a").content).toBe("same length?");
  });

  it("re-reads when mtime went backwards, and when size differs at an equal mtime", async () => {
    const { fs, loadVault } = await setup();
    setFile("a.md", md({ id: "a", content: "one" }), OLD + 9000);
    setFile("b.md", md({ id: "b", content: "one" }), OLD + 9000);
    await loadVault(VAULT);
    fs.readTextFile.mockClear();

    setFile("a.md", md({ id: "a", content: "two" }), OLD + 1000); // older mtime (cloud drive restore)
    setFile("b.md", md({ id: "b", content: "longer content" }), OLD + 9000); // same mtime, other size
    const { notes } = await loadVault(VAULT);
    expect(fs.readTextFile).toHaveBeenCalledTimes(2);
    expect(notes.find((n) => n.id === "a").content).toBe("two");
    expect(notes.find((n) => n.id === "b").content).toBe("longer content");
  });

  it("limitation: same mtime and same size is not re-read, but a save still detects the outside edit", async () => {
    const { loadVault, saveNote, VaultConflictError } = await setup();
    setFile("a.md", md({ id: "a", content: "aaa" }));
    const first = await loadVault(VAULT);
    setFile("a.md", md({ id: "a", content: "bbb" })); // same length, mtime untouched
    const second = await loadVault(VAULT);
    expect(second.notes[0].content).toBe("aaa"); // stale view: documented
    await expect(saveNote(VAULT, { ...first.notes[0], content: "mine" })).rejects.toBeInstanceOf(VaultConflictError);
  });

  it("never trusts a file modified within the last 2 seconds", async () => {
    const { fs, loadVault } = await setup();
    setFile("a.md", md({ id: "a" }), Date.now());
    await loadVault(VAULT);
    fs.readTextFile.mockClear();
    await loadVault(VAULT);
    expect(fs.readTextFile).toHaveBeenCalledTimes(1);
  });

  it("falls back to a real read when stat fails, and serves no stale text", async () => {
    const { fs, loadVault } = await setup();
    setFile("a.md", md({ id: "a", content: "old" }));
    await loadVault(VAULT);
    fs.readTextFile.mockClear();

    fsState.statFails = true;
    setFile("a.md", md({ id: "a", content: "changed while stat is broken" }));
    const { notes } = await loadVault(VAULT);
    expect(fs.readTextFile).toHaveBeenCalledTimes(1);
    expect(notes[0].content).toBe("changed while stat is broken");
    expect(notes[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("an id-less file with a broken stat gets the epoch time, as before", async () => {
    const { loadVault } = await setup();
    setFile("plain.md", "no frontmatter");
    fsState.statFails = true;
    const { notes } = await loadVault(VAULT);
    expect(notes[0].createdAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("an external edit between loads is a conflict on save, with the edit untouched", async () => {
    const { loadVault, saveNote, VaultConflictError } = await setup();
    setFile("n.md", md({ id: "n1", content: "original" }));
    const { notes } = await loadVault(VAULT);
    await loadVault(VAULT); // cached reload

    const external = md({ id: "n1", content: "edited externally" });
    setFile("n.md", external, OLD + 7000);
    await expect(saveNote(VAULT, { ...notes[0], content: "mine" })).rejects.toBeInstanceOf(VaultConflictError);
    expect(fsState.files[`${VAULT}/n.md`]).toBe(external);
  });

  it("a note with unsaved edits keeps its old baseline across a reload, so the outside edit still conflicts", async () => {
    const { loadVault, saveNote, VaultConflictError } = await setup();
    setFile("n.md", md({ id: "n1", content: "original" }));
    const { notes } = await loadVault(VAULT);

    const external = md({ id: "n1", content: "edited externally" });
    setFile("n.md", external, OLD + 7000);
    const dirty = new Set(["n1"]);
    await loadVault(VAULT, { keepBaselines: dirty });

    await expect(saveNote(VAULT, { ...notes[0], content: "mine" })).rejects.toBeInstanceOf(VaultConflictError);
    expect(fsState.files[`${VAULT}/n.md`]).toBe(external);
  });

  it("without keepBaselines a reload adopts the outside edit as the new baseline (clean notes)", async () => {
    const { loadVault, saveNote } = await setup();
    setFile("n.md", md({ id: "n1", content: "original" }));
    await loadVault(VAULT);
    setFile("n.md", md({ id: "n1", content: "edited externally" }), OLD + 7000);
    const { notes } = await loadVault(VAULT);
    await expect(saveNote(VAULT, { ...notes[0], content: "next" })).resolves.toBeUndefined();
  });

  it("picks up added files, drops deleted ones, and keeps the folder list right", async () => {
    const { fs, loadVault } = await setup();
    setFile("a/x.md", md({ id: "x" }));
    setFile("b/y.md", md({ id: "y" }));
    await loadVault(VAULT);
    fs.readTextFile.mockClear();

    delete fsState.files[`${VAULT}/b/y.md`];
    setFile("c/d/z.md", md({ id: "z" }));
    fsState.dirs.add(`${VAULT}/Empty`);
    const { notes, folders, stats } = await loadVault(VAULT);

    expect(notes.map((n) => n.id).sort()).toEqual(["x", "z"]);
    expect(folders).toEqual(["a", "c", "c/d", "Empty"]);
    expect(stats).toMatchObject({ files: 2, reads: 1, reused: 1 });
  });

  it("a deleted-then-recreated path with another id is read again", async () => {
    const { loadVault } = await setup();
    setFile("n.md", md({ id: "old" }), OLD);
    await loadVault(VAULT);
    setFile("n.md", md({ id: "new" }), OLD + 3000);
    const { notes } = await loadVault(VAULT);
    expect(notes.map((n) => n.id)).toEqual(["new"]);
  });

  it("duplicate ids and id-less files keep the same ids on cached reloads", async () => {
    const { fs, loadVault } = await setup();
    setFile("a.md", md({ id: "same", title: "First" }));
    setFile("b.md", md({ id: "same", title: "Second" }));
    setFile("Areas/Plain.md", "# no id");
    setFile("Other/Plain.md", "# no id either");
    const first = await loadVault(VAULT);
    fs.readTextFile.mockClear();
    const second = await loadVault(VAULT);

    expect(fs.readTextFile).not.toHaveBeenCalled();
    expect(new Set(first.notes.map((n) => n.id)).size).toBe(4);
    expect(second.notes.map((n) => n.id)).toEqual(first.notes.map((n) => n.id));
  });

  it("a duplicate whose partner is deleted gets its own id back on the next load", async () => {
    const { loadVault } = await setup();
    setFile("a.md", md({ id: "same", title: "First" }));
    setFile("b.md", md({ id: "same", title: "Second" }));
    await loadVault(VAULT);
    delete fsState.files[`${VAULT}/a.md`];
    const { notes } = await loadVault(VAULT);
    expect(notes.map((n) => [n.title, n.id])).toEqual([["Second", "same"]]);
  });

  it("an unreadable file stays unreadable (its name is protected) and is retried each load", async () => {
    const { fs, loadVault, saveNote } = await setup();
    setFile("idea.md", md({ id: "x", title: "Idea" }));
    fs.readTextFile.mockRejectedValueOnce(new Error("EIO"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await loadVault(VAULT);

    await saveNote(VAULT, { ...base, id: "n2", title: "Idea" });
    expect(fsState.files[`${VAULT}/idea.md`]).toContain("id: x"); // untouched
    expect(fsState.files[`${VAULT}/idea-2.md`]).toContain("id: n2");
    const { notes } = await loadVault(VAULT);
    expect(notes.map((n) => n.id).sort()).toEqual(["n2", "x"]);
  });

  it("a save invalidates the cached stat, so the next load reads the new text", async () => {
    const { fs, loadVault, saveNote } = await setup();
    setFile("n.md", md({ id: "n1", content: "v1" }));
    const { notes } = await loadVault(VAULT);
    await saveNote(VAULT, { ...notes[0], content: "v2" });
    fs.readTextFile.mockClear();
    const reloaded = await loadVault(VAULT);
    expect(fs.readTextFile).toHaveBeenCalledTimes(1);
    expect(reloaded.notes[0].content).toBe("v2");
  });

  it("switching vaults starts with a cold cache", async () => {
    const { fs, loadVault } = await setup();
    setFile("n.md", md({ id: "n1" }));
    fsState.files["/other/n.md"] = md({ id: "o1" });
    await loadVault(VAULT);
    fs.readTextFile.mockClear();
    const { notes } = await loadVault("/other");
    expect(fs.readTextFile).toHaveBeenCalledTimes(1);
    expect(notes.map((n) => n.id)).toEqual(["o1"]);
  });

  it("a rename that lands in the middle of a load is not seen half-done", async () => {
    const { fs, loadVault, saveNote } = await setup();
    setFile("old-title.md", md({ id: "n1", title: "Old title" }));
    const { notes } = await loadVault(VAULT);

    // The folder listing is taken first; the rename then finishes before the files are read.
    const listing = await fs.readDir(VAULT);
    fs.readDir.mockImplementationOnce(async () => {
      await saveNote(VAULT, { ...notes[0], title: "New title" });
      return listing;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loadVault(VAULT);

    expect(result.notes.map((n) => [n.id, n.title])).toEqual([["n1", "New title"]]);
    // The map points at the new file, so the next save edits it instead of cloning it.
    await saveNote(VAULT, { ...result.notes[0], content: "later" });
    expect(Object.keys(fsState.files)).toEqual([`${VAULT}/new-title.md`]);
  });
});

describe("vault.js save hardening", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set(), mtimes: {}, caseInsensitive: false, statFails: false };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("a title starting with a dot still produces a file the loader will find again", async () => {
    const { loadVault, saveNote } = await setup();
    await loadVault(VAULT);
    await saveNote(VAULT, { ...base, id: "n1", title: ".env notes" });
    await saveNote(VAULT, { ...base, id: "n2", title: "..." });
    const names = Object.keys(fsState.files).map((p) => p.split("/").pop());
    expect(names.every((n) => !n.startsWith("."))).toBe(true);
    const { notes } = await loadVault(VAULT);
    expect(notes.map((n) => n.id).sort()).toEqual(["n1", "n2"]);
  });

  it("titles with characters illegal in file names are slugged to a valid name", async () => {
    const { loadVault, saveNote } = await setup();
    await loadVault(VAULT);
    await saveNote(VAULT, { ...base, id: "n1", title: 'a/b\\c:d*e?f"g<h>i|j#k^l[m]n' });
    const [name] = Object.keys(fsState.files).map((p) => p.slice(VAULT.length + 1));
    expect(name).not.toMatch(/[/\\:*?"<>|#^[\]]/);
    expect(name.endsWith(".md")).toBe(true);
  });

  it("two titles that slug to the same name in one folder get separate files", async () => {
    const { loadVault, saveNote } = await setup();
    await loadVault(VAULT);
    await saveNote(VAULT, { ...base, id: "a", title: "Q&A: Plan?" });
    await saveNote(VAULT, { ...base, id: "b", title: "q&a plan" });
    await saveNote(VAULT, { ...base, id: "c", title: "Q&A / Plan" });
    expect(Object.keys(fsState.files)).toHaveLength(3);
    const { notes } = await loadVault(VAULT);
    expect(notes).toHaveLength(3);
  });

  it("moving between folders that differ only by case does not delete the note", async () => {
    fsState.caseInsensitive = true;
    const { loadVault, saveNote } = await setup();
    setFile("Omnis/PROJECTS/Plan.md", md({ id: "n1", title: "Plan" }));
    const { notes } = await loadVault(VAULT);

    await saveNote(VAULT, { ...notes[0], folder: "Omnis/projects", content: "moved" });

    expect(Object.keys(fsState.files)).toHaveLength(1);
    expect(Object.values(fsState.files)[0]).toContain("moved");
  });

  it("a failed removal after a rename leaves both files, never loses the note, and later saves target the new one", async () => {
    const { fs, loadVault, saveNote } = await setup();
    setFile("old.md", md({ id: "n1", title: "Old" }));
    const { notes } = await loadVault(VAULT);
    fs.remove.mockRejectedValueOnce(new Error("locked"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await saveNote(VAULT, { ...notes[0], title: "Fresh" });
    expect(Object.keys(fsState.files).sort()).toEqual([`${VAULT}/fresh.md`, `${VAULT}/old.md`]);

    await saveNote(VAULT, { ...notes[0], title: "Fresh", content: "again" });
    expect(Object.keys(fsState.files).sort()).toEqual([`${VAULT}/fresh.md`, `${VAULT}/old.md`]);
    expect(fsState.files[`${VAULT}/fresh.md`]).toContain("again");
  });

  it("keeps a BOM and CRLF line endings when a note is edited and saved", async () => {
    const { loadVault, saveNote } = await setup();
    const original = `\uFEFF---\r\nid: n1\r\ntitle: "Win"\r\ncreatedAt: "2026-01-01T00:00:00.000Z"\r\n---\r\nline one\r\nline two`;
    setFile("win.md", original);
    const { notes } = await loadVault(VAULT);

    await saveNote(VAULT, { ...notes[0], content: "line one\r\nline two\r\nline three" });

    const saved = fsState.files[`${VAULT}/win.md`];
    expect(saved.startsWith("\uFEFF")).toBe(true);
    expect(saved).toContain("line three");
    expect(saved.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("a note deleted outside while still open is written back by the next save (not lost)", async () => {
    const { loadVault, saveNote } = await setup();
    setFile("n.md", md({ id: "n1", title: "Note" }));
    const { notes } = await loadVault(VAULT);
    delete fsState.files[`${VAULT}/n.md`];

    await saveNote(VAULT, { ...notes[0], content: "still typing" });
    expect(Object.values(fsState.files)).toHaveLength(1);
    expect(Object.values(fsState.files)[0]).toContain("still typing");
  });

  it("a large note round-trips through load and save unchanged", async () => {
    const { loadVault, saveNote, } = await setup();
    const big = "line of text\n".repeat(200000);
    setFile("big.md", md({ id: "n1", title: "Big", content: big }));
    const { notes } = await loadVault(VAULT);
    const before = fsState.files[`${VAULT}/big.md`];
    await saveNote(VAULT, notes[0]);
    expect(fsState.files[`${VAULT}/big.md`]).toBe(before);
  });
});
