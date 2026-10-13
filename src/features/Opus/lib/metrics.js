// Pure date and progress math for the Opus dashboard. No DOM, no state reads.
// Port of projecthub/src/metrics.js; `today` is always passed in as "YYYY-MM-DD".
//
// Dates are UTC day numbers, so there is no timezone or DST drift. ISO
// timestamps count by their first 10 characters (their UTC date). Callers pass
// the user's local date as `today`; toDayString builds it.
//
// Tasks are expected in normalized form (taskModel.normalizeTask), which the
// DataContext `tasks` array already is. Two MAIA field names are accepted next
// to the hub's: task.workstreamId (hub: workstream) and milestone.date (hub: due).

const DAY_MS = 864e5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_LABELS = [
  ["todo", "To do"],
  ["doing", "In progress"],
  ["blocked", "Blocked"],
  ["done", "Done"],
];

/* dates */
export const day = (s) => (s ? String(s).slice(0, 10) : "");
const toNum = (s) => {
  const [y, m, d] = day(s).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const fromNum = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
export const addDays = (s, n) => fromNum(toNum(s) + n);
export const diffDays = (a, b) => toNum(a) - toNum(b);
export const weekStart = (s) => addDays(s, -((new Date(toNum(s) * DAY_MS).getUTCDay() + 6) % 7));
export const label = (s) => {
  const [, m, d] = day(s).split("-");
  return `${+d} ${MONTHS[+m - 1]}`;
};
const inRange = (s, from, to) => {
  const d = day(s);
  return !!d && d >= from && d <= to;
};

/** Local calendar date of a Date as "YYYY-MM-DD" (what to pass as `today`). */
export const toDayString = (date) => {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
};

/* task filters */
const workstreamOf = (t) => t.workstreamId ?? t.workstream;
const dueOf = (t) => day(t.due);
const isOpen = (t) => t.status !== "done";
const byDue = (a, b) => (dueOf(a) || "9").localeCompare(dueOf(b) || "9");
const openTasks = (tasks) => tasks.filter(isOpen);

export const overdue = (tasks, today) =>
  openTasks(tasks).filter((t) => dueOf(t) && dueOf(t) < today).sort(byDue);

export const dueWithin = (tasks, days, today) => {
  const end = addDays(today, days);
  return openTasks(tasks).filter((t) => dueOf(t) && dueOf(t) >= today && dueOf(t) <= end).sort(byDue);
};

export const blocked = (tasks) => openTasks(tasks).filter((t) => t.status === "blocked").sort(byDue);

export const statusMix = (tasks) =>
  STATUS_LABELS.map(([key, text]) => ({ key, label: text, value: tasks.filter((t) => t.status === key).length }));

/**
 * perWeek = done tasks in the window / window length in weeks. The window is
 * the `weeks` full weeks before this week plus the current partial week
 * (counted up to and including today), so a quiet Monday doesn't read as zero
 * velocity.
 */
export const projection = (tasks, { today, weeks = 4 }) => {
  const thisWeek = weekStart(today);
  const from = addDays(thisWeek, -7 * weeks);
  const doneInWindow = tasks.filter((t) => t.doneAt && inRange(t.doneAt, from, today)).length;
  const windowWeeks = weeks + (diffDays(today, thisWeek) + 1) / 7;
  const perWeek = Math.round((doneInWindow / windowWeeks) * 10) / 10;
  const remaining = openTasks(tasks).length;
  if (!(doneInWindow > 0)) return { perWeek: 0, remaining, finishDate: null };
  const weeksLeft = Math.ceil(remaining / (doneInWindow / windowWeeks));
  return { perWeek, remaining, finishDate: addDays(today, weeksLeft * 7) };
};

export const workstreamProgress = (workstreams, tasks, today) => {
  const sorted = [...workstreams].sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name)),
  );
  return sorted.map((w, i) => {
    const own = tasks.filter((t) => workstreamOf(t) === w.id);
    const done = own.filter((t) => t.status === "done").length;
    return {
      id: w.id,
      name: w.name,
      color: w.color || String((i % 4) + 1),
      total: own.length,
      done,
      pct: own.length ? Math.round((done / own.length) * 100) : 0,
      overdue: overdue(own, today).length,
      blocked: blocked(own).length,
    };
  });
};

export const throughput = (tasks, { weeks = 8, today }) => {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => {
    const weekStartDate = addDays(first, 7 * i);
    const weekEnd = addDays(weekStartDate, 6);
    const count = tasks.filter((t) => t.doneAt && inRange(t.doneAt, weekStartDate, weekEnd)).length;
    return { weekStart: weekStartDate, label: label(weekStartDate), count };
  });
};

export const heatmap = (activity, { weeks = 26, today }) => {
  const counts = {};
  activity.forEach((a) => {
    const d = day(a.at);
    if (d) counts[d] = (counts[d] || 0) + 1;
  });
  const start = addDays(weekStart(today), -7 * (weeks - 1));
  const days = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push({ date: d, count: counts[d] || 0 });
  return days;
};

export const weekRange = (today, offset = 0) => {
  const from = addDays(weekStart(today), offset * 7);
  return { from, to: addDays(from, 6) };
};

/**
 * state: { tasks, milestones, decisions, questions }. Each bucket holds the
 * original items. `answered` relies on question.updatedAt and milestones.hit on
 * milestone.updatedAt, which the DataContext helpers stamp.
 */
export const weekSummary = (state, { from, to, today }) => {
  const tasks = state.tasks || [];
  const milestones = state.milestones || [];
  const nextFrom = addDays(to, 1);
  const nextTo = addDays(to, 7);
  const open = openTasks(tasks);
  const milestoneDate = (m) => m.date ?? m.due;
  return {
    done: tasks.filter((t) => inRange(t.doneAt, from, to)),
    started: tasks.filter((t) => inRange(t.startedAt, from, to)),
    created: tasks.filter((t) => inRange(t.createdAt, from, to)),
    slipped: open.filter((t) => inRange(t.due, from, to) && dueOf(t) < today).sort(byDue),
    blockers: blocked(tasks),
    blockingQuestions: (state.questions || []).filter((q) => q.status === "open" && q.blocking),
    decisions: (state.decisions || []).filter((d) => inRange(d.date, from, to)),
    answered: (state.questions || []).filter((q) => q.status === "answered" && inRange(q.updatedAt, from, to)),
    nextWeek: open.filter((t) => inRange(t.due, nextFrom, nextTo)).sort(byDue),
    milestones: {
      hit: milestones.filter(
        (m) => m.status === "done" && (inRange(m.updatedAt, from, to) || inRange(milestoneDate(m), from, to)),
      ),
      due: milestones.filter((m) => m.status !== "done" && inRange(milestoneDate(m), from, nextTo)),
      atRisk: milestones.filter((m) => m.status === "at-risk"),
    },
  };
};

/* hub overview and weekly report */

/** Tasks finished this week so far (Monday to today, inclusive). */
export const doneThisWeek = (tasks, today) => {
  const { from } = weekRange(today);
  return tasks.filter((t) => t.doneAt && inRange(t.doneAt, from, today)).length;
};

/** Done counts for the last `weeks` weeks, oldest first; the last one is this week. */
export const weeklyDone = (tasks, { weeks = 8, today }) => throughput(tasks, { weeks, today });

/** Open blocked tasks plus open blocking questions. */
export const blockingSummary = (tasks, questions = []) => {
  const taskCount = blocked(tasks).length;
  const questionCount = questions.filter((q) => q.status === "open" && q.blocking).length;
  return { tasks: taskCount, questions: questionCount, total: taskCount + questionCount };
};

/** Whole days from `today` to the project's target date; negative when past, null without a target. */
export const daysToTarget = (project, today) =>
  project?.targetDate ? diffDays(project.targetDate, today) : null;

/**
 * "just now", "5 minutes ago", "3 hours ago", "yesterday", "2 days ago",
 * "3 weeks ago", "2 months ago". `now` is a Date or ISO string (never read from
 * the clock here).
 */
export const timeAgo = (at, now) => {
  const diff = Math.max(0, new Date(now).getTime() - new Date(at).getTime());
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

