import { describe, it, expect } from "vitest";
import {
  MONTH_GROUP_THRESHOLD,
  dayOf,
  sortDecisions,
  shouldGroupByMonth,
  monthKey,
  monthLabel,
  groupDecisionsByMonth,
  formatDecisionDate,
} from "./decisions.js";

const d = (id, date) => ({ id, title: `Decision ${id}`, date });

describe("dayOf", () => {
  it("reads dates and ISO timestamps", () => {
    expect(dayOf("2026-10-14")).toBe("2026-10-14");
    expect(dayOf("2026-10-14T09:30:00.000Z")).toBe("2026-10-14");
  });

  it("rejects missing and impossible dates", () => {
    expect(dayOf("")).toBe("");
    expect(dayOf(null)).toBe("");
    expect(dayOf("tomorrow")).toBe("");
    expect(dayOf("2026-13-01")).toBe("");
    expect(dayOf("2026-00-10")).toBe("");
  });
});

describe("sortDecisions", () => {
  it("sorts newest first with undated last", () => {
    const list = [d("a", "2026-09-02"), d("b", ""), d("c", "2026-10-14"), d("e", "2026-09-30")];
    expect(sortDecisions(list).map((x) => x.id)).toEqual(["c", "e", "a", "b"]);
  });

  it("puts the later-added one first on equal dates and does not mutate", () => {
    const list = [d("first", "2026-10-01"), d("second", "2026-10-01")];
    const copy = [...list];
    expect(sortDecisions(list).map((x) => x.id)).toEqual(["second", "first"]);
    expect(list).toEqual(copy);
  });

  it("tolerates a non-array", () => {
    expect(sortDecisions(undefined)).toEqual([]);
  });
});

describe("month grouping", () => {
  it("groups only when there are more than the threshold", () => {
    expect(MONTH_GROUP_THRESHOLD).toBe(8);
    expect(shouldGroupByMonth(8)).toBe(false);
    expect(shouldGroupByMonth(9)).toBe(true);
  });

  it("builds sentence-case month labels", () => {
    expect(monthKey("2026-10-14")).toBe("2026-10");
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthLabel("2025-01")).toBe("January 2025");
    expect(monthLabel("")).toBe("No date");
  });

  it("groups a sorted list by month, keeping order, undated group last", () => {
    const sorted = sortDecisions([
      d("a", "2026-10-14"), d("b", "2026-10-02"), d("c", "2026-09-20"), d("e", ""), d("f", "2026-09-01"),
    ]);
    const groups = groupDecisionsByMonth(sorted);
    expect(groups.map((g) => [g.label, g.items.map((x) => x.id)])).toEqual([
      ["October 2026", ["a", "b"]],
      ["September 2026", ["c", "f"]],
      ["No date", ["e"]],
    ]);
  });

  it("returns no groups for an empty list", () => {
    expect(groupDecisionsByMonth([])).toEqual([]);
  });
});

describe("formatDecisionDate", () => {
  it("is month and day within the current year", () => {
    expect(formatDecisionDate("2026-10-14", "2026-10-20")).toBe("Oct 14");
    expect(formatDecisionDate("2026-01-05", "2026-10-20")).toBe("Jan 5");
  });

  it("adds the year for other years", () => {
    expect(formatDecisionDate("2025-12-31", "2026-10-20")).toBe("Dec 31, 2025");
  });

  it("says so when there is no date", () => {
    expect(formatDecisionDate("", "2026-10-20")).toBe("No date");
    expect(formatDecisionDate(undefined, "2026-10-20")).toBe("No date");
  });

  it("omits the year when today is unknown", () => {
    expect(formatDecisionDate("2025-03-09")).toBe("Mar 9");
  });
});
