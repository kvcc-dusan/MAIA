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
  activity: [{ at: "2026-10-09T10:00:00.000Z", kind: "created", collection: "tasks", itemId: "t1", title: "T" }],
};

// What a version-1 file written before `activity` existed looks like.
const LEGACY_SAMPLE = Object.fromEntries(Object.entries(SAMPLE).filter(([key]) => key !== "activity"));

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
      notes: [], projects: [], tasks: [], reminders: [], sessions: [], ledger: [], activity: [],
    });
  });

  it("stays on backup version 1", () => {
    expect(BACKUP_VERSION).toBe(1);
  });

  it("exports an empty activity list for callers that never pass one", () => {
    expect(buildBackup(LEGACY_SAMPLE).data.activity).toEqual([]);
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
    expect(parsed.data.activity).toEqual([]);
  });

  it("round-trips activity", () => {
    const parsed = parseBackup(JSON.stringify(buildBackup(SAMPLE)));
    expect(parsed.data.activity).toEqual(SAMPLE.activity);
  });

  it("restores an older file that has no activity key, with activity as an empty list", () => {
    const olderFile = JSON.stringify({ version: 1, exportedAt: "2026-09-18T13:01:09.822Z", app: "MAIA", data: LEGACY_SAMPLE });
    const parsed = parseBackup(olderFile);
    expect(parsed.data).toEqual({ ...LEGACY_SAMPLE, activity: [] });
  });

  it("rejects an activity field that isn't a list", () => {
    expect(() => parseBackup(JSON.stringify({ data: { activity: "nope" } }))).toThrow(/activity/);
  });

  it("ignores unknown keys instead of failing or passing them through", () => {
    const parsed = parseBackup(JSON.stringify({ data: { ...SAMPLE, futureThing: [1, 2, 3] }, extra: true }));
    expect(parsed.data).toEqual(SAMPLE);
    expect("futureThing" in parsed.data).toBe(false);
  });

  it("keeps new-shape tasks and projects untouched (normalization happens on read)", () => {
    const rich = {
      ...SAMPLE,
      tasks: [{ id: "t1", status: "doing", done: false, startedAt: "2026-10-05T08:00:00.000Z", workstreamId: "w1" }],
      projects: [{ id: "p1", workstreams: [{ id: "w1", name: "A" }], decisions: [], questions: [] }],
    };
    expect(parseBackup(JSON.stringify(buildBackup(rich))).data).toEqual(rich);
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
