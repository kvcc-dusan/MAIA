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
    headline: "A local-first workspace where notes, tasks and projects live in one vault.",
    focus: "Freeze the data layer, ship the Opus hub, then cut a release candidate.",
    people: ["Lea Horvat", "Marko Novak", "Tim Berger", "Sara Vidmar", "Ana Kovac"],
    startDay: -75,
    targetDay: 35,
    nextMeetingDay: 3,
    taskCount: 40,
    workstreams: [
      {
        name: "Data layer", owner: "Lea Horvat", status: "active",
        titles: ["Normalize task status on read", "Cap the activity log", "Backup round trip", "Vault conflict guard", "Flush debounced writes", "Surface quota errors", "Seed data generator", "Watch vault changes"],
      },
      {
        name: "Interface", owner: "Sara Vidmar", status: "active",
        titles: ["Board column drag", "Roadmap lanes", "Empty state pass", "Dialog focus trap", "Heatmap tooltip", "Task filters", "Weekly report dialog", "Narrow window layout"],
      },
      {
        name: "Release", owner: "Tim Berger", status: "planned",
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
      { title: "Notes stay as markdown files", day: -58, by: "Lea Horvat", ws: 0, detail: "The vault is the source of truth; localStorage is only the web fallback." },
      { title: "Ship desktop first, web second", day: -49, by: "Marko Novak", ws: 2, detail: "Tauri is the primary target; the PWA gets the same code with a storage fallback." },
      { title: "Embed workstreams on the project", day: -40, by: "Lea Horvat", ws: 0, detail: "No second store, so backup and delete cascade stay simple." },
      { title: "Adopt the Arc design system", day: -31, by: "Sara Vidmar", ws: 1, detail: "One set of tokens and components instead of a growing pile of one-offs." },
      { title: "Drop Three.js from the graph", day: -22, by: "Sara Vidmar", ws: 1, detail: "D3 in SVG is enough for the node counts we see." },
      { title: "Weekly report covers Monday to Sunday", day: -12, by: "Ana Kovac", ws: 1, detail: "Matches how the team reads the Friday summary." },
      { title: "Board uses dnd-kit", day: -3, by: "Tim Berger", ws: 1, detail: "Already a dependency, and it ships a keyboard sensor." },
    ],
    questions: [
      { question: "Can the activity log live in localStorage long term?", ws: 0, owner: "Lea Horvat", blocking: true },
      { question: "Which week does the report cover on Mondays?", ws: 1, owner: "Sara Vidmar", blocking: false },
      { question: "Who owns the release checklist?", ws: 2, owner: "Tim Berger", blocking: true },
      { question: "Do we sign the macOS build?", ws: 2, owner: "Ana Kovac", blocking: false, answeredDay: -2, answer: "Yes, ad hoc signing for now." },
      { question: "Is the vault format stable enough to freeze?", ws: 0, owner: "Marko Novak", blocking: false, answeredDay: -20, answer: "Yes, frontmatter keys are additive from here on." },
    ],
    docs: [
      { title: "Opus hub plan", kind: "plan", status: "current", day: -30, updatedDay: -4, ws: 1, owner: "Sara Vidmar", content: "# Opus hub plan\n\nOverview, board, tasks, roadmap, decisions, questions, documents, notes and the weekly report." },
      { title: "Vault format spec", kind: "spec", status: "current", day: -55, updatedDay: -15, ws: 0, owner: "Lea Horvat", content: "# Vault format spec\n\nOne markdown file per note, frontmatter for metadata." },
      { title: "Release checklist", kind: "plan", status: "notStarted", day: -9, updatedDay: -9, ws: 2, owner: "Tim Berger", content: "# Release checklist\n\nSigning, changelog, smoke test." },
      { title: "Competitor teardown", kind: "research", status: "draft", day: -26, updatedDay: -11, ws: null, owner: "Marko Novak", content: "# Competitor teardown\n\nWhat other local-first tools get right." },
      { title: "Launch brief", kind: "brief", status: "draft", day: -6, updatedDay: -2, ws: 2, owner: "Ana Kovac", content: "# Launch brief\n\nAudience, message and timing." },
      { title: "Old backup format", kind: "spec", status: "superseded", day: -70, updatedDay: -35, ws: 0, owner: "Lea Horvat", content: "# Old backup format\n\nReplaced by format v2." },
    ],
    notes: [
      { title: "Standup 6 Oct", day: -3, content: "Backup v2 is at risk. Lea checks the restore path first." },
      { title: "Idea: share a vault read-only", day: -8, content: "Maybe a static export that opens in the web build." },
      { title: "Retro, September", day: -21, content: "Good: fewer regressions. Bad: too many half-migrated screens." },
      { title: "Questions for the pilot users", day: -34, content: "How do they organise notes today? What makes them leave a tool?" },
    ],
  },
  "Project Solaris": {
    phase: "Discovery",
    headline: "A planning tool for freelancers who juggle several clients at once.",
    focus: "Finish the prototype review and decide whether a free tier is viable.",
    people: ["Marko Novak", "Ana Kovac"],
    startDay: -60,
    targetDay: 50,
    nextMeetingDay: 6,
    taskCount: 26,
    workstreams: [
      {
        name: "Research", owner: "Marko Novak", status: "active",
        titles: ["Interview notes pass", "Competitor teardown", "Pricing sketch", "Jobs to be done map", "Survey draft"],
      },
      {
        name: "Prototype", owner: "Ana Kovac", status: "active",
        titles: ["Wireframe flow", "Clickable prototype", "Usability session", "Copy review", "Handoff spec", "Token audit"],
      },
    ],
    milestones: [
      { title: "Research readout", day: -7, status: "done", ws: 0 },
      { title: "Prototype review", day: 14, status: "active", ws: 1 },
    ],
    decisions: [
      { title: "Target freelancers first", day: -30, by: "Marko Novak", ws: 0, detail: "Smaller teams decide faster and give sharper feedback." },
    ],
    questions: [
      { question: "Is a free tier viable?", ws: 0, owner: "Marko Novak", blocking: true },
      { question: "Which tool do freelancers use for invoices today?", ws: 0, owner: "Ana Kovac", blocking: false, answeredDay: -9, answer: "Mostly spreadsheets and one popular invoicing app." },
    ],
    docs: [
      { title: "Interview synthesis", kind: "research", status: "current", day: -25, updatedDay: -8, ws: 0, owner: "Marko Novak", content: "# Interview synthesis\n\nFive themes from twelve interviews." },
      { title: "Prototype brief", kind: "brief", status: "draft", day: -14, updatedDay: -5, ws: 1, owner: "Ana Kovac", content: "# Prototype brief\n\nScope of the clickable prototype." },
    ],
    notes: [
      { title: "Call with a freelancer", day: -12, content: "Wants one calendar for all clients." },
      { title: "Naming ideas", day: -20, content: "Solaris is a working name only." },
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

const TASK_DESCRIPTIONS = [
  "Scope it first, then write the smallest version that works.",
  "",
  "Check the edge cases on a narrow window.",
  "Needs a review before it merges.",
  "",
  "Follow up with the owner if it slips past Friday.",
];

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
    const people = plan.people ?? [];
    // Deterministic on purpose: owners must not shift the seeded random sequence.
    const owner = people.length && index % 9 !== 4 ? people[(index + Math.floor(index / 3)) % people.length] : null;
    const task = applyTaskPatch(null, {
      id: uid(),
      title,
      desc: TASK_DESCRIPTIONS[index % TASK_DESCRIPTIONS.length],
      owner,
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
    if (!plan) return { project, tasks: [], notes: [] };

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

    const noteBase = (spec, createdDay) => ({
      id: uid(),
      title: spec.title,
      content: spec.content,
      tags: [],
      links: [],
      createdAt: stamp(createdDay, 10),
      project: null,
      projectIds: [project.id],
    });
    const docs = (plan.docs ?? []).map((spec) => ({
      ...noteBase(spec, spec.day),
      updatedAt: stamp(spec.updatedDay, 15),
      kind: spec.kind,
      status: spec.status,
      owner: spec.owner,
      ...(spec.ws === null ? {} : { workstreamId: workstreams[spec.ws].id }),
    }));
    const projectNotes = (plan.notes ?? []).map((spec) => noteBase(spec, spec.day));

    const tasks = Array.from({ length: plan.taskCount }, (_, i) => buildTask(project, plan, workstreams, milestones, i));
    // One next action per project: the oldest open task that is not blocked.
    const next = tasks.findIndex((t) => t.status === "todo" || t.status === "doing");
    if (next >= 0) tasks[next] = { ...tasks[next], isNextAction: true };

    return {
      tasks,
      notes: [...docs, ...projectNotes],
      project: normalizeProject({
        ...project,
        phase: plan.phase,
        headline: plan.headline ?? "",
        focus: plan.focus ?? "",
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
    notes: built.flatMap((b) => b.notes),
    activity: activity.sort((a, b) => a.at.localeCompare(b.at)),
  };
};
