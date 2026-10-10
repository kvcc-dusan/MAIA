import { describe, expect, it } from "vitest";
import { daysBetween, dueState, humanDate, initials, priorityLabel, statusLabel, workstreamColor } from "./format";

describe("initials", () => {
  it("uses first and last word", () => {
    expect(initials("Sara Vidmar")).toBe("SV");
    expect(initials("Ana Maria Kovač")).toBe("AK");
  });
  it("handles one word and empty", () => {
    expect(initials("ana")).toBe("A");
    expect(initials("")).toBe("");
    expect(initials(null)).toBe("");
  });
});

describe("humanDate", () => {
  it("omits the current year", () => {
    expect(humanDate("2026-10-08", 2026)).toBe("8 Oct");
  });
  it("adds the year otherwise", () => {
    expect(humanDate("2025-01-02", 2026)).toBe("2 Jan 2025");
  });
  it("returns empty for bad input", () => {
    expect(humanDate("", 2026)).toBe("");
    expect(humanDate("nope", 2026)).toBe("");
  });
});

describe("daysBetween", () => {
  it("counts days from a to b", () => {
    expect(daysBetween("2026-10-08", "2026-10-10")).toBe(2);
    expect(daysBetween("2026-10-10", "2026-10-08")).toBe(-2);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });
  it("is NaN for invalid dates", () => {
    expect(daysBetween("", "2026-10-08")).toBeNaN();
  });
});

describe("dueState", () => {
  const today = "2026-10-10";
  it("flags overdue", () => {
    expect(dueState("2026-10-08", today)).toEqual({ tone: "overdue", days: -2 });
  });
  it("flags today through three days as soon", () => {
    expect(dueState("2026-10-10", today).tone).toBe("soon");
    expect(dueState("2026-10-13", today).tone).toBe("soon");
  });
  it("is later beyond three days", () => {
    expect(dueState("2026-10-14", today).tone).toBe("later");
  });
  it("is none without a date", () => {
    expect(dueState(null, today).tone).toBe("none");
  });
});

describe("labels", () => {
  it("matches the hub copy", () => {
    expect(statusLabel("doing")).toBe("In progress");
    expect(statusLabel("notStarted")).toBe("Not started");
    expect(statusLabel("atRisk")).toBe("At risk");
    expect(statusLabel("unknown")).toBe("");
    expect(priorityLabel("p1")).toBe("High");
  });
  it("maps workstream colours to series tokens", () => {
    expect(workstreamColor({ color: "2" })).toBe("var(--series-2)");
    expect(workstreamColor({ color: 3 })).toBe("var(--series-3)");
    expect(workstreamColor({})).toBe("var(--text-muted)");
    expect(workstreamColor(null)).toBe("var(--text-muted)");
    expect(workstreamColor(undefined)).toBe("var(--text-muted)");
    expect(workstreamColor({ color: "9" })).toBe("var(--text-muted)");
    expect(workstreamColor({ color: "not-a-token" })).toBe("var(--text-muted)");
  });
});
