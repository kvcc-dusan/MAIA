import { describe, expect, it } from "vitest";
import { rangeLabel, weekOptions, weekRanges } from "./reportWeeks";

describe("reportWeeks", () => {
  const ranges = weekRanges("2026-10-10");
  it("lists this week plus eight earlier", () => {
    expect(ranges).toHaveLength(9);
    expect(rangeLabel(ranges[0])).toBe("5 Oct to 11 Oct");
  });
  it("offers every week in one select", () => {
    const options = weekOptions(ranges);
    expect(options).toHaveLength(9);
    expect(options[0]).toEqual({ value: "0", label: "This week" });
    expect(options[1]).toEqual({ value: "1", label: "Last week" });
    expect(options[2]).toEqual({ value: "2", label: "Week of 21 Sep" });
  });
});
