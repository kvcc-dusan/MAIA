// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BACKUP_VERSION,
  buildBackup,
  backupFilename,
  parseBackup,
  downloadBackup,
} from "./backup.js";

const SAMPLE = {
  notes: [{ id: "n1", title: "A" }],
  projects: [{ id: "p1", name: "P" }],
  tasks: [{ id: "t1" }],
  reminders: [],
  sessions: [],
  ledger: [{ id: "l1" }],
};

describe("buildBackup", () => {
  it("wraps every entity under data with a version and timestamp", () => {
    const backup = buildBackup(SAMPLE);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.app).toBe("MAIA");
    expect(typeof backup.exportedAt).toBe("string");
    expect(backup.data).toEqual(SAMPLE);
  });

  it("defaults missing entities to empty arrays instead of throwing", () => {
    const backup = buildBackup({});
    expect(backup.data).toEqual({
      notes: [], projects: [], tasks: [], reminders: [], sessions: [], ledger: [],
    });
  });
});

describe("backupFilename", () => {
  it("produces a sortable, filesystem-safe .json name", () => {
    const name = backupFilename(new Date("2026-09-18T13:01:09.822Z"));
    expect(name).toBe("maia-backup-2026-09-18T13-01-09.json");
    expect(name).not.toMatch(/:/);
  });
});

describe("parseBackup", () => {
  it("round-trips a real backup", () => {
    const json = JSON.stringify(buildBackup(SAMPLE));
    const parsed = parseBackup(json);
    expect(parsed.data).toEqual(SAMPLE);
  });

  it("rejects invalid JSON with a plain-English message", () => {
    expect(() => parseBackup("{not json")).toThrow(/valid JSON/);
  });

  it("rejects a JSON file that isn't a MAIA backup", () => {
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow(/MAIA backup/);
  });

  it("rejects a backup whose entity field isn't an array", () => {
    const bad = JSON.stringify({ data: { notes: "not-an-array" } });
    expect(() => parseBackup(bad)).toThrow(/notes/);
  });

  it("fills in missing entity fields as empty arrays rather than failing", () => {
    const parsed = parseBackup(JSON.stringify({ data: { notes: [{ id: "n1" }] } }));
    expect(parsed.data.notes).toEqual([{ id: "n1" }]);
    expect(parsed.data.tasks).toEqual([]);
  });
});

describe("downloadBackup (web path)", () => {
  beforeEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  it("creates a downloadable JSON blob with a real filename and the exact backup contents", async () => {
    let capturedBlob = null;
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    let capturedAnchor = null;
    const realCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = realCreateElement(tag);
      if (tag === "a") {
        capturedAnchor = el;
        el.click = vi.fn(); // jsdom doesn't implement anchor.click() navigation
      }
      return el;
    });

    const wrote = await downloadBackup(SAMPLE);

    expect(wrote).toBe(true);
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor.download).toMatch(/^maia-backup-.*\.json$/);
    expect(capturedAnchor.click).toHaveBeenCalledTimes(1);
    expect(capturedBlob.type).toBe("application/json");

    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(capturedBlob);
    });
    const parsed = JSON.parse(text);
    expect(parsed.data).toEqual(SAMPLE);

    expect(revokeSpy).toHaveBeenCalledWith("blob:mock-url");

    createObjectURLSpy.mockRestore();
    revokeSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
