// Everything the hub-style Overview shows, in one pure call so the tab can wrap
// it in a single try/catch. `today` is "YYYY-MM-DD", `now` a Date (for "2 days ago").
import {
  blockingSummary, day, daysToTarget, doneThisWeek,
  heatmap, label, overdue, projection, statusMix, workstreamProgress,
} from "../../lib/metrics.js";
import { attentionTasks } from "./attention.js";

// 52 weeks fills the Arc heatmap's width: its cell size is computed for a full year of columns.
export const HEAT_WEEKS = 52;
export const MAX_ATTENTION = 8;

// Monochrome on purpose: shades of grey for the three calm states, red only for Blocked.
const STATUS_COLOR = {
  todo: "var(--border-strong)",
  doing: "var(--text-muted)",
  blocked: "var(--danger)",
  done: "var(--foreground)",
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

export const buildHubOverview = ({ project, tasks, activity, today }) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const blocking = blockingSummary(tasks, project.questions);
  const projectActivity = activity.filter((a) => a.projectId === project.id);
  const heat = heatmap(projectActivity, { weeks: HEAT_WEEKS, today });
  const attention = attentionTasks(tasks, today, MAX_ATTENTION);
  const mix = statusMix(tasks).map((s) => ({ ...s, color: STATUS_COLOR[s.key] }));

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
      overdue: overdue(tasks, today).length,
      blocking,
    },
    forecast: forecastSentence({ tasks, targetDate: project.targetDate, today }),
    mix,
    progress: workstreamProgress(project.workstreams, tasks, today),
    attention,
    heat: { days: heat, summary: heatSummary(heat), total: projectActivity.length },
  };
};
