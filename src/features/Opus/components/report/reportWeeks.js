// Week choices for the report page: one select covering this week and eight earlier ones.
import { label as shortDate, weekRange } from "../../lib/metrics";

export const MAX_WEEKS_BACK = 8;

/** Offsets 0 (this week) down to -MAX_WEEKS_BACK. */
export const weekRanges = (today) =>
  Array.from({ length: MAX_WEEKS_BACK + 1 }, (_, k) => weekRange(today, -k));

/** One option per week: "This week", "Last week", then "Week of 28 Sep". */
export const weekOptions = (ranges) =>
  ranges.map((range, i) => ({
    value: String(i),
    label: i === 0 ? "This week" : i === 1 ? "Last week" : `Week of ${shortDate(range.from)}`,
  }));

export const rangeLabel = (range) => `${shortDate(range.from)} to ${shortDate(range.to)}`;
