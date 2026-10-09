// Project shape: the new Opus fields, milestone normalization and small
// creators for the embedded collections (workstreams, decisions, questions,
// milestones). Same principle as taskModel: normalize on read and on write,
// never rewrite stored projects in bulk.
import { uid, isoNow } from "../../../lib/ids.js";

export const MILESTONE_STATUSES = ["planned", "active", "at-risk", "done"];
export const WORKSTREAM_COLORS = ["1", "2", "3", "4"];
const QUESTION_STATUSES = ["open", "answered"];

const isMilestoneStatus = (s) => MILESTONE_STATUSES.includes(s);

const slug = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

// Same disagreement rule as tasks: when `done` and `status` contradict, a
// legacy writer flipped the boolean, so the boolean wins.
const resolveMilestoneStatus = (m) => {
  const status = isMilestoneStatus(m.status) ? m.status : null;
  if (m.done === true) return "done";
  if (m.done === false && status === "done") return "planned";
  return status ?? "planned";
};

/**
 * `index` only feeds the fallback id for milestones that never had one. The id
 * is a pure function of index and title, so normalizing twice (or on every
 * render) always yields the same id.
 */
export const normalizeMilestone = (m, index = 0) => {
  const status = resolveMilestoneStatus(m);
  return {
    ...m,
    id: m.id ?? `ms-${index}-${slug(m.title) || "untitled"}`,
    date: m.date ?? m.due ?? null,
    start: m.start ?? null,
    status,
    workstreamId: m.workstreamId ?? null,
    done: status === "done",
  };
};

const asArray = (v) => (Array.isArray(v) ? v : []);

export const normalizeProject = (p) => ({
  ...p,
  startDate: p.startDate ?? null,
  targetDate: p.targetDate ?? null,
  phase: p.phase ?? null,
  nextMeeting: p.nextMeeting ?? null,
  workstreams: asArray(p.workstreams),
  decisions: asArray(p.decisions),
  questions: asArray(p.questions),
  milestones: asArray(p.milestones).map(normalizeMilestone),
});

const projectCache = new WeakMap();

// Keyed on the raw stored object so untouched projects keep a stable reference.
export const normalizeProjects = (list) =>
  Array.isArray(list)
    ? list.map((p) => {
        if (typeof p !== "object" || p === null) return p;
        const hit = projectCache.get(p);
        if (hit) return hit;
        const out = normalizeProject(p);
        projectCache.set(p, out);
        return out;
      })
    : [];

/** Explicit valid status wins, then the legacy `done` boolean, then whatever it was. */
export const applyMilestonePatch = (prev, patch = {}, now = isoNow()) => {
  const before = prev ? normalizeMilestone(prev) : null;
  let status = before ? before.status : "planned";
  if (isMilestoneStatus(patch.status)) status = patch.status;
  else if (typeof patch.done === "boolean") {
    if (patch.done) status = "done";
    else if (status === "done") status = "planned";
  }
  return normalizeMilestone({
    ...(prev ?? {}),
    ...patch,
    status,
    done: status === "done",
    updatedAt: now,
  });
};

const nextOrder = (list) => list.reduce((max, w) => Math.max(max, (w.order ?? -1) + 1), 0);

export const createWorkstream = (existing = [], overrides = {}) => ({
  id: uid(),
  name: "New workstream",
  owner: "",
  status: "active",
  color: WORKSTREAM_COLORS[existing.length % WORKSTREAM_COLORS.length],
  order: nextOrder(existing),
  ...overrides,
});

// Named "Project" to stay clear of the Ledger's createDecision in DataContext.
export const createProjectDecision = (overrides = {}, now = isoNow()) => ({
  id: uid(),
  title: "",
  date: now.slice(0, 10),
  by: "",
  workstreamId: null,
  detail: "",
  ...overrides,
});

export const createQuestion = (overrides = {}, now = isoNow()) => ({
  id: uid(),
  question: "",
  workstreamId: null,
  owner: "",
  blocking: false,
  status: "open",
  answer: "",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const applyQuestionPatch = (prev, patch = {}, now = isoNow()) => {
  const merged = { ...prev, ...patch, updatedAt: now };
  return { ...merged, status: QUESTION_STATUSES.includes(merged.status) ? merged.status : "open" };
};

export const createMilestone = (overrides = {}, now = isoNow()) =>
  applyMilestonePatch(null, { id: uid(), title: "", ...overrides }, now);
