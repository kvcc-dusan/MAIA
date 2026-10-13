// @maia:chronos-modal
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { uid, isoNow } from "../../lib/ids.js";
// rescheduleAll intentionally not called here — App.jsx already reschedules
// whenever `reminders` changes, so a duplicate here just re-armed the same
// timers on every Chronos open.
import { ensurePermission, scheduleLocalNotification, clearScheduled } from "../../utils/notify.js";
import { AppDialog } from "@/components/composed/AppDialog";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { EmptyState } from "@/components/composed/EmptyState";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import { PlusIcon, BellOff, ListTodo } from "@/components/icons";

import { formatTime, formatDayLabel, toLocalInputValue, isPastTime, hasOverlap, sameDay } from "../../lib/time";
import TaskRow from "./components/TaskRow";
import SignalRow from "./components/SignalRow";
import DailyTimeline from "./components/DailyTimeline";
import MonthCalendar from "./components/MonthCalendar";
import { TaskForm, SignalForm, SessionForm } from "./components/ChronosForms";
import styles from "./ChronosModal.module.css";

export default function ChronosModal({
  onClose,
  tasks,
  setTasks,
  // DataContext's toggleTask owns the status rule (status, doneAt, next-action
  // promotion); a direct done/completedAt write here would bypass it.
  toggleTask,
  reminders,
  setReminders,
  sessions,
  setSessions,
  projects = [],
}) {
  const today = new Date();

  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [rightView, setRightView] = useState("calendar");
  const [formError, setFormError] = useState(null);
  // One confirm for every task and signal removal in this modal. Rows only
  // request a delete; the removal runs from the dialog's danger button. Closing
  // keeps the content (open: false) so the exit animation doesn't swap the text.
  const [pendingDelete, setPendingDelete] = useState(null);

  const [signalDraft, setSignalDraft] = useState({
    id: null,
    title: "",
    description: "",
    priority: "p3",
    mode: "in",
    minutes: 15,
    at: toLocalInputValue(new Date()),
  });

  const [taskDraft, setTaskDraft] = useState({
    id: null,
    title: "",
    description: "",
    priority: "p3",
    due: "",
  });

  const [sessionDraft, setSessionDraft] = useState({
    id: null,
    title: "",
    description: "",
    start: null,
    end: null,
    linkedProjectId: "none",
    color: "neutral",
  });

  const closeForm = () => {
    setRightView("calendar");
    setFormError(null);
  };

  const openTaskForm = (prefillDate = null, existingTask = null) => {
    if (existingTask) {
      setTaskDraft({
        id: existingTask.id,
        title: existingTask.title,
        description: existingTask.desc || "",
        priority: existingTask.priority || "p3",
        due: existingTask.due ? toLocalInputValue(new Date(existingTask.due)) : "",
      });
    } else {
      const base = prefillDate ? new Date(prefillDate) : selectedDate ? new Date(selectedDate) : new Date();
      setTaskDraft({ id: null, title: "", description: "", priority: "p3", due: toLocalInputValue(base) });
    }
    setFormError(null);
    setRightView("task-form");
  };

  const openSignalForm = (existingSignal = null) => {
    if (existingSignal) {
      setSignalDraft({
        id: existingSignal.id,
        title: existingSignal.title,
        description: "",
        priority: existingSignal.priority || "p3",
        mode: "at",
        at: existingSignal.scheduledAt ? toLocalInputValue(new Date(existingSignal.scheduledAt)) : toLocalInputValue(new Date()),
      });
    } else {
      setSignalDraft({
        id: null,
        title: "",
        description: "",
        priority: "p3",
        mode: "in",
        minutes: 15,
        at: toLocalInputValue(new Date()),
      });
    }
    setFormError(null);
    setRightView("signal-form");
  };

  const openSessionForm = (draft) => {
    setSessionDraft({
      id: draft.id || null,
      title: draft.title || "",
      description: draft.description || "",
      start: draft.start ? new Date(draft.start) : null,
      end: draft.end ? new Date(draft.end) : null,
      linkedProjectId: draft.linkedProjectId || "none",
      color: draft.color || "neutral",
    });
    setFormError(null);
    setRightView("session-form");
  };

  // Keyboard and touch path to the same form the timeline's drag opens: the
  // next free half hour today, or 9:00 on any other day, for one hour.
  const openNewSession = () => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    const start = new Date(base);
    if (sameDay(base, new Date())) {
      const now = new Date();
      start.setHours(now.getHours(), now.getMinutes() < 30 ? 30 : 60, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    openSessionForm({ start, end: new Date(start.getTime() + 60 * 60000) });
  };

  const saveTask = () => {
    const title = taskDraft.title.trim();
    if (!title) {
      setFormError("Give the task a title.");
      return;
    }

    const dueIso = taskDraft.due ? new Date(taskDraft.due).toISOString() : null;

    if (taskDraft.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskDraft.id
            ? { ...t, title, desc: taskDraft.description.trim() || undefined, due: dueIso, priority: taskDraft.priority }
            : t
        )
      );
    } else {
      setTasks((prev) => [
        {
          id: uid(),
          title,
          desc: taskDraft.description.trim() || undefined,
          done: false,
          createdAt: isoNow(),
          due: dueIso,
          priority: taskDraft.priority,
        },
        ...prev,
      ]);
    }
    closeForm();
  };

  const assignTask = (id, projectId) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, projectId } : t)));
    const projectTitle = projects.find((p) => p.id === projectId)?.name || "Project";
    toast.success(`Assigned to ${projectTitle}`);
  };

  const saveSignal = () => {
    const title = signalDraft.title.trim();
    if (!title) {
      setFormError("Give the signal a title.");
      return;
    }

    const when = signalDraft.mode === "in"
      ? new Date(Date.now() + Number(signalDraft.minutes || 0) * 60000)
      : new Date(signalDraft.at);
    if (isNaN(when.getTime())) {
      setFormError("That time isn't valid.");
      return;
    }
    if (when < new Date()) {
      toast.error("Time is in the past");
      return;
    }

    if (signalDraft.id) {
      setReminders((prev) =>
        prev.map((s) =>
          s.id === signalDraft.id
            ? { ...s, title, description: signalDraft.description.trim() || undefined, priority: signalDraft.priority, scheduledAt: when.toISOString() }
            : s
        )
      );
      ensurePermission().then((ok) => {
        if (ok) scheduleLocalNotification(signalDraft.id, title, when.toISOString());
      });
      toast.success(`Signal updated for ${formatTime(when)}`);
    } else {
      const id = uid();
      const newSignal = {
        id,
        title,
        description: signalDraft.description.trim() || undefined,
        scheduledAt: when.toISOString(),
        createdAt: isoNow(),
        delivered: false,
        priority: signalDraft.priority,
      };
      setReminders((prev) => [newSignal, ...prev]);
      ensurePermission().then((ok) => {
        if (ok) scheduleLocalNotification(id, title, newSignal.scheduledAt);
      });
      toast.success(`Signal set for ${formatTime(when)}`);
    }
    closeForm();
  };

  const handleInPresetChange = (val) => {
    if (typeof val === "number") {
      setSignalDraft((d) => ({ ...d, minutes: val }));
      return;
    }
    const target = new Date();
    switch (val) {
      case "tonight":
        target.setHours(21, 0, 0, 0);
        break;
      case "tm_morning":
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        break;
      case "tm_noon":
        target.setDate(target.getDate() + 1);
        target.setHours(12, 0, 0, 0);
        break;
      default:
        break;
    }
    setSignalDraft((d) => ({ ...d, mode: "at", at: toLocalInputValue(target) }));
  };

  const saveSession = () => {
    const title = sessionDraft.title.trim();
    if (!title) {
      setFormError("Give the session a title.");
      return;
    }
    if (!sessionDraft.start || !sessionDraft.end) {
      setFormError("Set a start and end time.");
      return;
    }
    if (isPastTime(sessionDraft.start)) {
      toast.error("Cannot create sessions in the past");
      return;
    }
    if (hasOverlap(sessionDraft.start, sessionDraft.end, sessions, sessionDraft.id)) {
      toast.error("Time slot is already occupied");
      return;
    }

    const newSession = {
      id: sessionDraft.id || uid(),
      title,
      description: sessionDraft.description.trim(),
      start: sessionDraft.start.toISOString(),
      end: sessionDraft.end.toISOString(),
      linkedProjectId: sessionDraft.linkedProjectId === "none" ? null : sessionDraft.linkedProjectId,
      color: sessionDraft.color || "neutral",
    };

    if (sessionDraft.id) {
      setSessions((prev) => prev.map((s) => (s.id === sessionDraft.id ? newSession : s)));
    } else {
      setSessions((prev) => [...prev, newSession]);
    }
    closeForm();
  };

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.deleted || !t.due) return;
      const key = new Date(t.due).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const tasksOn = React.useCallback((date) => (date ? tasksByDate[date.toDateString()] || [] : []), [tasksByDate]);

  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  const requestTaskDelete = (task) =>
    setPendingDelete({
      open: true,
      title: `Delete task '${task.title}'?`,
      description: "This can't be undone.",
      confirmLabel: "Delete task",
      onConfirm: () => deleteTask(task.id),
    });

  const requestSignalCancel = (signal) =>
    setPendingDelete({
      open: true,
      title: `Cancel signal '${signal.title}'?`,
      description: "The signal won't be delivered. This can't be undone.",
      confirmLabel: "Cancel signal",
      // "Cancel" here would read as cancelling the dialog, not the signal.
      cancelLabel: "Keep signal",
      onConfirm: () => {
        clearScheduled(signal.id);
        setReminders((p) => p.filter((x) => x.id !== signal.id));
      },
    });

  const upcomingSignals = useMemo(
    () => reminders.filter((r) => !r.delivered).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name })), [projects]);

  // Which task list the left column shows — pinned to the selected day, or
  // every open task when no day is selected.
  const visibleTasks = useMemo(
    () => (selectedDate ? tasksOn(selectedDate) : tasks.filter((t) => !t.done)),
    [selectedDate, tasksOn, tasks]
  );

  const isFormOpen = rightView !== "calendar";

  return (
    <AppDialog
      open
      onClose={onClose}
      size="full"
      // No visible close button: the X sat on top of the calendar's month
      // chevrons and read as noise in every other right-rail state. Escape
      // and clicking outside close the dialog.
      showCloseButton={false}
      // The accessible name lives in a visually hidden dialog title; the
      // visible "Chronos" wordmark is the left column's own, so the divider
      // runs the full height of the modal.
      title="Chronos"
      // Focus the dialog itself on open. Radix would focus the first control, the Add task button,
      // and its tooltip then sat on screen like a stray white button.
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        event.currentTarget?.focus?.();
      }}
    >
      <div className={styles.layout} data-form-open={isFormOpen ? "" : undefined}>
        {/* Left column: wordmark, then Tasks and Signals in one scrolling rail. */}
        <div className={styles.left}>
          <div className={styles.wordmark} aria-hidden="true">Chronos</div>

          <div className={`${styles.leftScroll} custom-scrollbar`}>
            <section className={styles.section} aria-labelledby="chronos-tasks">
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>
                  <h3 id="chronos-tasks">Tasks</h3>
                  {/* Deselecting a day silently switched this list from "tasks
                      on that day" to "all open tasks". Say which mode it's in. */}
                  <span className={styles.sectionHint}>{selectedDate ? formatDayLabel(selectedDate) : "All open"}</span>
                </div>
                <IconButton icon={PlusIcon} label="Add task" onClick={() => openTaskForm()} />
              </div>

              {visibleTasks.length === 0 ? (
                <EmptyState
                  size="small"
                  icon={ListTodo}
                  title={selectedDate ? "No tasks for this day" : "No open tasks"}
                  description={
                    selectedDate
                      ? "Pick a different day on the calendar, or add one for this day."
                      : "Tasks you create here or in Opus show up in this list."
                  }
                  action={<Button variant="secondary" size="sm" onClick={() => openTaskForm()}>Add task</Button>}
                />
              ) : (
                <ul className={styles.list}>
                  {visibleTasks.map((t) => (
                    <li key={t.id}>
                      <TaskRow
                        task={t}
                        onToggle={() => toggleTask(t.id)}
                        onDelete={() => requestTaskDelete(t)}
                        onEdit={() => openTaskForm(null, t)}
                        onAssign={(projectId) => assignTask(t.id, projectId)}
                        projects={projects}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section} aria-labelledby="chronos-signals">
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>
                  <h3 id="chronos-signals">Signals</h3>
                </div>
                <IconButton icon={PlusIcon} label="Add signal" onClick={() => openSignalForm()} />
              </div>

              {upcomingSignals.length === 0 ? (
                <EmptyState
                  size="small"
                  icon={BellOff}
                  title="No active signals"
                  description="A signal is a timed nudge. It arrives as a notification at the time you pick."
                  action={<Button variant="secondary" size="sm" onClick={() => openSignalForm()}>Add signal</Button>}
                />
              ) : (
                <ul className={styles.list}>
                  {upcomingSignals.map((s) => (
                    <li key={s.id}>
                      <SignalRow
                        signal={s}
                        onDelete={() => requestSignalCancel(s)}
                        onEdit={() => openSignalForm(s)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Right column: calendar on top, sessions beneath; or whichever form
            is open. The divider stays put in every state. */}
        <div className={styles.right}>
          {rightView === "calendar" && (
            <>
              <MonthCalendar
                view={view}
                setView={setView}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                today={today}
                tasksOn={tasksOn}
              />

              <section className={styles.sessions} aria-labelledby="chronos-sessions">
                <div className={styles.sessionsHead}>
                  <h3 id="chronos-sessions">Sessions</h3>
                  <IconButton icon={PlusIcon} label="Add session" onClick={openNewSession} />
                </div>
                <DailyTimeline
                  sessions={sessions}
                  setSessions={setSessions}
                  selectedDate={selectedDate}
                  onOpenSessionForm={openSessionForm}
                />
              </section>
            </>
          )}

          {rightView === "task-form" && (
            <TaskForm draft={taskDraft} setDraft={setTaskDraft} error={formError} onCancel={closeForm} onSubmit={saveTask} />
          )}

          {rightView === "signal-form" && (
            <SignalForm
              draft={signalDraft}
              setDraft={setSignalDraft}
              error={formError}
              onCancel={closeForm}
              onSubmit={saveSignal}
              onPresetChange={handleInPresetChange}
            />
          )}

          {rightView === "session-form" && (
            <SessionForm
              draft={sessionDraft}
              setDraft={setSessionDraft}
              error={formError}
              projectOptions={projectOptions}
              onCancel={closeForm}
              onSubmit={saveSession}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete?.open}
        onClose={() => setPendingDelete((prev) => prev && { ...prev, open: false })}
        onConfirm={() => pendingDelete?.onConfirm()}
        title={pendingDelete?.title}
        description={pendingDelete?.description}
        confirmLabel={pendingDelete?.confirmLabel}
        cancelLabel={pendingDelete?.cancelLabel}
      />
    </AppDialog>
  );
}
