// "Needs attention": open tasks that are overdue or blocked, most urgent first.
// Overdue tasks lead (oldest due date first, blocked or not), then blocked tasks
// that are not overdue (earliest due first, undated last).
import { blocked, diffDays, overdue } from "../../lib/metrics.js";

export const MAX_ATTENTION = 5;

const toItem = (task, today, isOverdue, isBlocked) => ({
  id: task.id,
  title: task.title || "Untitled task",
  due: task.due ? String(task.due).slice(0, 10) : null,
  daysLate: isOverdue ? diffDays(today, task.due) : 0,
  isOverdue,
  isBlocked,
  workstreamId: task.workstreamId ?? null,
  owner: task.owner ?? "",
});

/** @returns {{ items: object[], total: number }} `total` counts every match, `items` the first `limit`. */
export const attentionTasks = (tasks, today, limit = MAX_ATTENTION) => {
  const late = overdue(tasks, today);
  const stuck = blocked(tasks);
  const blockedIds = new Set(stuck.map((t) => t.id));
  const lateIds = new Set(late.map((t) => t.id));
  const all = [
    ...late.map((t) => toItem(t, today, true, blockedIds.has(t.id))),
    ...stuck.filter((t) => !lateIds.has(t.id)).map((t) => toItem(t, today, false, true)),
  ];
  return { items: all.slice(0, limit), total: all.length };
};
