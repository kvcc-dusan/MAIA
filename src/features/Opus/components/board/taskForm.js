// Draft <-> task conversion for the drawer. Pure.
import { toLocalInputValue } from "../../../../lib/time.js";
import { localDay } from "./model.js";

export const emptyDraft = ({ status = "todo", workstreamId = null } = {}) => ({
  title: "", desc: "", status, workstreamId, milestoneId: null, due: "", estimate: null, schedule: "today",
});

export const draftFromTask = (task) => ({
  title: task.title ?? "",
  desc: task.desc ?? "",
  status: task.status,
  workstreamId: task.workstreamId ?? null,
  milestoneId: task.milestoneId ?? null,
  due: task.due ? toLocalInputValue(new Date(task.due)) : "",
  estimate: task.estimate ?? null,
  schedule: task.schedule ?? "today",
});

export const validateDraft = (draft) => (draft.title.trim() ? {} : { title: "Add a title to save this task." });

/**
 * Stored as local noon: the metrics group by UTC day, and noon keeps the same
 * calendar day in every timezone from UTC-11 to UTC+12.
 */
export const dueFromField = (value) => {
  const day = localDay(String(value ?? "").slice(0, 10));
  if (!day) return null;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0).toISOString();
};

/** Only the fields the user changed, so a save never writes noise into the activity log. */
export const buildPatch = (task, draft) => {
  const patch = {};
  const title = draft.title.trim();
  if (title !== task.title) patch.title = title;
  if ((draft.desc ?? "") !== (task.desc ?? "")) patch.desc = draft.desc;
  if (draft.status !== task.status) patch.status = draft.status;
  if ((draft.workstreamId ?? null) !== (task.workstreamId ?? null)) patch.workstreamId = draft.workstreamId ?? null;
  if ((draft.milestoneId ?? null) !== (task.milestoneId ?? null)) patch.milestoneId = draft.milestoneId ?? null;
  if (localDay(draft.due) !== localDay(task.due)) patch.due = dueFromField(draft.due);
  if (!Object.is(draft.estimate ?? null, task.estimate ?? null)) patch.estimate = draft.estimate ?? null;
  if (draft.schedule !== (task.schedule ?? "today")) patch.schedule = draft.schedule;
  return patch;
};

/** Arguments for addTask(title, due, desc, projectId, extras). */
export const buildCreateArgs = (draft, projectId) => ({
  title: draft.title.trim(),
  due: dueFromField(draft.due),
  desc: draft.desc ?? "",
  projectId,
  extras: {
    status: draft.status,
    workstreamId: draft.workstreamId ?? null,
    milestoneId: draft.milestoneId ?? null,
    estimate: draft.estimate ?? null,
    schedule: draft.schedule,
  },
});
