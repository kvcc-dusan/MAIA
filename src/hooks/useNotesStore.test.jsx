// @vitest-environment jsdom
//
// useNotesStore's Tauri branch (useVaultNotes) is the state layer sitting on
// top of vault.js — untested before (STATE_OF_MAIA.md). These tests mock
// vault.js entirely so the conflict-handling and deleted-file-detection
// logic can be exercised deterministically, independent of real fs timing.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const vaultMocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  getVaultPath: vi.fn(() => "/mock/vault"),
  setVaultPath: vi.fn(),
  probeVault: vi.fn(() => Promise.resolve()),
  loadNotes: vi.fn(),
  saveNote: vi.fn(),
  deleteNoteFile: vi.fn(),
  watchVault: vi.fn(() => Promise.resolve(() => {})),
}));

class MockVaultConflictError extends Error {
  constructor(id, { diskText, attemptedText, filename }) {
    super("conflict");
    this.name = "VaultConflictError";
    this.noteId = id;
    this.diskText = diskText;
    this.attemptedText = attemptedText;
    this.filename = filename;
  }
}

vi.mock("../lib/vault.js", () => ({
  ...vaultMocks,
  VaultConflictError: MockVaultConflictError,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Real @tauri-apps/api/window throws outside an actual Tauri webview; the
// close-flush wiring already guards against that (try/catch), but mocking
// it keeps test output free of expected-and-handled noise.
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: vi.fn(() => Promise.resolve(() => {})),
  }),
}));

import { toast } from "sonner";
import { noteToMarkdown } from "../lib/noteFile.js";

async function importStore() {
  vi.resetModules();
  return import("./useNotesStore.js");
}

describe("useNotesStore (vault branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultMocks.isTauri.mockReturnValue(true);
    vaultMocks.getVaultPath.mockReturnValue("/mock/vault");
    vaultMocks.loadNotes.mockResolvedValue([]);
    vaultMocks.watchVault.mockResolvedValue(() => {});
  });

  it("loads notes from the vault on mount", async () => {
    const note = { id: "n1", title: "Hello", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    vaultMocks.loadNotes.mockResolvedValue([note]);
    const { useNotesStore } = await importStore();

    const { result } = renderHook(() => useNotesStore());

    await waitFor(() => expect(result.current[2].status).toBe("ready"));
    expect(result.current[0]).toEqual([note]);
  });

  it("reports needs-vault when no vault path is set", async () => {
    vaultMocks.getVaultPath.mockReturnValue(null);
    const { useNotesStore } = await importStore();

    const { result } = renderHook(() => useNotesStore());

    await waitFor(() => expect(result.current[2].status).toBe("needs-vault"));
  });

  it("keeps a brand-new note across a reload instead of dropping it (regression: extras merge)", async () => {
    vaultMocks.loadNotes.mockResolvedValue([]); // vault starts empty
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    const [, setNotes] = result.current;
    const draft = { id: "new1", title: "Draft", content: "unsaved", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    act(() => setNotes([draft]));

    // Reload happens (e.g. window focus) before the debounced write has
    // landed on disk — vault still reports empty.
    await act(async () => {
      await result.current[2].reload();
    });

    expect(result.current[0]).toEqual([draft]);
  });

  it("toasts and drops a clean note whose file was removed outside MAIA", async () => {
    const note = { id: "n1", title: "Doomed", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    vaultMocks.loadNotes.mockResolvedValueOnce([note]);
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));
    expect(result.current[0]).toEqual([note]);

    // Externally, the file is gone on the next read.
    vaultMocks.loadNotes.mockResolvedValueOnce([]);
    await act(async () => {
      await result.current[2].reload();
    });

    expect(result.current[0]).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Doomed"));
  });

  it("on a save conflict, reverts the original to disk content and keeps the local edit as a separate note", async () => {
    vaultMocks.loadNotes.mockResolvedValue([]);
    const diskText = noteToMarkdown({
      id: "n1", title: "Shared", content: "from disk", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z",
    });
    vaultMocks.saveNote.mockRejectedValueOnce(
      new MockVaultConflictError("n1", { diskText, attemptedText: "local", filename: "shared.md" })
    );

    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    const original = { id: "n1", title: "Shared", content: "local edit", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    act(() => result.current[1]([original]));

    // The write is debounced 1000ms before flush() runs and hits the
    // mocked conflict — wait past that for real, no fake timers.
    await waitFor(
      () => {
        expect(result.current[0]).toHaveLength(2);
      },
      { timeout: 3000 }
    );

    const notes = result.current[0];
    const reverted = notes.find((n) => n.id === "n1");
    const conflictCopy = notes.find((n) => n.id !== "n1");

    expect(reverted.content).toBe("from disk");
    expect(conflictCopy.content).toBe("local edit");
    expect(conflictCopy.title).toBe("Shared (conflict copy)");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("conflict copy"));
  });

  describe("switchVault", () => {
    const makeNote = (id) => ({ id, title: id, content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" });

    it("writes pending edits to the old vault, then loads the new one without carrying old notes over", async () => {
      let path = "/old";
      vaultMocks.getVaultPath.mockImplementation(() => path);
      vaultMocks.setVaultPath.mockImplementation((p) => { path = p; });
      vaultMocks.loadNotes.mockImplementation(async (p) => (p === "/old" ? [makeNote("a")] : [makeNote("b")]));
      vaultMocks.saveNote.mockResolvedValue(undefined);
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));

      act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "edited" }))));
      await act(async () => { await result.current[2].switchVault("/new"); });

      expect(vaultMocks.saveNote).toHaveBeenCalledWith("/old", expect.objectContaining({ id: "a", content: "edited" }));
      expect(vaultMocks.saveNote).not.toHaveBeenCalledWith("/new", expect.anything());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));
      expect(result.current[0].map((n) => n.id)).toEqual(["b"]);
      expect(path).toBe("/new");
    });

    it("changes nothing when the target folder can't be read", async () => {
      vaultMocks.probeVault.mockRejectedValueOnce(new Error("ENOENT"));
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));

      await expect(result.current[2].switchVault("/gone")).rejects.toThrow("ENOENT");
      expect(vaultMocks.setVaultPath).not.toHaveBeenCalled();
      expect(result.current[2].status).toBe("ready");
    });

    it("cancels the switch when pending edits can't be saved", async () => {
      vaultMocks.loadNotes.mockResolvedValue([makeNote("a")]);
      vaultMocks.saveNote.mockRejectedValue(new Error("disk full"));
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));

      act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "edited" }))));
      await act(async () => {
        await expect(result.current[2].switchVault("/new")).rejects.toThrow(/nothing was switched/);
      });
      expect(vaultMocks.setVaultPath).not.toHaveBeenCalled();
    });
  });
});
