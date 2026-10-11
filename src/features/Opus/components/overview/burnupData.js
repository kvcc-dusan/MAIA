// Builds the rows for the Overview burn-up chart and the sentence under it.
// Pure: the caller passes `today` ("YYYY-MM-DD") and the project's tasks.
//
// One row per day. `scope` is a number on every row (flat after today at
// today's scope). `done` is a number up to today and null after, which the line
// chart draws as a gap. `projected` only exists when there is a forecast: null
// before today, today's `done` on today (so the dashed line joins the solid one),
// then a straight line that reaches the scope line on the forecast date and is
// null after.
//
// The line ends on `projection().finishDate` (which rounds up to whole weeks)
// rather than on perWeek/7 per day. The two differ by up to six days, and a
// chart that finishes before the date printed beneath it reads as a bug.
import { addDays, burnup, day, diffDays, projection } from "../../lib/metrics.js";
import { formatDay, roundTenth } from "./dates.js";

export const MAX_DAYS = 180;
export const AXIS_LABEL_COUNT = 6;

const NO_FORECAST_TEXT = "Not enough finished tasks to forecast";

const latest = (...days) => days.filter(Boolean).reduce((a, b) => (b > a ? b : a));

const firstCreatedDay = (tasks) =>
  tasks.map((t) => day(t.createdAt)).filter(Boolean).sort()[0] ?? null;

/**
 * The chart spans start to max(today, target, forecast), at most MAX_DAYS long.
 * When that is longer, the end is cut. A project older than MAX_DAYS would lose
 * today that way, so it shows the latest MAX_DAYS ending today instead.
 */
const chartWindow = ({ start, today, target, finish }) => {
  const end = latest(today, target, finish);
  if (diffDays(end, start) <= MAX_DAYS) return { from: start, to: end };
  const cut = addDays(start, MAX_DAYS);
  return cut >= today ? { from: start, to: cut } : { from: addDays(today, -MAX_DAYS), to: today };
};

/**
 * About `count` evenly spaced indexes, always including `required` ones (today,
 * the target date). An even pick that sits too close to a required one is
 * dropped so two labels never collide.
 */
export const pickAxisIndexes = (length, required = [], count = AXIS_LABEL_COUNT) => {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const picks = Math.min(count, length);
  const evenly = Array.from({ length: picks }, (_, i) => Math.round((i * (length - 1)) / (picks - 1)));
  const chosen = [...new Set(required.filter((i) => Number.isInteger(i) && i >= 0 && i < length))];
  // One full slot (range / labels): an even pick that close to Today or Target would sit under it and make the spacing uneven.
  const minGap = Math.max(1, Math.floor((length - 1) / picks));
  evenly.forEach((i) => {
    if (chosen.every((c) => Math.abs(c - i) >= minGap)) chosen.push(i);
  });
  return chosen.sort((a, b) => a - b);
};

/**
 * The sentence under the chart. `isLate` is true when the forecast lands after
 * the target date, so the panel can flag it with a text badge.
 */
export const forecastSummary = ({ targetDate, finishDate, perWeek, remaining, total, today }) => {
  if (!total) return { text: "", isLate: false };
  if (remaining === 0) return { text: "All tasks are done", isLate: false };
  const target = day(targetDate) || null;
  if (!finishDate) {
    const lead = target ? `Target ${formatDay(target, today)}. ` : "";
    return { text: `${lead}${NO_FORECAST_TEXT}`, isLate: false };
  }
  const targetPart = target ? `Target ${formatDay(target, today)}` : "No target date";
  const rate = `${roundTenth(perWeek)} ${roundTenth(perWeek) === 1 ? "task" : "tasks"} per week`;
  return {
    text: `${targetPart}, forecast ${formatDay(finishDate, today)}, ${rate}`,
    isLate: Boolean(target) && day(finishDate) > target,
  };
};

const EMPTY = {
  data: [],
  hasProjection: false,
  todayIndex: -1,
  targetIndex: -1,
  forecast: { text: "", isLate: false },
};

const dayLabel = (d, today, target) => {
  const text = formatDay(d, today);
  if (d === today) return `${text} (today)`;
  if (d === target) return `${text} (target)`;
  return text;
};

/**
 * @param {{ tasks: object[], startDate?: string|null, targetDate?: string|null, today: string }} input
 */
export const buildBurnup = ({ tasks, startDate, targetDate, today }) => {
  if (!tasks.length) return EMPTY;

  const requestedStart = day(startDate) || firstCreatedDay(tasks) || today;
  const start = requestedStart > today ? today : requestedStart;
  const target = day(targetDate) || null;

  const forecast = projection(tasks, { today });
  const finish = forecast.remaining > 0 ? forecast.finishDate : null;

  const { from, to } = chartWindow({ start, today, target, finish });
  const past = burnup(tasks, { start: from, end: today, today });
  const lastPast = past[past.length - 1];
  const hasProjection = Boolean(finish) && lastPast.done < lastPast.scope;
  const daysToFinish = hasProjection ? diffDays(finish, today) : 0;

  const projectedOn = (d) => {
    if (!hasProjection || d < today) return null;
    if (d === today) return lastPast.done;
    const elapsed = diffDays(d, today);
    if (elapsed > daysToFinish) return null;
    return lastPast.done + (lastPast.scope - lastPast.done) * (elapsed / daysToFinish);
  };

  const rows = [];
  for (let d = from, i = 0; d <= to; d = addDays(d, 1), i++) {
    const isPast = d <= today;
    const values = {
      scope: isPast ? past[i].scope : lastPast.scope,
      done: isPast ? past[i].done : null,
    };
    if (hasProjection) values.projected = projectedOn(d);
    rows.push({ key: d, label: dayLabel(d, today, target), values });
  }

  const todayIndex = diffDays(today, from);
  const targetIndex = target && target >= from && target <= to ? diffDays(target, from) : -1;
  const labelled = new Set(pickAxisIndexes(rows.length, [todayIndex, targetIndex]));
  const data = rows.map((row, i) => {
    if (!labelled.has(i)) return row;
    return { ...row, axisLabel: row.key === today ? "Today" : formatDay(row.key, today) };
  });

  return {
    data,
    hasProjection,
    todayIndex,
    targetIndex,
    forecast: forecastSummary({
      targetDate: target,
      finishDate: finish,
      perWeek: forecast.perWeek,
      remaining: forecast.remaining,
      total: tasks.length,
      today,
    }),
  };
};

