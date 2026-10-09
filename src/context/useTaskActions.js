import { useCallback } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { applyTaskPatch, normalizeTask, patchTaskInList } from "../features/Opus/lib/taskModel.js";
import { useLatest } from "./useLatest.js";

// Did the patch actually change anything? Compared on the normalized shapes so
// a legacy patch like { status: null } on an unblocked task logs nothing.
const hasChanged = (prev, next, patch) =>
  Object.keys(patch).some((key) => !Object.is(prev[key], next[key]));

/**
 * Task actions. Every status write goes through applyTaskPatch (via
 * patchTaskInList), so `status`, `done`, `startedAt` and `doneAt` cannot drift.
 * `tasks` is the normalized list; `setTasks` is the raw stored setter.
 */
export const useTaskActions = ({ tasks, setTasks, logActivity }) => {
  const tasksRef = useLatest(tasks);

  const logTaskChange = useCallback((prev, next, patch) => {
    const base = { collection: "tasks", itemId: prev.id, projectId: next.projectId, title: next.title };
    if (prev.status !== next.status) {
      logActivity({ ...base, kind: "status", from: prev.status, to: next.status });
    } else if (hasChanged(prev, next, patch)) {
      logActivity({ ...base, kind: "updated" });
    }
  }, [logActivity]);

  const addTask = useCallback((title, due = null, desc = "", projectId = null, extras = {}) => {
    if (!title.trim()) return;
    const now = isoNow();
    const task = applyTaskPatch(null, {
      id: uid(),
      title: title.trim(),
      desc,
      createdAt: now,
      due,
      projectId: projectId || null,
      isNextAction: false,
      status: "todo",
      schedule: "today", // 'today' | 'soon' | 'future'
      ...extras,
    }, now);
    setTasks((prev) => [task, ...prev]);
    logActivity({ kind: "created", collection: "tasks", itemId: task.id, projectId: task.projectId, title: task.title });
    return task.id;
  }, [setTasks, logActivity]);

  // Accepts new and legacy patches: { status: 'doing' }, { done: true },
  // { status: 'blocked' }, { status: null } (unblock), or plain fields.
  const updateTask = useCallback((id, patch = {}) => {
    const now = isoNow();
    setTasks((prev) => patchTaskInList(prev, id, patch, now));
    const before = tasksRef.current.find((t) => t.id === id);
    if (before) logTaskChange(before, applyTaskPatch(before, patch, now), patch);
  }, [setTasks, tasksRef, logTaskChange]);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const before = tasksRef.current.find((t) => t.id === id);
    if (before) {
      logActivity({ kind: "deleted", collection: "tasks", itemId: id, projectId: before.projectId, title: before.title });
    }
  }, [setTasks, tasksRef, logActivity]);

  const toggleTask = useCallback((id) => {
    const now = isoNow();
    // Decided from the freshest list, so two quick toggles still alternate.
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      return patchTaskInList(prev, id, { done: normalizeTask(target).status !== "done" }, now);
    });
    const before = tasksRef.current.find((t) => t.id === id);
    if (before) {
      logActivity({
        kind: "status",
        collection: "tasks",
        itemId: id,
        projectId: before.projectId,
        title: before.title,
        from: before.status,
        to: before.status === "done" ? "todo" : "done",
      });
    }
  }, [setTasks, tasksRef, logActivity]);

  const setNextAction = useCallback((taskId, projectId) => {
    setTasks((prev) => prev.map((t) => {
      if (t.projectId !== projectId) return t;
      return { ...t, isNextAction: t.id === taskId };
    }));
  }, [setTasks]);

  return { addTask, updateTask, deleteTask, toggleTask, setNextAction };
};
