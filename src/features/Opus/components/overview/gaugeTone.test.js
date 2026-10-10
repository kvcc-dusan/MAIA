import { describe, it, expect } from "vitest";
import { gaugeDetail, gaugeTone } from "./gaugeTone.js";

describe("gaugeTone", () => {
  it("ranks blocked over overdue over complete", () => {
    expect(gaugeTone({ blocked: 1, overdue: 2, pct: 100 })).toBe("danger");
    expect(gaugeTone({ blocked: 0, overdue: 2, pct: 100 })).toBe("warning");
    expect(gaugeTone({ blocked: 0, overdue: 0, pct: 100 })).toBe("success");
    expect(gaugeTone({ blocked: 0, overdue: 0, pct: 40 })).toBe("accent");
    expect(gaugeTone({})).toBe("accent");
  });
});

describe("gaugeDetail", () => {
  it("reads done of total, then overdue and blocked when present", () => {
    expect(gaugeDetail({ done: 4, total: 9, overdue: 1, blocked: 0 })).toBe("4 of 9 done, 1 overdue");
    expect(gaugeDetail({ done: 4, total: 9, overdue: 1, blocked: 2 })).toBe("4 of 9 done, 1 overdue, 2 blocked");
    expect(gaugeDetail({ done: 9, total: 9 })).toBe("9 of 9 done");
  });
  it("handles a workstream with no tasks", () => {
    expect(gaugeDetail({ done: 0, total: 0 })).toBe("No tasks yet");
  });
});
