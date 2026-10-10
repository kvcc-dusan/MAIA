import { describe, expect, it } from "vitest";
import { chipValue, olderWeekOptions, rangeLabel, tileFacts, weekRanges } from "./reportWeeks";

describe("reportWeeks", () => {
  const ranges = weekRanges("2026-10-10");
  it("lists this week plus eight earlier", () => {
    expect(ranges).toHaveLength(9);
    expect(rangeLabel(ranges[0])).toBe("5 Oct to 11 Oct");
  });
  it("offers weeks 2 to 8 back in the select", () => {
    const options = olderWeekOptions(ranges);
    expect(options).toHaveLength(7);
    expect(options[0]).toEqual({ value: "2", label: "Week of 21 Sep" });
  });
  it("maps the chip value", () => {
    expect(chipValue(0)).toBe("0");
    expect(chipValue(1)).toBe("1");
    expect(chipValue(3)).toBe("");
  });
  it("counts tiles", () => {
    expect(tileFacts({ done: [1], blockers: [1, 2], blockingQuestions: [3] })).toEqual({ done: 1, started: 0, slipped: 0, blocking: 3 });
  });
});
