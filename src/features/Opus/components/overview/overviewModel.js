// Everything the Overview shows, computed in one pure call so it can be tested
// and wrapped in a single try/catch by the tab.
import { blocked, cycleTime, heatmap, overdue, statusMix, workstreamProgress } from "../../lib/metrics.js";
import { attentionTasks } from "./attention.js";
import { buildBurnup } from "./burnupData.js";
import { plural } from "./dates.js";
import { gaugeDetail, gaugeTone } from "./gaugeTone.js";
import { upcomingMilestones } from "./upcomingMilestones.js";

export const HEATMAP_WEEKS = 26;

// Blocked is danger, overdue is warning everywhere (gauges, badges); status
// colors here always sit next to their text label in the legend.
const STATUS_COLOR = {
  todo: "var(--text-muted)",
  doing: "var(--series-1)",
  blocked: "var(--danger)",
  done: "var(--success)",
};

const daysText = (n) => plural(n, "day");

const blockedContext = (blockedCount, questionCount) => {
  const questions = questionCount ? plural(questionCount, "blocking question") : "";
  if (!blockedCount && !questionCount) return "Nothing is blocked";
  if (!blockedCount) return `No blocked tasks, ${questions} open`;
  return questions ? `Cannot move forward, plus ${questions}` : "Cannot move forward yet";
};

const cycleContext = ({ n, p85 }, doneCount) => {
  if (n > 0) return `85% finish within ${daysText(p85)}, from ${plural(n, "task")}`;
  return doneCount > 0 ? "Finished tasks have no start date yet" : "No finished tasks yet";
};

export const buildMetricCards = ({ tasks, project, today }) => {
  const open = tasks.filter((t) => t.status !== "done");
  const doing = tasks.filter((t) => t.status === "doing").length;
  const doneCount = tasks.length - open.length;
  const late = overdue(tasks, today);
  const stuck = blocked(tasks);
  const questions = project.questions.filter((q) => q.status === "open" && q.blocking).length;
  const cycle = cycleTime(tasks);
  const median = Math.round(cycle.median);
  const oldest = late[0] ? Math.max(0, Math.round((Date.parse(today) - Date.parse(String(late[0].due).slice(0, 10))) / 864e5)) : 0;

  return [
    {
      id: "open", label: "Open tasks", value: open.length, suffix: "",
      context: `${doing} in progress, ${tasks.length} in total`,
      nav: { tab: "tasks", params: {}, label: "Show open tasks" },
    },
    {
      id: "overdue", label: "Overdue", value: late.length, suffix: "",
      context: late.length ? `Oldest is ${daysText(oldest)} late` : "Nothing is overdue",
      nav: { tab: "tasks", params: { status: "overdue" }, label: "Show overdue tasks" },
    },
    {
      id: "blocked", label: "Blocked", value: stuck.length, suffix: "",
      context: blockedContext(stuck.length, questions),
      nav: { tab: "tasks", params: { status: "blocked" }, label: "Show blocked tasks" },
    },
    {
      id: "cycle", label: "Median cycle time in days", value: cycle.n ? median : 0, suffix: "",
      context: cycleContext(cycle, doneCount),
      nav: null,
    },
  ];
};

export const buildOverviewModel = ({ project, tasks, activity, today }) => {
  const progress = workstreamProgress(project.workstreams, tasks, today).map((p) => ({
    ...p,
    tone: gaugeTone(p),
    detail: gaugeDetail(p),
  }));
  const projectActivity = activity.filter((a) => a.projectId === project.id);
  const heat = heatmap(projectActivity, { weeks: HEATMAP_WEEKS, today });

  return {
    isEmpty: tasks.length === 0,
    cards: buildMetricCards({ tasks, project, today }),
    burnup: buildBurnup({ tasks, startDate: project.startDate, targetDate: project.targetDate, today }),
    mix: statusMix(tasks).map((s) => ({ ...s, color: STATUS_COLOR[s.key] })),
    progress,
    heat: { days: heat, total: projectActivity.length },
    milestones: upcomingMilestones(project.milestones, project.workstreams, today),
    attention: attentionTasks(tasks, today),
  };
};
