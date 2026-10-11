import { describe, it, expect } from "vitest";
import {
  dayOf,
  sortDecisions,
  monthKey,
  monthLabel,
  groupDecisionsByMonth,
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
