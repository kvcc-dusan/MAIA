// @maia:opusFiles - task <-> markdown (Opus/<project>/tasks/*.md)
// `done` is derived from status and never written; legacy `completedAt` is
// only a fallback for doneAt.
import { normalizeTask, TASK_STATUSES } from "../../features/Opus/lib/taskModel.js";
import {
  makeCodec, asString, optString, asBool, asNumber, pickOption, resolveRef, refName,
} from "./fileCodec.js";

export const TASK_PRIORITIES = ["p1", "p2", "p3"];
export const TASK_ESTIMATES = ["S", "M", "L"];
export const TASK_SCHEDULES = ["today", "soon", "future"];

const WRITTEN_KEYS = [
  "id", "title", "status", "priority", "owner", "estimate", "due", "workstream", "milestone",
  "order", "schedule", "isNextAction", "createdAt", "startedAt", "doneAt",
];
// Read for old files, never written back.
const LEGACY_KEYS = ["done", "completedAt"];

const parse = (data, body, { fallbackId, fallbackTitle, ctx, warnings }) => {
  const priority = pickOption(data.priority, TASK_PRIORITIES, null, "priority", warnings);
  const task = normalizeTask({
    id: optString(data.id) ?? fallbackId,
    title: optString(data.title) ?? fallbackTitle ?? "Untitled",
    desc: body,
    status: pickOption(data.status, TASK_STATUSES, null, "status", warnings) ?? undefined,
    done: typeof data.done === "boolean" ? data.done : undefined,
    owner: optString(data.owner),
    estimate: pickOption(data.estimate, TASK_ESTIMATES, null, "estimate", warnings),
    due: optString(data.due),
    workstreamId: resolveRef(data.workstream, ctx.workstreams, "name", "Workstream", warnings),
    milestoneId: resolveRef(data.milestone, ctx.milestones, "title", "Milestone", warnings),
    order: asNumber(data.order),
    schedule: pickOption(data.schedule, TASK_SCHEDULES, "today", "schedule", warnings),
    isNextAction: asBool(data.isNextAction),
    createdAt: optString(data.createdAt),
    startedAt: optString(data.startedAt),
    doneAt: optString(data.doneAt),
    completedAt: optString(data.completedAt),
  });
  const { completedAt: _legacy, ...clean } = task;
  return priority ? { ...clean, priority } : clean;
};

const toFields = (task, ctx) => ({
  id: task.id,
  title: asString(task.title),
  status: TASK_STATUSES.includes(task.status) ? task.status : task.done ? "done" : "todo",
  priority: TASK_PRIORITIES.includes(task.priority) ? task.priority : null,
  owner: optString(task.owner),
  estimate: TASK_ESTIMATES.includes(task.estimate) ? task.estimate : null,
  due: optString(task.due),
  workstream: refName(task.workstreamId, ctx.workstreams, "name"),
  milestone: refName(task.milestoneId, ctx.milestones, "title"),
  order: asNumber(task.order),
  schedule: TASK_SCHEDULES.includes(task.schedule) ? task.schedule : null,
  isNextAction: task.isNextAction === true ? true : null,
  createdAt: optString(task.createdAt),
  startedAt: optString(task.startedAt),
  doneAt: task.status === "done" || task.done ? optString(task.doneAt) : null,
});

export const { fromFile, toFile } = makeCodec({
  knownKeys: [...WRITTEN_KEYS, ...LEGACY_KEYS],
  parse,
  toFields,
  bodyOf: (task) => task.desc,
});
