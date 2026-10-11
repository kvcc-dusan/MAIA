// Everything the hub-style Overview shows, in one pure call so the tab can wrap
// it in a single try/catch. `today` is "YYYY-MM-DD", `now` a Date (for "2 days ago").
import {
  averagePerWeek, blockingSummary, day, daysToTarget, doneThisWeek,
  heatmap, label, overdue, projection, statusMix, weeklyDone, workstreamProgress,
} from "../../lib/metrics.js";
import { attentionTasks } from "./attention.js";
import { buildBurnup } from "./burnupData.js";

export const SPARK_WEEKS = 8;
// 52 weeks fills the Arc heatmap's width: its cell size is computed for a full year of columns.
export const HEAT_WEEKS = 52;
export const MAX_ATTENTION = 8;
const TABLE_STEP_DAYS = 7;

const STATUS_COLOR = {
  todo: "var(--text-muted)",
  doing: "var(--series-1)",
  blocked: "var(--danger)",
  done: "var(--success)",
};

const roundTenth = (n) => Math.round(n * 10) / 10;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "At 4.9 tasks a week, the open work finishes around 28 Nov", plus whether that is after the target. */
export const forecastSentence = ({ tasks, targetDate, today }) => {
  if (!tasks.length) return { text: "", isLate: false };
  const { perWeek, remaining, finishDate } = projection(tasks, { today });
  if (remaining === 0) return { text: "All tasks are done", isLate: false };
  if (!finishDate) return { text: "Not enough finished work to forecast yet", isLate: false };
  const rate = roundTenth(perWeek);
  return {
    text: `At ${rate} ${rate === 1 ? "task" : "tasks"} a week, the open work finishes around ${label(finishDate)}`,
    isLate: Boolean(day(targetDate)) && finishDate > day(targetDate),
    finishDate,
  };
};

/** Busiest day of the heatmap window, or null when nothing changed. */
export const heatSummary = (days) => {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return { total, busiest: null, text: "No changes in the past year" };
  const busiest = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);
  return {
    total,
    busiest,
    text: `Busiest day ${label(busiest.date)}, ${plural(busiest.count, "change")}.`,
  };
};

/** Rows for the accessible burn-up table: weekly, plus today, the target and the last day. */
export const burnupTableRows = (burnup) => {
  const { data, todayIndex, targetIndex } = burnup;
  const keep = new Set([0, data.length - 1, todayIndex, targetIndex]);
  data.forEach((_, i) => { if (i % TABLE_STEP_DAYS === 0) keep.add(i); });
  return [...keep]
    .filter((i) => i >= 0 && i < data.length)
    .sort((a, b) => a - b)
    .map((i) => ({ key: data[i].key, label: label(data[i].key), mark: i === todayIndex ? "Today" : i === targetIndex ? "Target" : "", ...data[i].values }));
};

/** Latest scope, done and projected-finish values for the legend. */
export const burnupLegend = (burnup, today) => {
  const row = burnup.data[burnup.todayIndex] ?? burnup.data[burnup.data.length - 1];
  const items = [
    { key: "scope", label: "Scope", color: "var(--text-muted)", value: row?.values.scope ?? 0 },
    { key: "done", label: "Done", color: "var(--series-2)", value: row?.values.done ?? 0 },
  ];
  if (burnup.hasProjection) {
    const end = [...burnup.data].reverse().find((r) => r.values.projected != null);
    items.push({ key: "projected", label: "Projected", color: "var(--series-2)", dashed: true, value: roundTenth(end?.values.projected ?? 0), note: end ? `by ${label(end.key)}` : "" });
  }
  return items.map((i) => ({ ...i, today }));
};

export const buildHubOverview = ({ project, tasks, activity, today }) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const weekly = weeklyDone(tasks, { weeks: SPARK_WEEKS, today });
  const blocking = blockingSummary(tasks, project.questions);
  const burnup = buildBurnup({ tasks, startDate: project.startDate, targetDate: project.targetDate, today });
  // Today already carries an axis label; the target gets its own so both read as markers.
  const targetKey = burnup.targetIndex >= 0 ? burnup.data[burnup.targetIndex]?.key : null;
  const data = burnup.data.map((row) => (row.key === targetKey ? { ...row, axisLabel: "Target" } : row));
  const projectActivity = activity.filter((a) => a.projectId === project.id);
  const heat = heatmap(projectActivity, { weeks: HEAT_WEEKS, today });
  const attention = attentionTasks(tasks, today, MAX_ATTENTION);
  const mix = statusMix(tasks).map((s) => ({
    ...s,
    color: STATUS_COLOR[s.key],
    pct: total ? Math.round((s.value / total) * 100) : 0,
  }));
  const finalBurnup = { ...burnup, data };

  return {
    isEmpty: total === 0,
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0,
    daysToTarget: daysToTarget(project, today),
    tiles: {
      open,
      doing: tasks.filter((t) => t.status === "doing").length,
      thisWeek: doneThisWeek(tasks, today),
      weekly,
      average: averagePerWeek(weekly),
      overdue: overdue(tasks, today).length,
      blocking,
    },
    burnup: finalBurnup,
    legend: burnupLegend(finalBurnup, today),
    tableRows: burnupTableRows(finalBurnup),
    forecast: forecastSentence({ tasks, targetDate: project.targetDate, today }),
    mix,
    progress: workstreamProgress(project.workstreams, tasks, today),
    attention,
    heat: { days: heat, summary: heatSummary(heat), total: projectActivity.length },
  };
};
