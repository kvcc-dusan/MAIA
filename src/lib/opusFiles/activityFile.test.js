import { describe, it, expect } from "vitest";
import { parseActivity, serializeActivity, capEntries } from "./activityFile.js";
import { ACTIVITY_CAP } from "../../features/Opus/lib/activityLog.js";

const entry = (n, extra = {}) => ({
  at: `2026-10-01T00:00:${String(n).padStart(2, "0")}.000Z`, kind: "created", collection: "tasks", itemId: `t${n}`,
  projectId: "p1", title: `Task ${n}`, from: null, to: null, ...extra,
});

describe("activity.jsonl codec", () => {
  it("round-trips compact lines, oldest first, one per line", () => {
    const entries = [entry(1), entry(2)];
    const text = serializeActivity(entries);
    expect(text.split("\n")).toHaveLength(3);
    expect(parseActivity(text)).toEqual({ entries, badLines: [] });
  });

  it("serializes nothing as an empty file", () => {
    expect(serializeActivity([])).toBe("");
    expect(parseActivity("")).toEqual({ entries: [], badLines: [] });
  });

  it("keeps unknown fields and tolerates CRLF and blank lines", () => {
    const text = `${JSON.stringify(entry(1, { extra: "x" }))}\r\n\r\n${JSON.stringify(entry(2))}\r\n`;
    const { entries, badLines } = parseActivity(text);
    expect(entries).toHaveLength(2);
    expect(entries[0].extra).toBe("x");
    expect(badLines).toEqual([]);
  });

  it("reports malformed lines and writes them back untouched", () => {
    const text = `${JSON.stringify(entry(1))}\n{oops\n[1,2]\n{"at":1,"kind":"x"}\n${JSON.stringify(entry(2))}\n`;
    const { entries, badLines } = parseActivity(text);
    expect(entries.map((e) => e.itemId)).toEqual(["t1", "t2"]);
    expect(badLines.map((b) => b.line)).toEqual([2, 3, 4]);
    const out = serializeActivity([...entries, entry(3)], badLines);
    expect(out).toContain("{oops\n");
    expect(out).toContain("[1,2]\n");
    expect(parseActivity(out).entries).toHaveLength(3);
  });

  it("caps to the newest entries", () => {
    const many = Array.from({ length: ACTIVITY_CAP + 5 }, (_, i) => entry(i % 60, { itemId: `i${i}` }));
    const capped = capEntries(many);
    expect(capped).toHaveLength(ACTIVITY_CAP);
    expect(capped[0].itemId).toBe("i5");
    expect(parseActivity(serializeActivity(many)).entries).toHaveLength(ACTIVITY_CAP);
  });
});
