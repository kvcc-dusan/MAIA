// @vitest-environment jsdom
//
// useNotesStore's Tauri branch (useVaultNotes) is the state layer sitting on
// top of vault.js — untested before (STATE_OF_MAIA.md). These tests mock
// vault.js entirely so the conflict-handling and deleted-file-detection
// logic can be exercised deterministically, independent of real fs timing.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

const vaultMocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  getVaultPath: vi.fn(() => "/mock/vault"),
  setVaultPath: vi.fn(),
  probeVault: vi.fn(() => Promise.resolve()),
  loadNotes: vi.fn(),
  loadVault: vi.fn((p) => vaultMocks.loadNotes(p).then((notes) => ({ notes, folders: vaultMocks.folders ?? [] }))),
  createFolder: vi.fn((p, path) => Promise.resolve(path)),
  folders: [],
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
  // Vitest globals are off, so RTL does not unmount for us: a leaked hook keeps its write
  // timer and would consume the next test's mocked saveNote.
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    vaultMocks.isTauri.mockReturnValue(true);
    vaultMocks.getVaultPath.mockReturnValue("/mock/vault");
    vaultMocks.loadNotes.mockResolvedValue([]);
    vaultMocks.watchVault.mockResolvedValue(() => {});
    vaultMocks.folders = [];
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

  it("retries a failed write on its own, without waiting for another edit", async () => {
    vaultMocks.loadNotes.mockResolvedValue([]);
    vaultMocks.saveNote.mockRejectedValueOnce(new Error("Drive offline")).mockResolvedValue(true);
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    const note = { id: "r1", title: "Retry me", content: "x", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    act(() => result.current[1]([note]));

    // 1 s debounce, the failure, then the first 2 s retry, all on real timers.
    await waitFor(() => expect(vaultMocks.saveNote).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(vaultMocks.saveNote.mock.calls[1][1]).toMatchObject({ id: "r1", content: "x" });
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('"Retry me"'),
      expect.objectContaining({ id: "vault-write-failed" }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ id: "vault-write-failed" })),
    );
  }, 8000);

  it("stamps modifiedAt with the save time after a write, without queueing another write", async () => {
    const note = { id: "st1", title: "Stamp", content: "x", folder: "", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", modifiedAt: 1 };
    vaultMocks.loadNotes.mockResolvedValue([note]);
    vaultMocks.saveNote.mockResolvedValue(true);
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    const before = Date.now();
    act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "edited" }))));
    await waitFor(() => expect(result.current[0][0].modifiedAt).toBeGreaterThanOrEqual(before), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(vaultMocks.saveNote.mock.calls.filter(([, n]) => n.id === "st1")).toHaveLength(1);
  });

  it("keeps modifiedAt when the save found nothing to write", async () => {
    const note = { id: "st2", title: "Same", content: "x", folder: "", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", modifiedAt: 5 };
    vaultMocks.loadNotes.mockResolvedValue([note]);
    vaultMocks.saveNote.mockResolvedValue(false);
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "edited" }))));
    await waitFor(() => expect(vaultMocks.saveNote.mock.calls.some(([, n]) => n.id === "st2")).toBe(true), { timeout: 3000 });
    expect(result.current[0][0].modifiedAt).toBe(5);
  });

  it("exposes folders (disk, empty ones, ancestors of note folders) and never saves on load", async () => {
    const note = { id: "fold1", title: "Plan", content: "x", folder: "Omnis/PROJECTS", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    vaultMocks.loadNotes.mockResolvedValue([note]);
    vaultMocks.folders = ["Empty"];
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    expect(result.current[2].folders).toEqual(["Empty", "Omnis", "Omnis/PROJECTS"]);
    await new Promise((r) => setTimeout(r, 1200));
    // other tests' timers can still land saves; only this note matters
    expect(vaultMocks.saveNote.mock.calls.filter(([, n]) => n.id === "fold1")).toHaveLength(0);
  });

  it("createFolder adds the folder to the list; a folder change on a note is saved", async () => {
    const note = { id: "fold1", title: "Plan", content: "x", folder: "", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" };
    vaultMocks.loadNotes.mockResolvedValue([note]);
    vaultMocks.saveNote.mockResolvedValue(undefined);
    const { useNotesStore } = await importStore();
    const { result } = renderHook(() => useNotesStore());
    await waitFor(() => expect(result.current[2].status).toBe("ready"));

    await act(async () => {
      await result.current[2].createFolder("A/B");
    });
    expect(vaultMocks.createFolder).toHaveBeenCalledWith("/mock/vault", "A/B");
    expect(result.current[2].folders).toEqual(["A", "A/B"]);

    act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, folder: "A/B" }))));
    await waitFor(() => expect(vaultMocks.saveNote).toHaveBeenCalledWith("/mock/vault", expect.objectContaining({ id: "fold1", folder: "A/B" })), { timeout: 3000 });
  });

  describe("incremental reloads", () => {
    const mk = (id, extra = {}) => ({ id, title: id, content: "x", folder: "", tags: [], links: [], projectIds: [], createdAt: "2026-01-01T00:00:00.000Z", ...extra });

    it("runs one load at a time and queues a single follow-up for any number of calls", async () => {
      const gate = { release: null };
      vaultMocks.loadNotes.mockResolvedValue([]);
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));
      vaultMocks.loadVault.mockClear();

      let running = 0;
      let maxRunning = 0;
      vaultMocks.loadNotes.mockImplementation(() => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        return new Promise((resolve) => {
          const prevRelease = gate.release;
          gate.release = () => { running -= 1; resolve([]); prevRelease?.(); };
        });
      });
      let all;
      act(() => {
        all = Promise.all([result.current[2].reload(), result.current[2].reload(), result.current[2].reload(), result.current[2].reload()]);
      });
      await waitFor(() => expect(vaultMocks.loadVault).toHaveBeenCalledTimes(1));
      await act(async () => { gate.release(); });
      await waitFor(() => expect(vaultMocks.loadVault).toHaveBeenCalledTimes(2));
      await act(async () => { gate.release(); await all; });

      expect(vaultMocks.loadVault).toHaveBeenCalledTimes(2); // 4 calls = the running load + one follow-up
      expect(maxRunning).toBe(1);
    });

    it("an unchanged reload keeps the same state, and the next edit is still saved", async () => {
      const a = mk("a");
      vaultMocks.loadNotes.mockImplementation(() => Promise.resolve([a]));
      vaultMocks.saveNote.mockResolvedValue(undefined);
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));
      const before = result.current[0];

      await act(async () => { await result.current[2].reload(); });
      expect(result.current[0]).toBe(before);

      act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "edited" }))));
      await waitFor(() => expect(vaultMocks.saveNote).toHaveBeenCalledWith("/mock/vault", expect.objectContaining({ id: "a", content: "edited" })), { timeout: 3000 });
    });

    it("a reload during the write debounce keeps the local edit and still saves it", async () => {
      const a = mk("a");
      vaultMocks.loadNotes.mockImplementation(() => Promise.resolve([a]));
      vaultMocks.saveNote.mockResolvedValue(undefined);
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));

      act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "typing" }))));
      await act(async () => { await result.current[2].reload(); }); // disk still has the old text
      expect(result.current[0][0].content).toBe("typing");

      await waitFor(() => expect(vaultMocks.saveNote).toHaveBeenCalledWith("/mock/vault", expect.objectContaining({ id: "a", content: "typing" })), { timeout: 3000 });
    });

    it("tells the loader which notes have unsaved edits so their conflict baseline is kept", async () => {
      vaultMocks.loadNotes.mockResolvedValue([mk("a")]);
      vaultMocks.saveNote.mockResolvedValue(undefined);
      const { useNotesStore } = await importStore();
      const { result } = renderHook(() => useNotesStore());
      await waitFor(() => expect(result.current[2].status).toBe("ready"));

      act(() => result.current[1]((prev) => prev.map((n) => ({ ...n, content: "typing" }))));
      await act(async () => { await result.current[2].reload(); });

      const { keepBaselines } = vaultMocks.loadVault.mock.calls.at(-1)[1];
      expect(keepBaselines.has("a")).toBe(true);
    });
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
