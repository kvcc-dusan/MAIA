import { describe, expect, it } from "vitest";
import { daysBetween, forecastTrack } from "./forecastTrack.js";

describe("forecastTrack", () => {
  it("counts days between two dates", () => {
    expect(daysBetween("2026-10-11", "2026-12-15")).toBe(65);
    expect(daysBetween("2026-12-15", "2026-10-11")).toBe(-65);
  });

  it("orders the markers by date and reports how late the forecast is", () => {
    const t = forecastTrack({ start: "2026-09-01", today: "2026-10-11", target: "2026-12-15", finish: "2027-02-28" });
    expect(t.today).toBeLessThan(t.target);
    expect(t.target).toBeLessThan(t.finish);
    expect(t.lateDays).toBe(75);
  });

  it("puts an early forecast before the target (negative lateDays)", () => {
    const t = forecastTrack({ today: "2026-10-11", target: "2026-12-15", finish: "2026-11-20" });
    expect(t.finish).toBeLessThan(t.target);
    expect(t.lateDays).toBe(-25);
  });

  it("handles missing target and forecast without NaN", () => {
    const t = forecastTrack({ today: "2026-10-11" });
    expect(t.target).toBeNull();
    expect(t.finish).toBeNull();
    expect(t.lateDays).toBeNull();
    expect(Number.isFinite(t.today)).toBe(true);
  });

  it("keeps every marker inside the track", () => {
    const t = forecastTrack({ start: "2026-01-01", today: "2026-10-11", target: "2026-12-15", finish: "2027-02-28" });
    for (const v of [t.today, t.target, t.finish]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
});
