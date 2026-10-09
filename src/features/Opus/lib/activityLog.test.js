import { describe, it, expect } from "vitest";
import {
  ACTIVITY_CAP,
  COLLAPSE_WINDOW_MS,
  MAX_TITLE_LENGTH,
  makeActivityEntry,
  appendActivity,
} from "./activityLog.js";

const at = (offsetSeconds) => new Date(Date.UTC(2026, 9, 9, 10, 0, 0) + offsetSeconds * 1000).toISOString();

const entry = (over = {}, seconds = 0) =>
  makeActivityEntry({ kind: "updated", collection: "tasks", itemId: "t1", projectId: "p1", title: "Task", ...over }, at(seconds));

describe("makeActivityEntry", () => {
  it("builds a compact entry with null defaults", () => {
    expect(makeActivityEntry({ kind: "created", collection: "tasks", itemId: "t1", title: "Hi" }, at(0))).toEqual({
      at: at(0), kind: "created", collection: "tasks", itemId: "t1", projectId: null, title: "Hi", from: null, to: null,
    });
  });

  it("truncates titles to 80 characters and tolerates a missing title", () => {
    expect(entry({ title: "x".repeat(200) }).title).toHaveLength(MAX_TITLE_LENGTH);
    expect(MAX_TITLE_LENGTH).toBe(80);
    expect(entry({ title: undefined }).title).toBe("");
  });

  it("carries from and to for status moves", () => {
    expect(entry({ kind: "status", from: "todo", to: "doing" })).toMatchObject({ from: "todo", to: "doing" });
  });
});

describe("appendActivity", () => {
  it("appends in order", () => {
    const log = appendActivity(appendActivity([], entry({ kind: "created" }, 0)), entry({ itemId: "t2" }, 1));
    expect(log.map((e) => e.itemId)).toEqual(["t1", "t2"]);
  });

  it("does not mutate the input list", () => {
    const base = Object.freeze([entry({}, 0)]);
    expect(() => appendActivity(base, entry({ itemId: "t2" }, 1))).not.toThrow();
    expect(base).toHaveLength(1);
  });

  it("collapses a repeat 'updated' entry for the same item within 60 seconds", () => {
    let log = appendActivity([], entry({ title: "first" }, 0));
    log = appendActivity(log, entry({ title: "second" }, 30));
    log = appendActivity(log, entry({ title: "third" }, 59));
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ title: "third", at: at(59) });
  });

  it("collapse window is measured from the previous entry, so a steady edit stream keeps collapsing", () => {
    let log = [];
    for (let s = 0; s <= 300; s += 50) log = appendActivity(log, entry({}, s));
    expect(log).toHaveLength(1);
  });

  it("does not collapse after the window has passed", () => {
    let log = appendActivity([], entry({}, 0));
    log = appendActivity(log, entry({}, COLLAPSE_WINDOW_MS / 1000 + 1));
    expect(log).toHaveLength(2);
  });

  it("collapses across interleaved entries for other items and keeps chronological order", () => {
    let log = appendActivity([], entry({ itemId: "a" }, 0));
    log = appendActivity(log, entry({ itemId: "b" }, 10));
    log = appendActivity(log, entry({ itemId: "a" }, 20));
    expect(log.map((e) => [e.itemId, e.at])).toEqual([["b", at(10)], ["a", at(20)]]);
  });

  it("never collapses created, status or deleted entries, and never swallows a 'created' marker", () => {
    let log = appendActivity([], entry({ kind: "created" }, 0));
    log = appendActivity(log, entry({ kind: "updated" }, 5));
    expect(log.map((e) => e.kind)).toEqual(["created", "updated"]);
    log = appendActivity(log, entry({ kind: "status", from: "todo", to: "doing" }, 6));
    log = appendActivity(log, entry({ kind: "status", from: "doing", to: "done" }, 7));
    log = appendActivity(log, entry({ kind: "deleted" }, 8));
    expect(log.map((e) => e.kind)).toEqual(["created", "updated", "status", "status", "deleted"]);
  });

  it("an 'updated' right after a status move for the same item is kept", () => {
    let log = appendActivity([], entry({ kind: "status", from: "todo", to: "doing" }, 0));
    log = appendActivity(log, entry({ kind: "updated" }, 5));
    expect(log).toHaveLength(2);
  });

  it("caps the log at ACTIVITY_CAP keeping the newest entries", () => {
    expect(ACTIVITY_CAP).toBe(3000);
    const seed = Array.from({ length: ACTIVITY_CAP }, (_, i) => entry({ kind: "created", itemId: `i${i}` }, i));
    const log = appendActivity(seed, entry({ kind: "created", itemId: "newest" }, ACTIVITY_CAP));
    expect(log).toHaveLength(ACTIVITY_CAP);
    expect(log[0].itemId).toBe("i1");
    expect(log[log.length - 1].itemId).toBe("newest");
  });

  it("tolerates a non-array log", () => {
    expect(appendActivity(null, entry({}, 0))).toHaveLength(1);
  });
});
