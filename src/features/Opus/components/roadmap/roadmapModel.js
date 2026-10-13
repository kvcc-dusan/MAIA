// Turns a project plus its tasks into what the roadmap draws: lanes of
// milestones, the unscheduled ones, labels and month groups. Pure.
import { MILESTONE_STATUSES, WORKSTREAM_COLORS } from "../../lib/projectModel.js";
import { dayNumber, formatDay } from "./geometry.js";

export const UNASSIGNED_LANE_ID = "__unassigned__";

export const STATUS_LABELS = { planned: "Planned", active: "Active", "at-risk": "At risk", done: "Done" };
export const STATUS_OPTIONS = MILESTONE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
export const WORKSTREAM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
];
export const workstreamStatusLabel = (status) =>
  WORKSTREAM_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Active";

/** Badge tone per milestone status: accent for active, status colours otherwise. */
export const STATUS_TONES = { planned: "neutral", active: "info", "at-risk": "warning", done: "success" };

export const seriesColor = (color) => `var(--series-${WORKSTREAM_COLORS.includes(String(color)) ? color : "1"})`;

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const pluralize = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

const taskStats = (tasks, projectId) => {
  const stats = new Map();
  tasks.forEach((t) => {
    if (t.projectId !== projectId || !t.milestoneId) return;
    const prev = stats.get(t.milestoneId) ?? { total: 0, done: 0 };
    stats.set(t.milestoneId, { total: prev.total + 1, done: prev.done + (t.status === "done" ? 1 : 0) });
  });
  return stats;
};

export const statsText = (stats) => (stats.total ? `${stats.done} of ${stats.total} tasks done` : "No tasks linked");

/** "Oct 3 to Oct 20", or "due Oct 3" for a marker or a milestone with no start. */
export const rangeText = (m, referenceYear = null) => {
  if (m.dueDay === null) return m.startDay === null ? "No dates" : `starts ${formatDay(m.startDay, referenceYear)}`;
  if (m.startDay !== null && m.startDay !== m.dueDay) {
    return `${formatDay(m.startDay, referenceYear)} to ${formatDay(m.dueDay, referenceYear)}`;
  }
  return `due ${formatDay(m.dueDay, referenceYear)}`;
};

export const ariaLabelFor = (m, referenceYear = null) =>
  `${m.title}, ${STATUS_LABELS[m.status].toLowerCase()}, ${rangeText(m, referenceYear)}, ${
    m.workstreamName ? `workstream ${m.workstreamName}` : "no workstream"
  }`;

/**
 * Lanes follow workstream order; the unassigned lane appears only when a
 * scheduled milestone needs it. A milestone pointing at a workstream that no
 * longer exists counts as unassigned.
 */
export const buildRoadmap = (project, tasks = []) => {
  const workstreams = [...project.workstreams].sort(byOrder);
  const names = new Map(workstreams.map((w) => [w.id, w.name]));
  const stats = taskStats(tasks, project.id);

  const milestones = project.milestones.map((m) => {
    const workstreamId = names.has(m.workstreamId) ? m.workstreamId : null;
    return {
      ...m,
      title: m.title || "Untitled milestone",
      workstreamId,
      workstreamName: workstreamId ? names.get(workstreamId) : "",
      startDay: dayNumber(m.start),
      dueDay: dayNumber(m.date),
      stats: stats.get(m.id) ?? { total: 0, done: 0 },
    };
  });

  const byDue = (a, b) => a.dueDay - b.dueDay || a.title.localeCompare(b.title);
  const scheduled = milestones.filter((m) => m.dueDay !== null).sort(byDue);
  const unscheduled = milestones.filter((m) => m.dueDay === null);

  const lanes = workstreams.map((w) => ({
    id: w.id,
    name: w.name,
    owner: w.owner,
    status: w.status,
    color: seriesColor(w.color),
    workstream: w,
    milestones: scheduled.filter((m) => m.workstreamId === w.id),
  }));
  const loose = scheduled.filter((m) => m.workstreamId === null);
  if (loose.length > 0) {
    lanes.push({ id: UNASSIGNED_LANE_ID, name: "Unassigned", owner: "", status: null, color: "var(--text-muted)", workstream: null, milestones: loose });
  }

  return { lanes, scheduled, unscheduled, workstreams };
};

/** Scheduled milestones grouped by the month they are due, for the narrow list. */
export const groupByMonth = (scheduled) => {
  const groups = [];
  scheduled.forEach((m) => {
    const key = m.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: `${MONTH_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, items: [m] });
  });
  return groups;
};

/** What deleting a workstream unassigns, for the confirmation copy. */
export const unassignText = ({ milestones, tasks, decisions, questions }) => {
  const parts = [
    milestones && pluralize(milestones, "milestone"),
    tasks && pluralize(tasks, "task"),
    decisions && pluralize(decisions, "decision"),
    questions && pluralize(questions, "question"),
  ].filter(Boolean);
  if (parts.length === 0) return "Nothing is assigned to it.";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `Its ${list} become unassigned. None of them are deleted.`;
};
export const workstreamMenuId = (id) => `roadmap-ws-menu-${id}`;
