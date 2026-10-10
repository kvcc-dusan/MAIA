// Task shape and the one place that decides how a task changes status.
//
// Stored tasks are never bulk-migrated: legacy objects ({done, status: null |
// 'blocked', completedAt}) stay valid in storage, normalizeTask reads them and
// applyTaskPatch writes them. `done` stays as a boolean mirror of
// status === 'done' so every pre-redesign reader keeps working.
import { isoNow } from "../../../lib/ids.js";

export const TASK_STATUSES = ["todo", "doing", "blocked", "done"];

const SCHEDULE_RANK = { today: 0, soon: 1, future: 2 };

const isStatus = (s) => TASK_STATUSES.includes(s);

// The boolean wins when it disagrees with a stored status: new code always
// writes both together, so a mismatch means an older build flipped `done`
// and left `status` stale.
const resolveStatus = (t) => {
  const status = isStatus(t.status) ? t.status : null;
  if (t.done === true) return "done";
  if (t.done === false && status === "done") return "todo";
  return status ?? "todo";
};

/**
 * Canonical read shape. Pure, idempotent, always a new object.
 * Optional fields that were never set default to null (not undefined) so
 * readers can use `?? ` and `== null` uniformly.
 */
export const normalizeTask = (t) => {
  const status = resolveStatus(t);
  const isDone = status === "done";
  return {
    ...t,
    status,
    done: isDone,
    doneAt: isDone ? (t.doneAt ?? t.completedAt ?? t.createdAt ?? null) : null,
    startedAt: t.startedAt ?? null,
    workstreamId: t.workstreamId ?? null,
    milestoneId: t.milestoneId ?? null,
    estimate: t.estimate ?? null,
    order: t.order ?? null,
    owner: t.owner ?? null,
  };
};

// Keyed on the raw stored object so an untouched task keeps the same
// normalized reference across renders (memoized rows and dnd-kit stay calm).
const normalizedCache = new WeakMap();

const normalizeCached = (t) => {
  if (typeof t !== "object" || t === null) return t;
  const hit = normalizedCache.get(t);
  if (hit) return hit;
  const out = normalizeTask(t);
  normalizedCache.set(t, out);
  return out;
};

export const normalizeTasks = (list) => (Array.isArray(list) ? list.map(normalizeCached) : []);

// Which status does this patch ask for? An explicit valid `status` wins, then
// the legacy `done` boolean. Legacy `status: null` only ever meant "unblock".
const resolveTargetStatus = (before, patch) => {
  if (isStatus(patch.status)) return patch.status;
  let to = before ? before.status : "todo";
  if ("status" in patch && patch.status == null && to === "blocked") to = "todo";
  if (typeof patch.done === "boolean") {
    if (patch.done) to = "done";
    else if (to === "done") to = "todo";
  }
  return to;
};

/**
 * The single status-transition rule. `prev` may be null (creation).
 *  - first move to 'doing' stamps startedAt (never overwritten)
 *  - move to 'done' stamps doneAt, and startedAt if it was never set
 *  - leaving 'done' clears doneAt
 *  - completedAt is never written; a stale one is nulled on reopen
 * Returns a new normalized task.
 */
export const applyTaskPatch = (prev, patch = {}, now = isoNow()) => {
  const before = prev ? normalizeTask(prev) : null;
  const from = before ? before.status : null;
  const to = resolveTargetStatus(before, patch);

  let startedAt = before ? before.startedAt : null;
  let doneAt = before ? before.doneAt : null;
  if (to !== from) {
    if (to === "doing" && !startedAt) startedAt = now;
    if (to === "done") {
      doneAt = now;
      startedAt = startedAt ?? now;
    }
    if (from === "done" && to !== "done") doneAt = null;
  }
  // Explicit timestamps in the patch (imports, sample data) beat the computed ones.
  if (patch.startedAt !== undefined) startedAt = patch.startedAt;
  if (to === "done" && patch.doneAt) doneAt = patch.doneAt;

  const next = {
    ...(prev ?? {}),
    ...patch,
    status: to,
    done: to === "done",
    startedAt,
    doneAt: to === "done" ? doneAt : null,
  };
  if (!prev) next.createdAt = next.createdAt ?? now;
  if (from === "done" && to !== "done" && "completedAt" in next) next.completedAt = null;
  return normalizeTask(next);
};

const sortForPromotion = (a, b) => {
  const bySchedule = (SCHEDULE_RANK[a.schedule] ?? 0) - (SCHEDULE_RANK[b.schedule] ?? 0);
  return bySchedule !== 0 ? bySchedule : new Date(a.createdAt) - new Date(b.createdAt);
};

/**
 * Patches one task inside a raw stored list. Completing a task clears its
 * next-action flag, and if it was the project's next action the oldest open
 * task (today before soon before future, never blocked) is promoted.
 * Only the patched task and the promoted one are rewritten; every other
 * stored task keeps its reference, so legacy shapes stay untouched.
 */
export const patchTaskInList = (list, id, patch, now = isoNow()) => {
  const target = list.find((t) => t.id === id);
  if (!target) return list;

  const before = normalizeTask(target);
  let next = applyTaskPatch(target, patch, now);
  const completed = before.status !== "done" && next.status === "done";
  if (completed) next = { ...next, isNextAction: false };

  const updated = list.map((t) => (t.id === id ? next : t));
  if (!completed || !before.isNextAction || !before.projectId) return updated;

  const candidate = updated
    .filter((t) => {
      const n = normalizeTask(t);
      return n.projectId === before.projectId && n.status !== "done" && n.status !== "blocked" && !n.isNextAction;
    })
    .sort(sortForPromotion)[0];

  return candidate
    ? updated.map((t) => (t.id === candidate.id ? { ...t, isNextAction: true } : t))
    : updated;
};
