// Draft <-> task conversion for the create/edit panel. Pure.
import { day } from "../../lib/metrics.js";

export const emptyDraft = ({ status = "todo", workstreamId = null, milestoneId = null, owner = "" } = {}) => ({
  title: "", desc: "", workstreamId, milestoneId, status, priority: "p3", owner, due: "", estimate: null,
});

export const draftFromTask = (task) => ({
  title: task.title ?? "",
  desc: task.desc ?? "",
  workstreamId: task.workstreamId ?? null,
  milestoneId: task.milestoneId ?? null,
  status: task.status ?? "todo",
  priority: task.priority ?? "p3",
  owner: task.owner ?? "",
  due: day(task.due),
  estimate: task.estimate ?? null,
});

export const validateDraft = (draft) => (draft.title.trim() ? {} : { title: "Add a title to save this task." });

/**
 * Stored as local noon: the metrics group by UTC day, and noon keeps the same
 * calendar day in every timezone from UTC-11 to UTC+12.
 */
export const dueFromField = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0).toISOString();
};

const localDay = (value) => {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ""));
  return match ? match[1] : "";
};

/** A stored due is an ISO instant; the field edits its local calendar day. */
export const dueToField = (due) => {
  if (!due) return "";
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return localDay(due);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
};

/** Only the fields the user changed, so a save never writes noise into the activity log. */
export const buildPatch = (task, draft) => {
  const patch = {};
  const title = draft.title.trim();
  if (title !== task.title) patch.title = title;
  if ((draft.desc ?? "") !== (task.desc ?? "")) patch.desc = draft.desc;
  if (draft.status !== task.status) patch.status = draft.status;
  if (draft.priority !== (task.priority ?? "p3")) patch.priority = draft.priority;
  if ((draft.workstreamId ?? null) !== (task.workstreamId ?? null)) patch.workstreamId = draft.workstreamId ?? null;
  if ((draft.milestoneId ?? null) !== (task.milestoneId ?? null)) patch.milestoneId = draft.milestoneId ?? null;
  const owner = draft.owner.trim();
  if (owner !== (task.owner ?? "")) patch.owner = owner || null;
  if (localDay(draft.due) !== dueToField(task.due)) patch.due = dueFromField(draft.due);
  if (!Object.is(draft.estimate ?? null, task.estimate ?? null)) patch.estimate = draft.estimate ?? null;
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
    priority: draft.priority,
    workstreamId: draft.workstreamId ?? null,
    milestoneId: draft.milestoneId ?? null,
    owner: draft.owner.trim() || null,
    estimate: draft.estimate ?? null,
  },
});
