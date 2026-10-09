// Weekly report as markdown. Pure port of HUB.reportMarkdown (projecthub
// view-reports.js): no DOM, no state. The caller saves the result as a note.
import { weekSummary, projection, day } from "./metrics.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (s) => {
  if (!s) return "No date";
  const [, m, d] = day(s).split("-");
  return `${+d} ${MONTHS[+m - 1]}`;
};

// UTC on purpose: the date strings are plain calendar days, not instants.
const formatWeekday = (s) => {
  if (!s) return "No date";
  return `${WEEKDAYS[new Date(`${day(s)}T00:00:00Z`).getUTCDay()]} ${formatDate(s)}`;
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const withOwner = (text, owner) => (owner ? `${text} (owner: ${owner})` : text);

const progressLine = (summary, targetDate) => {
  const { overallPct, finishDate } = summary;
  const parts = [
    `${plural((summary.done || []).length, "task", "tasks")} done`,
    `${(summary.started || []).length} started`,
    `${(summary.slipped || []).length} slipped`,
  ];
  let line = `${parts.join(", ")}.`;
  if (overallPct != null) line += ` Overall ${overallPct}% done`;
  if (finishDate) {
    line += `${overallPct != null ? "; " : " "}forecast finish ${formatDate(finishDate)}`;
    if (targetDate) line += ` (target ${formatDate(targetDate)})`;
  } else if (overallPct != null && targetDate) {
    line += `; target ${formatDate(targetDate)}`;
  }
  if (overallPct != null || finishDate) line += ".";
  return line;
};

// Each section is [heading, items, isPlainText]. Plain sections render
// without bullets; empty sections are dropped.
const buildSections = (summary, workstreamName) => {
  const withWorkstream = (t) => {
    const ws = workstreamName(t.workstreamId ?? t.workstream);
    return ws ? `${t.title} (${ws})` : t.title;
  };
  const ms = summary.milestones || {};
  const msDate = (m) => m.date ?? m.due;
  const milestoneItems = [
    ...(ms.hit || []).map((m) => `Hit: ${m.title} (${formatDate(msDate(m))})`),
    ...(ms.due || []).map((m) => `Due soon: ${m.title} (${formatDate(msDate(m))})`),
    ...(ms.atRisk || []).map((m) => `At risk: ${m.title} (due ${formatDate(msDate(m))})`),
  ];
  const blockerItems = [
    ...(summary.blockers || []).map((t) => withOwner(t.title, t.owner)),
    ...(summary.blockingQuestions || []).map((q) => withOwner(`Question: ${q.question || "Untitled"}`, q.owner)),
  ];
  const nextWeekItem = (t) => [t.title, t.owner, formatWeekday(t.due)].filter(Boolean).join(", ");

  return [
    ["Done", (summary.done || []).map(withWorkstream)],
    ["In progress", (summary.started || []).map(withWorkstream)],
    ["Slipped", (summary.slipped || []).map((t) => `${t.title} (was due ${formatDate(t.due)})`)],
    ["Blockers", blockerItems.length ? blockerItems : ["Nothing blocking."], !blockerItems.length],
    ["Decisions", (summary.decisions || []).map((d) => `${d.title} (${formatDate(d.date)})`)],
    ["Milestones", milestoneItems],
    ["Next week", (summary.nextWeek || []).map(nextWeekItem)],
  ].filter(([, items]) => items.length);
};

/**
 * @param {{
 *   project?: { name?: string, targetDate?: string|null, workstreams?: any[] },
 *   summary?: object,   // buildReportSummary(...) or metrics.weekSummary(...)
 *   range: { from: string, to: string },
 *   workstreams?: any[] // defaults to project.workstreams
 * }} input
 */
export const reportMarkdown = ({ project, summary, range, workstreams }) => {
  const sum = summary || {};
  const meta = project || {};
  const names = new Map((workstreams ?? meta.workstreams ?? []).map((w) => [w.id, w.name]));
  const workstreamName = (id) => (id ? names.get(id) || "" : "");

  const out = [
    `# ${meta.name || "Project"}: status, week of ${formatDate(range.from)}`,
    "",
    progressLine(sum, meta.targetDate),
  ];
  buildSections(sum, workstreamName).forEach(([heading, items, isPlain]) => {
    out.push("", `## ${heading}`, "");
    out.push(...(isPlain ? items : items.map((i) => `- ${i}`)));
  });
  return `${out.join("\n")}\n`;
};

/**
 * Week summary plus the two numbers the report headline needs: overall
 * progress as of the end of the range, and a forecast finish when the range
 * contains today. `tasks` are the project's normalized tasks.
 */
export const buildReportSummary = ({ project, tasks, range, today }) => {
  const meta = project || {};
  const summary = {
    ...weekSummary(
      { tasks, milestones: meta.milestones, decisions: meta.decisions, questions: meta.questions },
      { from: range.from, to: range.to, today },
    ),
  };
  const cutoff = range.to < today ? range.to : today;
  const existing = tasks.filter((t) => !t.createdAt || day(t.createdAt) <= cutoff).length;
  const doneByCutoff = tasks.filter((t) => t.doneAt && day(t.doneAt) <= cutoff).length;
  if (existing) summary.overallPct = Math.round((doneByCutoff / existing) * 100);

  if (range.from <= today && today <= range.to) {
    const { finishDate } = projection(tasks, { today });
    if (finishDate) summary.finishDate = finishDate;
  }
  return summary;
};

/** Title for the vault note the report is saved as. */
export const reportNoteTitle = (project, range) =>
  `Weekly report: ${project?.name || "Project"}, ${range.from}`;
