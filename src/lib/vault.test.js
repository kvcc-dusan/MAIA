// @vitest-environment jsdom
//
// vault.js is the disk I/O boundary for the Tauri build — previously
// entirely untested (STATE_OF_MAIA.md flagged this as the top data-loss
// risk in the repo). It dynamically imports @tauri-apps/plugin-fs /
// plugin-dialog, so we mock a tiny in-memory filesystem behind those
// module specifiers rather than touching real disk.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { noteToMarkdown } from "./noteFile.js";

let fsState;

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn((dir) => {
    const prefix = dir + "/";
    const children = new Map();
    for (const p of Object.keys(fsState.files)) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      const [first, ...tail] = rest.split("/");
      children.set(first, tail.length > 0);
    }
    for (const d of fsState.dirs ?? []) {
      if (!d.startsWith(prefix)) continue;
      const [first, ...tail] = d.slice(prefix.length).split("/");
      children.set(first, true);
      if (tail.length === 0) continue;
    }
    return Promise.resolve(
      [...children].map(([name, isDir]) => ({ name, isFile: !isDir, isDirectory: isDir }))
    );
  }),
  mkdir: vi.fn((path) => {
    (fsState.dirs ??= new Set()).add(path);
    return Promise.resolve();
  }),
  stat: vi.fn(() => Promise.resolve({ mtime: new Date("2025-05-05T00:00:00.000Z") })),
  readTextFile: vi.fn((path) => {
    if (!(path in fsState.files)) return Promise.reject(new Error(`ENOENT: ${path}`));
    return Promise.resolve(fsState.files[path]);
  }),
  writeTextFile: vi.fn((path, content) => {
    fsState.files[path] = content;
    return Promise.resolve();
  }),
  remove: vi.fn((path) => {
    delete fsState.files[path];
    return Promise.resolve();
  }),
  exists: vi.fn((path) => Promise.resolve(path in fsState.files || (fsState.dirs?.has(path) ?? false))),
  watchImmediate: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(() => Promise.resolve("/mock/vault")),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

const VAULT = "/mock/vault";

// Re-imported fresh per test file run; vault.js keeps module-level
// fileMap/contentMap state, so each test drives it through loadNotes first
// to establish a known baseline rather than reaching into internals.
const importVault = () => import("./vault.js");

describe("vault.js", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set() };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loadNotes reads every .md file in the vault into a note", async () => {
    const { loadNotes } = await importVault();
    fsState.files[`${VAULT}/one.md`] = noteToMarkdown({
      id: "n1", title: "One", content: "hello", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    fsState.files[`${VAULT}/two.md`] = noteToMarkdown({
      id: "n2", title: "Two", content: "world", tags: [], links: [], projectIds: [], createdAt: "2026-01-02T00:00:00.000Z",
    });

    const notes = await loadNotes(VAULT);

    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.id).sort()).toEqual(["n1", "n2"]);
    expect(notes.find((n) => n.id === "n1").content).toBe("hello");
  });

  it("skips non-markdown files", async () => {
    const { loadNotes } = await importVault();
    fsState.files[`${VAULT}/readme.txt`] = "not a note";
    fsState.files[`${VAULT}/note.md`] = noteToMarkdown({
      id: "n1", title: "Note", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });

    const notes = await loadNotes(VAULT);
    expect(notes).toHaveLength(1);
  });

  it("loadNotes ignores the Opus/ folder: only top-level files are notes", async () => {
    const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
    const { loadNotes } = await importVault();
    fsState.files[`${VAULT}/note.md`] = noteToMarkdown({
      id: "n1", title: "Note", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    fsState.files[`${VAULT}/Opus/Atlas/project.md`] = "---\nid: p1\nname: Atlas\n---\n";
    // A real readDir is not recursive: it lists Opus as a directory entry.
    readDir.mockResolvedValueOnce([
      { name: "note.md", isFile: true, isDirectory: false },
      { name: "Opus", isFile: false, isDirectory: true },
    ]);

    const notes = await loadNotes(VAULT);

    expect(notes.map((n) => n.id)).toEqual(["n1"]);
    expect(readTextFile).not.toHaveBeenCalledWith(expect.stringContaining("/Opus"));
  });

  it("reassigns a fresh id on collision instead of dropping the duplicate note", async () => {
    const { loadNotes } = await importVault();
    const dup = noteToMarkdown({
      id: "same-id", title: "First", content: "a", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    const dup2 = noteToMarkdown({
      id: "same-id", title: "Second", content: "b", tags: [], links: [], projectIds: [], createdAt: "2026-01-02T00:00:00.000Z",
    });
    fsState.files[`${VAULT}/a.md`] = dup;
    fsState.files[`${VAULT}/b.md`] = dup2;

    const notes = await loadNotes(VAULT);

    // Both notes survive — previously the second file silently overwrote
    // the first in the id→filename map and one note vanished from the list.
    expect(notes).toHaveLength(2);
    const ids = new Set(notes.map((n) => n.id));
    expect(ids.size).toBe(2);
  });

  it("pickVaultFolder grants runtime fs scope for the picked path (least-privilege: fs:scope in capabilities/default.json no longer covers $HOME/**)", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { pickVaultFolder } = await importVault();

    const picked = await pickVaultFolder();

    expect(picked).toBe(VAULT);
    expect(invoke).toHaveBeenCalledWith("allow_vault_scope", { path: VAULT });
  });

  it("pickVaultFolder returns null and skips the scope grant when the dialog is dismissed", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    open.mockResolvedValueOnce(null);

    const { pickVaultFolder } = await importVault();
    const picked = await pickVaultFolder();

    expect(picked).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("saveNote writes a new file and updates it on subsequent saves", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT); // establish baseline (empty vault)

    const note = { id: "n1", title: "Draft", content: "v1", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    await saveNote(VAULT, note);
    const path = Object.keys(fsState.files)[0];
    expect(fsState.files[path]).toContain("v1");

    await saveNote(VAULT, { ...note, content: "v2" });
    expect(Object.keys(fsState.files)).toHaveLength(1); // same file, not a duplicate
    expect(fsState.files[path]).toContain("v2");
  });

  it("saveNote renames the file when the title changes", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT);

    const note = { id: "n1", title: "Old Title", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    await saveNote(VAULT, note);
    expect(Object.keys(fsState.files)).toHaveLength(1);

    await saveNote(VAULT, { ...note, title: "New Title" });
    expect(Object.keys(fsState.files)).toHaveLength(1); // old file removed, not left behind
    expect(Object.values(fsState.files)[0]).toContain("New Title");
  });

  it("saveNote throws VaultConflictError when the file changed on disk since it was last read, without touching it", async () => {
    const { loadNotes, saveNote, VaultConflictError } = await importVault();

    fsState.files[`${VAULT}/note.md`] = noteToMarkdown({
      id: "n1", title: "Shared", content: "original", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    await loadNotes(VAULT); // baseline = "original"

    // Someone/something else edits the file on disk after our load.
    const externalEdit = noteToMarkdown({
      id: "n1", title: "Shared", content: "edited externally", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    fsState.files[`${VAULT}/note.md`] = externalEdit;

    const ourEdit = { id: "n1", title: "Shared", content: "edited locally", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };

    await expect(saveNote(VAULT, ourEdit)).rejects.toBeInstanceOf(VaultConflictError);
    // The disk file must be untouched — the whole point is not to clobber it.
    expect(fsState.files[`${VAULT}/note.md`]).toBe(externalEdit);
  });

  it("saveNote does NOT throw when disk content matches what we're about to write anyway", async () => {
    const { loadNotes, saveNote } = await importVault();
    const md = noteToMarkdown({
      id: "n1", title: "Same", content: "same content", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    fsState.files[`${VAULT}/note.md`] = md;
    await loadNotes(VAULT);

    // Simulate an external write that happens to produce byte-identical
    // content (e.g. a no-op resave by another tool) — not a real conflict.
    fsState.files[`${VAULT}/note.md`] = md;

    await expect(
      saveNote(VAULT, { id: "n1", title: "Same", content: "same content", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" })
    ).resolves.not.toThrow();
  });

  it("saveNote does not rewrite a file whose text and path would not change", async () => {
    const { loadNotes, saveNote } = await importVault();
    const note = { id: "n1", title: "Same", content: "same content", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    fsState.files[`${VAULT}/same.md`] = noteToMarkdown(note);
    await loadNotes(VAULT);
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    writeTextFile.mockClear();

    await saveNote(VAULT, note); // opening a note saves it with unchanged text
    expect(writeTextFile).not.toHaveBeenCalled();

    await saveNote(VAULT, { ...note, content: "changed" });
    expect(writeTextFile).toHaveBeenCalledTimes(1);
  });

  it("deleteNoteFile removes the file and forgets it", async () => {
    const { loadNotes, saveNote, deleteNoteFile } = await importVault();
    await loadNotes(VAULT);
    const note = { id: "n1", title: "Gone Soon", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    await saveNote(VAULT, note);
    expect(Object.keys(fsState.files)).toHaveLength(1);

    await deleteNoteFile(VAULT, "n1");
    expect(Object.keys(fsState.files)).toHaveLength(0);
  });
});

const md = (over = {}) => noteToMarkdown({
  id: "n1", title: "Note", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", ...over,
});

describe("vault.js nested folders", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set() };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads notes recursively with folder, skipping dot, node_modules, root Opus and _backups", async () => {
    const { loadVault } = await importVault();
    fsState.files[`${VAULT}/root.md`] = md({ id: "r" });
    fsState.files[`${VAULT}/Omnis/PROJECTS/x.md`] = md({ id: "x" });
    fsState.files[`${VAULT}/Omnis/Opus/keep.md`] = md({ id: "k" }); // Opus is only reserved at the root
    fsState.files[`${VAULT}/Opus/Atlas/project.md`] = "---\nid: p\n---\n";
    fsState.files[`${VAULT}/_backups/b.md`] = md({ id: "b" });
    fsState.files[`${VAULT}/.obsidian/c.md`] = md({ id: "o" });
    fsState.files[`${VAULT}/A/.trash/t.md`] = md({ id: "t" });
    fsState.files[`${VAULT}/node_modules/m/n.md`] = md({ id: "m" });
    fsState.files[`${VAULT}/Omnis/data.json`] = "{}";
    fsState.dirs.add(`${VAULT}/Empty/Deeper`);

    const { notes, folders } = await loadVault(VAULT);

    expect(Object.fromEntries(notes.map((n) => [n.id, n.folder]))).toEqual({ r: "", x: "Omnis/PROJECTS", k: "Omnis/Opus" });
    expect(folders).toEqual(["A", "Empty", "Empty/Deeper", "Omnis", "Omnis/Opus", "Omnis/PROJECTS"]);
  });

  it("never writes while loading and gives id-less files the same id on every load", async () => {
    const { writeTextFile, remove, mkdir } = await import("@tauri-apps/plugin-fs");
    const { loadNotes } = await importVault();
    fsState.files[`${VAULT}/Areas/Foreign.md`] = "# just obsidian\nno frontmatter";
    fsState.files[`${VAULT}/Other/Foreign.md`] = "same name, other folder";

    const first = await loadNotes(VAULT);
    const second = await loadNotes(VAULT);

    expect(writeTextFile).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
    expect(first.map((n) => n.id).sort()).toEqual(second.map((n) => n.id).sort());
    expect(new Set(first.map((n) => n.id)).size).toBe(2);
    // file time, not "now", so the order is stable too
    expect(first[0].createdAt).toBe("2025-05-05T00:00:00.000Z");
  });

  it("saving an id-less note keeps the file exactly as it was apart from the body", async () => {
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/Areas/Design System.md`] = "---\naliases: [ds]\n---\nbody";
    const [note] = await loadNotes(VAULT);

    await saveNote(VAULT, { ...note, content: "edited" });

    // No id, title, tags, projectIds or createdAt are added to a foreign note
    expect(fsState.files[`${VAULT}/Areas/Design System.md`]).toBe("---\naliases: [ds]\n---\nedited");
    expect(Object.keys(fsState.files)).toHaveLength(1);
  });

  it("saving a body-only edit of a note with no frontmatter writes no frontmatter", async () => {
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/Plain.md`] = "# Plain\n\nbody";
    const [note] = await loadNotes(VAULT);

    await saveNote(VAULT, { ...note, content: "# Plain\n\nbody more", links: [], wordCount: 3 });

    expect(fsState.files[`${VAULT}/Plain.md`]).toBe("# Plain\n\nbody more");
  });

  it("creates a note in a folder, making the folder first", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT);
    await saveNote(VAULT, { id: "n1", title: "Plan", content: "x", folder: "Omnis/PROJECTS", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" });
    expect(Object.keys(fsState.files)).toEqual([`${VAULT}/Omnis/PROJECTS/plan.md`]);
    expect(fsState.dirs.has(`${VAULT}/Omnis/PROJECTS`)).toBe(true);
  });

  it("moves a note: writes the new path first, then removes the old file", async () => {
    const { writeTextFile, remove } = await import("@tauri-apps/plugin-fs");
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/a/Plan.md`] = md({ id: "n1", title: "Plan" });
    const [note] = await loadNotes(VAULT);

    await saveNote(VAULT, { ...note, folder: "b/c" });

    expect(Object.keys(fsState.files)).toEqual([`${VAULT}/b/c/Plan.md`]);
    expect(writeTextFile.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
  });

  it("a failed write at the new path leaves the old file alone", async () => {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/a/Plan.md`] = md({ id: "n1", title: "Plan" });
    const [note] = await loadNotes(VAULT);
    writeTextFile.mockRejectedValueOnce(new Error("disk full"));

    await expect(saveNote(VAULT, { ...note, folder: "b" })).rejects.toThrow("disk full");
    expect(Object.keys(fsState.files)).toEqual([`${VAULT}/a/Plan.md`]);
  });

  it("moving into a folder that has the same filename gets a unique name", async () => {
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/a/Plan.md`] = md({ id: "n1", title: "Plan" });
    fsState.files[`${VAULT}/b/Plan.md`] = md({ id: "n2", title: "Plan" });
    const notes = await loadNotes(VAULT);
    const n1 = notes.find((n) => n.id === "n1");

    await saveNote(VAULT, { ...n1, folder: "b" });

    expect(Object.keys(fsState.files).sort()).toEqual([`${VAULT}/b/Plan-2.md`, `${VAULT}/b/Plan.md`]);
    expect(fsState.files[`${VAULT}/b/Plan.md`]).toContain("id: n2");
  });

  it("allows the same filename in different folders", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT);
    const base = { content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", title: "Idea" };
    await saveNote(VAULT, { ...base, id: "a", folder: "One" });
    await saveNote(VAULT, { ...base, id: "b", folder: "Two" });
    expect(Object.keys(fsState.files).sort()).toEqual([`${VAULT}/One/idea.md`, `${VAULT}/Two/idea.md`]);
  });

  it("renames within the folder when the title changes", async () => {
    const { loadNotes, saveNote } = await importVault();
    fsState.files[`${VAULT}/a/Old.md`] = md({ id: "n1", title: "Old" });
    const [note] = await loadNotes(VAULT);
    await saveNote(VAULT, { ...note, title: "New Title" });
    expect(Object.keys(fsState.files)).toEqual([`${VAULT}/a/new-title.md`]);
  });

  it("does not overwrite a file that appeared on disk after the last load", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT);
    fsState.files[`${VAULT}/idea.md`] = "someone else's note";
    await saveNote(VAULT, { id: "n1", title: "Idea", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" });
    expect(fsState.files[`${VAULT}/idea.md`]).toBe("someone else's note");
    expect(fsState.files[`${VAULT}/idea-2.md`]).toContain("id: n1");
  });

  it("conflict check and delete work on nested paths", async () => {
    const { loadNotes, saveNote, deleteNoteFile, VaultConflictError } = await importVault();
    fsState.files[`${VAULT}/a/b/n.md`] = md({ id: "n1", title: "n" });
    const [note] = await loadNotes(VAULT);
    fsState.files[`${VAULT}/a/b/n.md`] = md({ id: "n1", title: "n", content: "external" });
    await expect(saveNote(VAULT, { ...note, content: "mine" })).rejects.toBeInstanceOf(VaultConflictError);
    fsState.files[`${VAULT}/a/b/n.md`] = md({ id: "n1", title: "n" });
    await deleteNoteFile(VAULT, "n1");
    expect(Object.keys(fsState.files)).toHaveLength(0);
  });

  it("createFolder makes the folder and rejects unsafe paths", async () => {
    const { createFolder } = await importVault();
    await expect(createFolder(VAULT, "Omnis/New")).resolves.toBe("Omnis/New");
    expect(fsState.dirs.has(`${VAULT}/Omnis/New`)).toBe(true);
    for (const bad of ["", "..", "a/../b", "/abs", "a//b", "a/", ".hidden", "a/.git", "a/b:c", "a\\b", "Opus", "opus/x", "_backups", "node_modules/x", "a/ b"]) {
      await expect(createFolder(VAULT, bad), bad).rejects.toThrow();
    }
    expect(fsState.dirs.size).toBe(1);
  });

  it("saveNote refuses a folder that escapes the vault", async () => {
    const { loadNotes, saveNote } = await importVault();
    await loadNotes(VAULT);
    await expect(saveNote(VAULT, { id: "n1", title: "x", content: "", folder: "../out" })).rejects.toThrow();
    expect(Object.keys(fsState.files)).toHaveLength(0);
  });
});

describe("vault.js watcher", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set() };
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const start = async () => {
    const { watchImmediate } = await import("@tauri-apps/plugin-fs");
    const vault = await importVault();
    const onChange = vi.fn();
    await vault.watchVault(VAULT, onChange, { debounceMs: 10 });
    const [, handler, options] = watchImmediate.mock.calls[0];
    const fire = async (...paths) => {
      handler({ paths });
      await vi.advanceTimersByTimeAsync(50);
    };
    return { vault, onChange, fire, options };
  };

  it("watches recursively and reloads on an outside edit in a subfolder", async () => {
    const { vault, onChange, fire, options } = await start();
    fsState.files[`${VAULT}/a/n.md`] = md({ id: "n1" });
    await vault.loadNotes(VAULT);
    expect(options).toEqual({ recursive: true });
    fsState.files[`${VAULT}/a/n.md`] = md({ id: "n1", content: "external" });
    await fire(`${VAULT}/a/n.md`);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores Opus/, dot folders, node_modules and non-markdown files", async () => {
    const { onChange, fire } = await start();
    await fire(`${VAULT}/Opus/P/tasks/t.md`, `${VAULT}/.obsidian/workspace.md`, `${VAULT}/node_modules/x/y.md`, `${VAULT}/a/n.md.tmp`);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores the echo of its own save and its own delete", async () => {
    const { vault, onChange, fire } = await start();
    await vault.loadNotes(VAULT);
    await vault.saveNote(VAULT, { id: "n1", title: "Mine", content: "x", folder: "a", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" });
    await fire(`${VAULT}/a/mine.md`);
    expect(onChange).not.toHaveBeenCalled();
    await vault.deleteNoteFile(VAULT, "n1");
    await fire(`${VAULT}/a/mine.md`);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("vault.js recent vaults", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("returns an empty list when nothing is stored", async () => {
    const { getRecentVaults } = await importVault();
    expect(getRecentVaults()).toEqual([]);
  });

  it("puts the newest first and dedupes a repeated path", async () => {
    const { pushRecentVault, getRecentVaults } = await importVault();
    pushRecentVault("/a");
    pushRecentVault("/b");
    pushRecentVault("/a");
    expect(getRecentVaults()).toEqual(["/a", "/b"]);
  });

  it("caps the list at five, dropping the oldest", async () => {
    const { pushRecentVault, getRecentVaults, MAX_RECENT_VAULTS } = await importVault();
    for (let i = 1; i <= 7; i++) pushRecentVault(`/v${i}`);
    const list = getRecentVaults();
    expect(list).toHaveLength(MAX_RECENT_VAULTS);
    expect(list[0]).toBe("/v7");
    expect(list).not.toContain("/v1");
  });

  it("ignores empty and non-string paths", async () => {
    const { pushRecentVault, getRecentVaults } = await importVault();
    pushRecentVault("");
    pushRecentVault("   ");
    pushRecentVault(null);
    expect(getRecentVaults()).toEqual([]);
  });

  it("survives corrupt or malformed storage", async () => {
    const { getRecentVaults } = await importVault();
    localStorage.setItem("maia.recentVaults", "{not json");
    expect(getRecentVaults()).toEqual([]);
    localStorage.setItem("maia.recentVaults", JSON.stringify({ a: 1 }));
    expect(getRecentVaults()).toEqual([]);
    localStorage.setItem("maia.recentVaults", JSON.stringify(["/ok", 5, "", null, "/ok", "/two"]));
    expect(getRecentVaults()).toEqual(["/ok", "/two"]);
  });

  it("vaultName gives the last path segment", async () => {
    const { vaultName } = await importVault();
    expect(vaultName("/Users/me/Notes")).toBe("Notes");
    expect(vaultName("/Users/me/Notes/")).toBe("Notes");
    expect(vaultName("C:\\Users\\me\\Vault")).toBe("Vault");
  });

  it("probeVault rejects when the folder can't be listed and resolves otherwise", async () => {
    const { readDir } = await import("@tauri-apps/plugin-fs");
    const { probeVault } = await importVault();
    await expect(probeVault("/mock/vault")).resolves.toBeUndefined();
    readDir.mockRejectedValueOnce(new Error("ENOENT"));
    await expect(probeVault("/gone")).rejects.toThrow("ENOENT");
  });
});
