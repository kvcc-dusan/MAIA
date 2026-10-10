import { describe, it, expect } from "vitest";
import { addDays } from "../../lib/metrics.js";
import { MAX_DAYS, buildBurnup, forecastSummary, pickAxisIndexes } from "./burnupData.js";

const TODAY = "2026-10-09"; // a Friday

// 10 tasks created on Sep 14, 4 finished. perWeek works out to 0.8 and the
// forecast to Dec 4 (8 weeks out), which lands after the Nov 30 target.
const task = (id, patch = {}) => ({ id, status: "todo", createdAt: "2026-09-14T08:00:00Z", ...patch });
const doneTask = (id, doneAt) => task(id, { status: "done", doneAt: `${doneAt}T10:00:00Z` });
const tasks = [
  doneTask("t1", "2026-09-22"),
  doneTask("t2", "2026-09-30"),
  doneTask("t3", "2026-10-06"),
  doneTask("t4", "2026-10-08"),
  ...["t5", "t6", "t7", "t8", "t9", "t10"].map((id) => task(id)),
];
const input = { tasks, startDate: "2026-09-14", targetDate: "2026-11-30", today: TODAY };

const rowAt = (result, key) => result.data.find((row) => row.key === key);

describe("buildBurnup rows", () => {
  const result = buildBurnup(input);

  it("runs one row per day from the start to the forecast date", () => {
    expect(result.data).toHaveLength(82);
    expect(result.data[0].key).toBe("2026-09-14");
    expect(result.data[result.data.length - 1].key).toBe("2026-12-04");
    expect(result.todayIndex).toBe(25);
    expect(result.data[result.todayIndex].key).toBe(TODAY);
  });

  it("keeps scope a number on every row and flat after today", () => {
    expect(result.data.every((row) => typeof row.values.scope === "number")).toBe(true);
    expect(rowAt(result, "2026-09-14").values.scope).toBe(10);
    expect(rowAt(result, "2026-11-01").values.scope).toBe(10);
  });

  it("counts done up to today and leaves a gap (null) after", () => {
    expect(rowAt(result, "2026-09-21").values.done).toBe(0);
    expect(rowAt(result, "2026-09-22").values.done).toBe(1);
    expect(rowAt(result, TODAY).values.done).toBe(4);
    expect(rowAt(result, "2026-10-10").values.done).toBeNull();
    expect(rowAt(result, "2026-12-04").values.done).toBeNull();
  });

  it("has no projection before today and joins the done line on today", () => {
    expect(result.hasProjection).toBe(true);
    expect(rowAt(result, "2026-10-08").values.projected).toBeNull();
    expect(rowAt(result, TODAY).values.projected).toBe(rowAt(result, TODAY).values.done);
  });

  it("rises in a straight line and meets the scope line on the forecast date", () => {
    expect(rowAt(result, "2026-11-06").values.projected).toBeCloseTo(7, 6); // halfway: 28 of 56 days
    expect(rowAt(result, "2026-12-04").values.projected).toBe(10);
    const afterToday = result.data.slice(result.todayIndex).map((row) => row.values.projected);
    expect(afterToday).toEqual([...afterToday].sort((a, b) => a - b));
  });

  it("is null after the line reaches scope when the chart runs longer", () => {
    const longer = buildBurnup({ ...input, targetDate: "2026-12-20" });
    expect(rowAt(longer, "2026-12-04").values.projected).toBe(10);
    expect(rowAt(longer, "2026-12-05").values.projected).toBeNull();
    expect(longer.data[longer.data.length - 1].key).toBe("2026-12-20");
  });

  it("labels the tooltip title for today and the target", () => {
    expect(rowAt(result, TODAY).label).toBe("Oct 9 (today)");
    expect(rowAt(result, "2026-11-30").label).toBe("Nov 30 (target)");
    expect(rowAt(result, "2026-10-20").label).toBe("Oct 20");
  });
});

describe("buildBurnup axis", () => {
  const result = buildBurnup(input);
  const labelled = result.data.filter((row) => row.axisLabel);

  it("labels about six days, not every day", () => {
    expect(labelled.length).toBeGreaterThanOrEqual(5);
    expect(labelled.length).toBeLessThanOrEqual(8);
  });

  it("always labels today and the target date", () => {
    expect(rowAt(result, TODAY).axisLabel).toBe("Today");
    expect(rowAt(result, "2026-11-30").axisLabel).toBe("Nov 30");
    expect(result.targetIndex).toBe(77);
  });
});

describe("buildBurnup window", () => {
  it("starts at the earliest task when the project has no start date", () => {
    const result = buildBurnup({ ...input, startDate: null });
    expect(result.data[0].key).toBe("2026-09-14");
  });

  it("starts today when the start date is in the future", () => {
    const result = buildBurnup({ ...input, startDate: "2026-11-01", targetDate: null });
    expect(result.data[0].key).toBe(TODAY);
  });

  it("cuts a long forecast to 180 days from the start", () => {
    const result = buildBurnup({ ...input, startDate: "2026-09-29", targetDate: "2027-12-01" });
    expect(result.data).toHaveLength(MAX_DAYS + 1);
    expect(result.data[0].key).toBe("2026-09-29");
    expect(result.data[result.data.length - 1].key).toBe(addDays("2026-09-29", MAX_DAYS));
    expect(result.targetIndex).toBe(-1);
  });

  it("shows the latest 180 days for a project older than that, ending today", () => {
    const result = buildBurnup({ ...input, startDate: "2026-01-01", targetDate: null });
    expect(result.data).toHaveLength(MAX_DAYS + 1);
    expect(result.data[result.data.length - 1].key).toBe(TODAY);
    expect(result.todayIndex).toBe(MAX_DAYS);
    expect(result.data.every((row) => row.values.done !== null)).toBe(true);
  });

  it("returns no rows when there are no tasks", () => {
    expect(buildBurnup({ ...input, tasks: [] }).data).toEqual([]);
  });
});

describe("buildBurnup without a forecast", () => {
  it("omits the projected series when nothing has been finished", () => {
    const open = ["a", "b", "c"].map((id) => task(id));
    const result = buildBurnup({ ...input, tasks: open });
    expect(result.hasProjection).toBe(false);
    expect(result.data.every((row) => !("projected" in row.values))).toBe(true);
    expect(result.forecast.text).toBe("Target Nov 30. Not enough finished tasks to forecast");
    expect(result.data[result.data.length - 1].key).toBe("2026-11-30");
  });

  it("omits the projected series when everything is done", () => {
    const finished = [doneTask("a", "2026-10-01"), doneTask("b", "2026-10-02")];
    const result = buildBurnup({ ...input, tasks: finished, targetDate: null });
    expect(result.hasProjection).toBe(false);
    expect(result.forecast.text).toBe("All tasks are done");
    expect(result.data[result.data.length - 1].key).toBe(TODAY);
  });
});

describe("forecastSummary", () => {
  const base = { targetDate: "2026-11-30", finishDate: "2026-12-18", perWeek: 3.2, remaining: 10, total: 20, today: TODAY };

  it("states target, forecast and pace", () => {
    expect(forecastSummary(base)).toEqual({ text: "Target Nov 30, forecast Dec 18, 3.2 tasks per week", isLate: true });
  });

  it("is not late when the forecast is on or before the target", () => {
    expect(forecastSummary({ ...base, finishDate: "2026-11-30" }).isLate).toBe(false);
    expect(forecastSummary({ ...base, finishDate: "2026-11-02" }).isLate).toBe(false);
  });

  it("says so when there is no target date", () => {
    const result = forecastSummary({ ...base, targetDate: null });
    expect(result).toEqual({ text: "No target date, forecast Dec 18, 3.2 tasks per week", isLate: false });
  });

  it("uses the singular for one task per week", () => {
    expect(forecastSummary({ ...base, perWeek: 1 }).text).toContain("1 task per week");
  });

  it("says there is not enough data when there is no pace", () => {
    expect(forecastSummary({ ...base, finishDate: null, perWeek: 0 }).text).toBe(
      "Target Nov 30. Not enough finished tasks to forecast",
    );
    expect(forecastSummary({ ...base, finishDate: null, perWeek: 0, targetDate: null }).text).toBe(
      "Not enough finished tasks to forecast",
    );
  });

  it("is empty without tasks and says all done when nothing remains", () => {
    expect(forecastSummary({ ...base, total: 0 }).text).toBe("");
    expect(forecastSummary({ ...base, remaining: 0 }).text).toBe("All tasks are done");
  });
});

describe("pickAxisIndexes", () => {
  it("spreads about six picks across the range, ends included", () => {
    expect(pickAxisIndexes(181)).toEqual([0, 36, 72, 108, 144, 180]);
  });

  it("keeps required indexes and drops even picks that crowd them", () => {
    const picks = pickAxisIndexes(181, [100, 170]);
    expect(picks).toContain(100);
    expect(picks).toContain(170);
    expect(picks).not.toContain(108);
    expect(picks).not.toContain(180);
    expect(picks).toEqual([...picks].sort((a, b) => a - b));
  });

  it("copes with short ranges", () => {
    expect(pickAxisIndexes(0)).toEqual([]);
    expect(pickAxisIndexes(1)).toEqual([0]);
    expect(pickAxisIndexes(3)).toEqual([0, 1, 2]);
  });

  it("ignores required indexes outside the range", () => {
    expect(pickAxisIndexes(10, [-1, 50])).not.toContain(50);
  });
});
