// Date and count text for the Overview. Dates arrive as "YYYY-MM-DD" (or an ISO
// timestamp, which counts by its first 10 characters, like lib/metrics.js).
// Formatting goes through UTC so a day string never shifts with the time zone.
import { day } from "../../lib/metrics.js";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const withoutYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const withYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const toUtcDate = (value) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/**
 * "Oct 9". The year is added only when it differs from `today`'s, so a forecast
 * that lands next year does not read as this year. Empty or malformed input
 * gives "".
 */
export const formatDay = (value, today) => {
  const d = day(value);
  if (!DAY_PATTERN.test(d)) return "";
  const sameYear = !DAY_PATTERN.test(day(today)) || d.slice(0, 4) === day(today).slice(0, 4);
  return (sameYear ? withoutYear : withYear).format(toUtcDate(d));
};

/** plural(1, "task") is "1 task", plural(3, "task") is "3 tasks". */
export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** One decimal at most, no trailing ".0": 3.2, 3, 0.5. */
export const roundTenth = (n) => Math.round(n * 10) / 10;
