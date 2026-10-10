import { describe, expect, it } from "vitest";
import {
  MIN_PX_PER_DAY,
  ZOOMS,
  pxPerDayFor,
  barSpan,
  buildTicks,
  computeRange,
  containsDay,
  dayCenterPercent,
  dayLeftPercent,
  dayNumber,
  dayString,
  defaultRange,
  formatDay,
  layoutLane,
  todayDay,
} from "./geometry.js";

const d = (s) => dayNumber(s);
const range = (a, b) => ({ start: d(a), end: d(b), days: d(b) - d(a) + 1 });

describe("day helpers", () => {
  it("round trips a date string", () => {
    expect(dayString(d("2026-10-09"))).toBe("2026-10-09");
  });

  it("reads the date part of a local datetime string", () => {
    expect(d("2026-10-20T14:35")).toBe(d("2026-10-20"));
  });

  it("rejects empty, malformed and impossible dates", () => {
    expect(dayNumber(null)).toBeNull();
    expect(dayNumber("")).toBeNull();
    expect(dayNumber("next week")).toBeNull();
    expect(dayNumber("2026-02-31")).toBeNull();
  });

  it("takes today from the local calendar", () => {
    expect(todayDay(new Date(2026, 9, 9, 23, 59))).toBe(d("2026-10-09"));
    expect(todayDay(new Date(2026, 9, 9, 0, 1))).toBe(d("2026-10-09"));
  });

  it("formats a day without a year, or with one when it differs", () => {
    expect(formatDay(d("2026-10-03"))).toBe("Oct 3");
    expect(formatDay(d("2026-10-03"), 2026)).toBe("Oct 3");
    expect(formatDay(d("2027-01-04"), 2026)).toBe("Jan 4, 2027");
  });
});

describe("computeRange", () => {
  it("is null when nothing is dated", () => {
    expect(computeRange({ milestones: [{ startDay: null, dueDay: null }] })).toBeNull();
    expect(computeRange()).toBeNull();
  });

  it("spans the earliest and latest dated thing, padded by a week", () => {
    const r = computeRange({
      startDate: "2026-07-26",
      targetDate: "2026-11-13",
      milestones: [
        { startDay: d("2026-10-03"), dueDay: d("2026-10-20") },
        { startDay: null, dueDay: d("2026-11-09") },
      ],
    });
    expect(r.start).toBe(d("2026-07-19"));
    expect(r.end).toBe(d("2026-11-20"));
    expect(r.days).toBe(r.end - r.start + 1);
  });

  it("works from milestones alone", () => {
    const r = computeRange({ milestones: [{ startDay: d("2026-10-10"), dueDay: d("2026-10-12") }] });
    expect(r.start).toBe(d("2026-10-03"));
    expect(r.end).toBe(d("2026-10-19"));
  });

  it("gives an empty chart a week behind today and eight ahead", () => {
    const r = defaultRange(d("2026-10-09"));
    expect(r.start).toBe(d("2026-10-02"));
    expect(r.end).toBe(d("2026-12-04"));
  });
});

describe("percent positions", () => {
  const r = range("2026-10-01", "2026-10-10"); // 10 days

  it("puts the left edge and the centre of a day", () => {
    expect(dayLeftPercent(d("2026-10-01"), r)).toBe(0);
    expect(dayLeftPercent(d("2026-10-06"), r)).toBe(50);
    expect(dayCenterPercent(d("2026-10-01"), r)).toBe(5);
  });

  it("sizes a bar inclusive of both ends", () => {
    expect(barSpan(d("2026-10-03"), d("2026-10-07"), r)).toEqual({ left: 20, width: 50, days: 5 });
  });

  it("accepts a bar given backwards", () => {
    expect(barSpan(d("2026-10-07"), d("2026-10-03"), r).days).toBe(5);
  });

  it("clamps a bar to the window", () => {
    const span = barSpan(d("2026-09-20"), d("2026-10-30"), r);
    expect(span.left).toBe(0);
    expect(span.width).toBe(100);
  });

  it("knows whether a day is inside the window", () => {
    expect(containsDay(r, d("2026-10-05"))).toBe(true);
    expect(containsDay(r, d("2026-11-05"))).toBe(false);
    expect(containsDay(r, null)).toBe(false);
  });
});

describe("buildTicks", () => {
  it("labels months in sentence case and clips the first and last", () => {
    const { months } = buildTicks(range("2026-09-25", "2026-11-05"));
    expect(months.map((m) => m.label)).toEqual(["Sep", "Oct", "Nov"]);
    expect(months[0].startDay).toBe(d("2026-09-25"));
    expect(months[0].monthStart).toBe(d("2026-09-01"));
    expect(months[2].endDay).toBe(d("2026-11-05"));
  });

  it("adds the year to the first month and each January when the window crosses years", () => {
    const { months } = buildTicks(range("2026-11-20", "2027-02-10"));
    expect(months.map((m) => m.label)).toEqual(["Nov 2026", "Dec", "Jan 2027", "Feb"]);
  });

  it("draws week ticks on Mondays when the span is short", () => {
    const { weeks, showWeeks } = buildTicks(range("2026-10-01", "2026-10-31"));
    expect(showWeeks).toBe(true);
    expect(weeks.map((w) => w.label)).toEqual(["5", "12", "19", "26"]);
  });

  it("drops week ticks on a long span", () => {
    const { weeks, showWeeks } = buildTicks(range("2026-01-01", "2026-12-31"));
    expect(showWeeks).toBe(false);
    expect(weeks).toEqual([]);
  });

  it("lists gridlines for month starts inside the window and for weeks", () => {
    const { lines } = buildTicks(range("2026-09-28", "2026-10-14"));
    expect(lines.filter((l) => l.kind === "month").map((l) => l.day)).toEqual([d("2026-10-01")]);
    expect(lines.filter((l) => l.kind === "week").map((l) => l.day)).toEqual([d("2026-10-05"), d("2026-10-12")]);
  });

  it("does not draw a week line on top of a month line", () => {
    const { lines } = buildTicks(range("2026-09-28", "2026-11-10"));
    const days = lines.map((l) => l.day);
    expect(new Set(days).size).toBe(days.length);
  });
});

describe("zoom", () => {
  it("has a day width per zoom, widest for weeks", () => {
    expect(pxPerDayFor("week")).toBeGreaterThan(pxPerDayFor("month"));
    expect(pxPerDayFor("month")).toBeGreaterThan(pxPerDayFor("quarter"));
    expect(pxPerDayFor("nope")).toBe(ZOOMS.month);
  });

  it("week zoom forces week ticks and shades weekends, even on a long span", () => {
    const { showWeeks, weekends, quarters } = buildTicks(range("2026-01-01", "2026-12-31"), "week");
    expect(showWeeks).toBe(true);
    expect(weekends.length).toBeGreaterThan(100);
    expect(quarters).toEqual([]);
  });

  it("month zoom draws months only", () => {
    const t = buildTicks(range("2026-10-01", "2026-10-31"), "month");
    expect(t.showWeeks).toBe(false);
    expect(t.weeks).toEqual([]);
    expect(t.weekends).toEqual([]);
  });

  it("quarter zoom adds clipped quarter segments labelled with the year", () => {
    const { quarters, showWeeks } = buildTicks(range("2026-08-15", "2027-02-10"), "quarter");
    expect(showWeeks).toBe(false);
    expect(quarters.map((q) => q.label)).toEqual(["Q3 2026", "Q4 2026", "Q1 2027"]);
    expect(quarters[0].startDay).toBe(d("2026-08-15"));
    expect(quarters[0].endDay).toBe(d("2026-09-30"));
    expect(quarters[2].endDay).toBe(d("2027-02-10"));
  });
});

describe("layoutLane", () => {
  const r = range("2026-10-01", "2026-12-31"); // 92 days
  const px = MIN_PX_PER_DAY;
  const item = (id, start, due, title = id) => ({
    id,
    title,
    statusText: "Planned",
    startDay: start ? d(start) : null,
    dueDay: d(due),
  });

  it("shows a milestone with no start as a marker centred on its due day", () => {
    const { items } = layoutLane([item("a", null, "2026-10-10")], r, px);
    expect(items[0].kind).toBe("marker");
    expect(items[0].center).toBeCloseTo(dayCenterPercent(d("2026-10-10"), r));
  });

  it("anchors a marker pill's left tip on its due day", () => {
    const { items } = layoutLane([item("a", null, "2026-10-10")], r, px);
    const centerPx = (items[0].center / 100) * r.days * px;
    expect(items[0].leftPx).toBeCloseTo(centerPx - 8);
  });

  it("treats a single day bar as a marker", () => {
    expect(layoutLane([item("a", "2026-10-10", "2026-10-10")], r, px).items[0].kind).toBe("marker");
  });

  it("puts the label inside a wide bar and beside a short one", () => {
    const { items } = layoutLane(
      [item("wide", "2026-10-01", "2026-10-30", "Wide"), item("short", "2026-11-05", "2026-11-07", "Short one")],
      r,
      px
    );
    expect(items.find((i) => i.id === "wide").placement).toBe("inside");
    expect(items.find((i) => i.id === "short").placement).toBe("outside");
  });

  it("keeps non overlapping milestones on one row", () => {
    const { items, rowCount } = layoutLane([item("a", "2026-10-01", "2026-10-10"), item("b", "2026-12-01", "2026-12-10")], r, px);
    expect(rowCount).toBe(1);
    expect(items.map((i) => i.row)).toEqual([0, 0]);
  });

  it("stacks overlapping bars on sub rows", () => {
    const { items, rowCount } = layoutLane(
      [item("a", "2026-10-01", "2026-10-20"), item("b", "2026-10-10", "2026-10-30"), item("c", "2026-10-15", "2026-11-05")],
      r,
      px
    );
    expect(rowCount).toBe(3);
    expect(items.map((i) => i.row)).toEqual([0, 1, 2]);
  });

  it("counts a marker's label as space it occupies", () => {
    const { items, rowCount } = layoutLane(
      [item("a", null, "2026-10-10", "A long milestone title"), item("b", null, "2026-10-14", "Next")],
      r,
      px
    );
    expect(rowCount).toBe(2);
    expect(items.find((i) => i.id === "b").row).toBe(1);
  });

  it("reuses a row once the earlier milestone has ended", () => {
    const { items } = layoutLane(
      [item("a", "2026-10-01", "2026-10-10"), item("b", "2026-10-05", "2026-10-12"), item("c", "2026-11-20", "2026-11-30")],
      r,
      px
    );
    expect(items.find((i) => i.id === "c").row).toBe(0);
  });

  it("returns one row for an empty lane", () => {
    expect(layoutLane([], r, px)).toEqual({ items: [], rowCount: 1 });
  });
});
