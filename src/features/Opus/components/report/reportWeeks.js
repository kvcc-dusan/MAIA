// Week choices for the report page: this week, last week, and eight older weeks in a select.
import { label as shortDate, weekRange } from "../../lib/metrics";

export const MAX_WEEKS_BACK = 8;
export const OLDER_PLACEHOLDER = "Older weeks";

/** Offsets 0 (this week) down to -MAX_WEEKS_BACK. */
export const weekRanges = (today) =>
  Array.from({ length: MAX_WEEKS_BACK + 1 }, (_, k) => weekRange(today, -k));

/** "Week of 28 Sep" options for the weeks before last (2 to 8 weeks back). */
export const olderWeekOptions = (ranges) =>
  ranges.slice(2).map((range, i) => ({ value: String(i + 2), label: `Week of ${shortDate(range.from)}` }));

export const rangeLabel = (range) => `${shortDate(range.from)} to ${shortDate(range.to)}`;

/** Value for the This/Last chips: "0", "1", or "" when an older week is chosen. */
export const chipValue = (weeksBack) => (weeksBack <= 1 ? String(weeksBack) : "");

export const tileFacts = (summary) => {
  const done = (summary.done ?? []).length;
  const started = (summary.started ?? []).length;
  const slipped = (summary.slipped ?? []).length;
  const blocking = (summary.blockers ?? []).length + (summary.blockingQuestions ?? []).length;
  return { done, started, slipped, blocking };
};
