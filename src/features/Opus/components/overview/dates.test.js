import { describe, it, expect } from "vitest";
import { formatDay, plural, roundTenth } from "./dates.js";

describe("formatDay", () => {
  it("formats a day string as month and day", () => {
    expect(formatDay("2026-10-09", "2026-10-09")).toBe("Oct 9");
    expect(formatDay("2026-12-18", "2026-10-09")).toBe("Dec 18");
  });

  it("adds the year only when it differs from today's year", () => {
    expect(formatDay("2027-01-12", "2026-10-09")).toBe("Jan 12, 2027");
    expect(formatDay("2027-01-12")).toBe("Jan 12");
  });

  it("reads an ISO timestamp by its first 10 characters", () => {
    expect(formatDay("2026-10-09T23:30:00Z", "2026-10-09")).toBe("Oct 9");
  });

  it("returns an empty string for missing or malformed input", () => {
    expect(formatDay(null, "2026-10-09")).toBe("");
    expect(formatDay("", "2026-10-09")).toBe("");
    expect(formatDay("soon", "2026-10-09")).toBe("");
  });
});

describe("plural", () => {
  it("picks the singular only for exactly one", () => {
    expect(plural(1, "task")).toBe("1 task");
    expect(plural(0, "task")).toBe("0 tasks");
    expect(plural(3.2, "task")).toBe("3.2 tasks");
    expect(plural(2, "day", "days")).toBe("2 days");
  });
});

describe("roundTenth", () => {
  it("keeps one decimal at most", () => {
    expect(roundTenth(3.24)).toBe(3.2);
    expect(roundTenth(3)).toBe(3);
    expect(roundTenth(0.049)).toBe(0);
  });
});
