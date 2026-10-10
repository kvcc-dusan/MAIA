import { describe, expect, it } from "vitest";
import {
  PRIORITY_OPTIONS_SHORT,
  estimateOptionsFor,
  statusLabel,
  workstreamColor,
} from "./taskDisplay.js";

describe("PRIORITY_OPTIONS_SHORT", () => {
  it("strips the word priority and keeps values and colors", () => {
    expect(PRIORITY_OPTIONS_SHORT.map((p) => [p.value, p.label])).toEqual([
      ["p1", "High"],
      ["p2", "Medium"],
      ["p3", "Normal"],
    ]);
    expect(PRIORITY_OPTIONS_SHORT[0].color).toBe("var(--priority-1)");
  });
});

describe("statusLabel", () => {
  it("names the four statuses and falls back to To do", () => {
    expect(statusLabel("doing")).toBe("In progress");
    expect(statusLabel("blocked")).toBe("Blocked");
    expect(statusLabel("done")).toBe("Done");
    expect(statusLabel(undefined)).toBe("To do");
  });
});

describe("workstreamColor", () => {
  it("maps 1 to 4 onto the series tokens", () => {
    expect(workstreamColor({ color: "3" })).toBe("var(--series-3)");
  });
  it("falls back to muted text for anything else", () => {
    expect(workstreamColor({ color: "9" })).toBe("var(--text-muted)");
    expect(workstreamColor({})).toBe("var(--text-muted)");
    expect(workstreamColor(undefined)).toBe("var(--text-muted)");
  });
});

describe("estimateOptionsFor", () => {
  it("offers S, M and L", () => {
    expect(estimateOptionsFor("M").map((o) => o.value)).toEqual(["S", "M", "L"]);
    expect(estimateOptionsFor(null).map((o) => o.value)).toEqual(["S", "M", "L"]);
  });
  it("keeps an unknown stored value selectable", () => {
    expect(estimateOptionsFor(5).map((o) => o.value)).toEqual(["S", "M", "L", "5"]);
  });
});
