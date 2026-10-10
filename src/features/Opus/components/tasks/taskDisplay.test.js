import { describe, expect, it } from "vitest";
import {
  PRIORITY_OPTIONS_SHORT,
  dueInfo,
  estimateOptionsFor,
  formatDay,
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

describe("formatDay", () => {
  it("formats a day and a local datetime", () => {
    expect(formatDay("2026-10-09", "2026-10-09")).toBe("Oct 9");
    expect(formatDay("2026-01-30T14:20", "2026-10-09")).toBe("Jan 30");
  });
  it("adds the year outside the current one", () => {
    expect(formatDay("2025-12-31", "2026-10-09")).toBe("Dec 31, 2025");
  });
  it("is empty for missing or malformed input", () => {
    expect(formatDay(null, "2026-10-09")).toBe("");
    expect(formatDay("soon", "2026-10-09")).toBe("");
    expect(formatDay("2026-13-01", "2026-10-09")).toBe("");
  });
});

describe("dueInfo", () => {
  const today = "2026-10-09";
  it("flags an open task past its day", () => {
    expect(dueInfo({ status: "todo", due: "2026-10-03" }, today)).toEqual({ label: "Oct 3", isOverdue: true });
  });
  it("does not flag today or later", () => {
    expect(dueInfo({ status: "todo", due: today }, today)).toEqual({ label: "Oct 9", isOverdue: false });
    expect(dueInfo({ status: "doing", due: "2026-11-02" }, today)).toEqual({ label: "Nov 2", isOverdue: false });
  });
  it("hides the date once the task is done, or when there is none", () => {
    expect(dueInfo({ status: "done", done: true, due: "2026-10-03" }, today)).toBeNull();
    expect(dueInfo({ status: "todo", due: null }, today)).toBeNull();
  });
});
