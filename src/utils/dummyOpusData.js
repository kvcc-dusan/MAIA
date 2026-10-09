// Sample tasks, workstreams, decisions, questions, milestones and activity for
// the Opus dashboard, so burn-up, cycle time and the heatmap have something to
// draw. Dev-only (DataContext.generateSamples). Everything is derived from
// `today` plus a seeded PRNG, so the shapes and counts are reproducible.
import { applyTaskPatch } from "../features/Opus/lib/taskModel.js";
import {
  createWorkstream,
  createProjectDecision,
  createQuestion,
  createMilestone,
  applyQuestionPatch,
  normalizeProject,
} from "../features/Opus/lib/projectModel.js";
import { makeActivityEntry } from "../features/Opus/lib/activityLog.js";
import { uid } from "../lib/ids.js";

const DAY_MS = 864e5;
const HOUR_MS = 36e5;
const HISTORY_DAYS = 70; // roughly ten weeks of task history

// Day offsets are signed: negative is days ago, positive is days ahead.
const PLANS = {
  "Maia Core": {
    phase: "Build",
    startDay: -75,
    targetDay: 35,
    nextMeetingDay: 3,
    taskCount: 40,
    workstreams: [
      {
        name: "Data layer", owner: "Dušan", status: "active",
        titles: ["Normalize task status on read", "Cap the activity log", "Backup round trip", "Vault conflict guard", "Flush debounced writes", "Surface quota errors", "Seed data generator", "Watch vault changes"],
      },
      {
        name: "Interface", owner: "Dušan", status: "active",
        titles: ["Board column drag", "Roadmap lanes", "Empty state pass", "Dialog focus trap", "Heatmap tooltip", "Task filters", "Weekly report dialog", "Narrow window layout"],
      },
      {
        name: "Release", owner: "Ana", status: "planned",
        titles: ["Tauri debug build", "Signing config", "Release checklist", "Changelog draft", "Smoke test on a clean vault", "Deploy to GitHub Pages"],
      },
    ],
    milestones: [
      { title: "Data layer frozen", day: -21, status: "done", ws: 0 },
      { title: "Backup format v2", day: 5, status: "at-risk", ws: 0 },
      { title: "Opus redesign beta", day: 10, status: "active", ws: 1 },
      { title: "Release candidate", day: 30, status: "planned", ws: 2 },
    ],
    decisions: [
      { title: "Notes stay as markdown files", day: -40, by: "Dušan", ws: 0, detail: "The vault is the source of truth; localStorage is only the web fallback." },
      { title: "Embed workstreams on the project", day: -18, by: "Dušan", ws: 0, detail: "No second store, so backup and delete cascade stay simple." },
      { title: "Board uses dnd-kit", day: -3, by: "Dušan", ws: 1, detail: "Already a dependency, and it ships a keyboard sensor." },
    ],
    questions: [
      { question: "Can the activity log live in localStorage long term?", ws: 0, owner: "Dušan", blocking: true },
      { question: "Which week does the report cover on Mondays?", ws: 1, owner: "Dušan", blocking: false },
      { question: "Do we sign the macOS build?", ws: 2, owner: "Ana", blocking: false, answeredDay: -2, answer: "Yes, ad hoc signing for now." },
    ],
  },
  "Project Solaris": {
    phase: "Discovery",
    startDay: -60,
    targetDay: 50,
    nextMeetingDay: 6,
    taskCount: 26,
    workstreams: [
      {
        name: "Research", owner: "Marko", status: "active",
        titles: ["Interview notes pass", "Competitor teardown", "Pricing sketch", "Jobs to be done map", "Survey draft"],
      },
      {
        name: "Prototype", owner: "Ana", status: "active",
        titles: ["Wireframe flow", "Clickable prototype", "Usability session", "Copy review", "Handoff spec", "Token audit"],
      },
    ],
    milestones: [
      { title: "Research readout", day: -7, status: "done", ws: 0 },
      { title: "Prototype review", day: 14, status: "active", ws: 1 },
    ],
    decisions: [
      { title: "Target freelancers first", day: -30, by: "Marko", ws: 0, detail: "Smaller teams decide faster and give sharper feedback." },
    ],
    questions: [
      { question: "Is a free tier viable?", ws: 0, owner: "Marko", blocking: true },
    ],
  },
  "Personal Growth": {
    phase: null,
    startDay: -50,
    targetDay: null,
    nextMeetingDay: null,
    taskCount: 8,
    workstreams: [],
    fallbackTitles: ["Read two chapters", "Weekly review", "Gym session", "Plan the month", "Journal entry", "Learn a Rust module"],
    milestones: [],
    decisions: [],
    questions: [],
  },
};

// Small, fast, seedable PRNG (mulberry32).
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// [done, doing, blocked] odds by task age in days; the remainder stay todo.
// Old tasks are mostly finished, fresh ones mostly open.
const oddsFor = (age) => {
  if (age > 14) return [0.85, 0.05, 0.05];
  if (age > 7) return [0.55, 0.2, 0.1];
  return [0.15, 0.25, 0.1];
};

export const buildOpusSample = ({ projects, today = new Date(), seed = 20261009 }) => {
  const random = createRandom(seed);
  const int = (min, max) => min + Math.floor(random() * (max - min + 1));
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dayString = (offset) => new Date(base + offset * DAY_MS).toISOString().slice(0, 10);
  // Due dates are stored like the Chronos form writes them: ISO timestamps.
  const dueStamp = (offset) => new Date(base + offset * DAY_MS + 12 * HOUR_MS).toISOString();
  const stamp = (offset, hour = int(8, 17)) =>
    new Date(base + offset * DAY_MS + hour * HOUR_MS + int(0, 59) * 60000).toISOString();

  const activity = [];
  const log = (project, kind, collection, item, title, at, from, to) =>
    activity.push(makeActivityEntry({ kind, collection, itemId: item.id, projectId: project.id, title, from, to }, at));

  const pickStatus = (age) => {
    const [done, doing, blocked] = oddsFor(age);
    const roll = random();
    if (roll < done) return "done";
    if (roll < done + doing) return "doing";
    if (roll < done + doing + blocked) return "blocked";
    return "todo";
  };

  const buildTask = (project, plan, workstreams, milestones, index) => {
    const groupCount = workstreams.length;
    const group = groupCount ? index % groupCount : null;
    const titles = group === null ? plan.fallbackTitles : plan.workstreams[group].titles;
    const nth = Math.floor(index / Math.max(1, groupCount));
    const title = titles[nth % titles.length] + (nth >= titles.length ? ` ${Math.floor(nth / titles.length) + 1}` : "");

    const age = Math.round(HISTORY_DAYS - (index * (HISTORY_DAYS - 1)) / Math.max(1, plan.taskCount - 1));
    const status = pickStatus(age);
    const createdDay = -age;
    const startedDay = Math.min(0, createdDay + int(0, 4));
    const cycleDays = random() < 0.6 ? int(1, 3) : int(4, 9);
    const doneDay = Math.min(0, startedDay + cycleDays);

    const own = group === null ? [] : milestones.filter((_, i) => plan.milestones[i].ws === group);
    const milestone = own.length && random() < 0.6 ? own[nth % own.length] : null;
    const dueDay = status === "done" ? doneDay + int(-2, 3) : int(-6, 14);
    const hasDue = random() < (status === "done" ? 0.4 : 0.7);

    const createdAt = stamp(createdDay, 8);
    const startedAt = status === "todo" || (status === "blocked" && random() < 0.5) ? null : stamp(startedDay, 9);
    const doneAt = status === "done" ? stamp(doneDay, 16) : null;
    const task = applyTaskPatch(null, {
      id: uid(),
      title,
      desc: "",
      projectId: project.id,
      workstreamId: group === null ? null : workstreams[group].id,
      milestoneId: milestone ? milestone.id : null,
      estimate: ["S", "S", "M", "M", "L"][int(0, 4)],
      priority: ["p1", "p2", "p3"][int(0, 2)],
      order: index,
      isNextAction: false,
      schedule: status === "done" ? "today" : dueDay <= 1 ? "today" : dueDay <= 7 ? "soon" : "future",
      due: hasDue ? dueStamp(dueDay) : null,
      status,
      createdAt,
      startedAt,
      doneAt,
    }, createdAt);

    // Activity trail that matches the timestamps above.
    log(project, "created", "tasks", task, title, createdAt);
    const wasStarted = startedAt && !(doneAt && startedAt === doneAt);
    if (wasStarted) log(project, "status", "tasks", task, title, startedAt, "todo", "doing");
    if (status === "blocked") {
      const blockedDay = Math.min(0, (startedAt ? startedDay : createdDay) + 1);
      log(project, "status", "tasks", task, title, stamp(blockedDay, 17), startedAt ? "doing" : "todo", "blocked");
    }
    if (doneAt) log(project, "status", "tasks", task, title, doneAt, wasStarted ? "doing" : "todo", "done");
    // Late in the day, so an edit never sorts before the task's own creation.
    if (random() < 0.35) log(project, "updated", "tasks", task, title, stamp(Math.min(0, createdDay + int(0, age)), 17));
    return task;
  };

  const buildProject = (project) => {
    const plan = PLANS[project.name];
    if (!plan) return { project, tasks: [] };

    const workstreams = [];
    plan.workstreams.forEach((spec) => {
      workstreams.push(createWorkstream(workstreams, { name: spec.name, owner: spec.owner, status: spec.status }));
    });
    workstreams.forEach((ws) => log(project, "created", "workstreams", ws, ws.name, stamp(plan.startDay)));

    const milestones = plan.milestones.map((spec) => {
      const created = stamp(plan.startDay + 1);
      const milestone = createMilestone({
        title: spec.title,
        date: dayString(spec.day),
        workstreamId: spec.ws === null ? null : workstreams[spec.ws].id,
        status: spec.status,
      }, spec.status === "done" ? stamp(spec.day) : created);
      log(project, "created", "milestones", milestone, spec.title, created);
      if (spec.status === "done") log(project, "status", "milestones", milestone, spec.title, milestone.updatedAt, "planned", "done");
      return milestone;
    });

    const decisions = plan.decisions.map((spec) => {
      const decision = createProjectDecision({
        title: spec.title, by: spec.by, detail: spec.detail,
        date: dayString(spec.day), workstreamId: workstreams[spec.ws].id,
      });
      log(project, "created", "decisions", decision, spec.title, stamp(spec.day));
      return decision;
    });

    const questions = plan.questions.map((spec) => {
      const createdAt = stamp(spec.answeredDay === undefined ? -int(1, 12) : spec.answeredDay - 5);
      let question = createQuestion({
        question: spec.question, owner: spec.owner, blocking: spec.blocking, workstreamId: workstreams[spec.ws].id,
      }, createdAt);
      log(project, "created", "questions", question, spec.question, createdAt);
      if (spec.answeredDay !== undefined) {
        const answeredAt = stamp(spec.answeredDay);
        question = applyQuestionPatch(question, { status: "answered", answer: spec.answer }, answeredAt);
        log(project, "status", "questions", question, spec.question, answeredAt, "open", "answered");
      }
      return question;
    });

    const tasks = Array.from({ length: plan.taskCount }, (_, i) => buildTask(project, plan, workstreams, milestones, i));
    // One next action per project: the oldest open task that is not blocked.
    const next = tasks.findIndex((t) => t.status === "todo" || t.status === "doing");
    if (next >= 0) tasks[next] = { ...tasks[next], isNextAction: true };

    return {
      tasks,
      project: normalizeProject({
        ...project,
        phase: plan.phase,
        startDate: dayString(plan.startDay),
        targetDate: plan.targetDay === null ? null : dayString(plan.targetDay),
        nextMeeting: plan.nextMeetingDay === null ? null : dayString(plan.nextMeetingDay),
        workstreams,
        milestones,
        decisions,
        questions,
      }),
    };
  };

  const built = projects.map(buildProject);
  return {
    projects: built.map((b) => b.project),
    tasks: built.flatMap((b) => b.tasks),
    activity: activity.sort((a, b) => a.at.localeCompare(b.at)),
  };
};
