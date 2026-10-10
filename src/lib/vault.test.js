// @vitest-environment jsdom
//
// vault.js is the disk I/O boundary for the Tauri build — previously
// entirely untested (STATE_OF_MAIA.md flagged this as the top data-loss
// risk in the repo). It dynamically imports @tauri-apps/plugin-fs /
// plugin-dialog, so we mock a tiny in-memory filesystem behind those
// module specifiers rather than touching real disk.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { noteToMarkdown } from "./noteFile.js";

let fsState;

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn((dir) => {
    const names = Object.keys(fsState.files).filter((p) => p.startsWith(dir + "/"));
    return Promise.resolve(
      names.map((p) => ({ name: p.slice(dir.length + 1), isFile: true }))
    );
  }),
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
  exists: vi.fn((path) => Promise.resolve(path in fsState.files)),
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
    fsState = { files: {} };
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
