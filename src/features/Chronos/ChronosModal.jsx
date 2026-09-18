// @maia:chronos-modal
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { uid, isoNow } from "../../lib/ids.js";
// rescheduleAll intentionally not called here — App.jsx already reschedules
// whenever `reminders` changes, so a duplicate here just re-armed the same
// timers on every Chronos open.
import { ensurePermission, scheduleLocalNotification, clearScheduled } from "../../utils/notify.js";
import { AppDialog } from "@/components/composed/AppDialog";
import { EntityForm } from "@/components/composed/EntityForm";
import { Field } from "@/components/composed/Field";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { EmptyState } from "@/components/composed/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder01 as FolderIcon } from "@/components/ui/CustomIcon.jsx";
import { PlusIcon, BellOff, ListTodo } from "lucide-react";

import { TASK_PRIORITIES, SIGNAL_PRIORITIES, IN_PRESETS } from "../../lib/constants";
import { formatTime, formatDayLabel, toLocalInputValue, isPastTime, hasOverlap } from "../../lib/time";
import TaskRow from "./components/TaskRow";
import SignalRow from "./components/SignalRow";
import DailyTimeline from "./components/DailyTimeline";
import MonthCalendar from "./components/MonthCalendar";

export default function ChronosModal({
  onClose,
  tasks,
  setTasks,
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

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((x) => (x.id !== id ? x : { ...x, done: !x.done, completedAt: !x.done ? isoNow() : null }))
    );
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  const upcomingSignals = useMemo(
    () => reminders.filter((r) => !r.delivered).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name })), [projects]);

  return (
    <AppDialog
      open
      onClose={onClose}
      size="full"
      title={<span className="text-xl font-semibold">Chronos</span>}
      className="p-0 gap-0 grid-rows-[auto_1fr] overflow-hidden rounded-3xl"
      // The right rail carries calendar + timeline — heavier than the task
      // list — so it gets the larger share. The left column scrolls.
      contentClassName="overflow-hidden grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-[minmax(320px,2fr)_minmax(0,3fr)]"
    >
      {/* Left column — Tasks + Signals */}
      <div className="flex h-full flex-col overflow-hidden border-b border-border-subtle lg:border-b-0 lg:border-r">
        <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Tasks</h3>
                {/* Deselecting a day silently switched this list from "tasks
                    on that day" to "all open tasks" — say which mode it's in. */}
                <span className="text-xs text-subtle-foreground">
                  {selectedDate ? formatDayLabel(selectedDate) : "All open"}
                </span>
              </div>
              <button
                onClick={() => openTaskForm()}
                aria-label="Add Task"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {(() => {
                const list = selectedDate ? tasksOn(selectedDate) : tasks.filter((t) => !t.done);
                if (list.length === 0) {
                  return (
                    <EmptyState
                      icon={ListTodo}
                      title={selectedDate ? "No tasks for this day" : "No open tasks"}
                      description={
                        selectedDate
                          ? "Add one, or pick a different day on the calendar."
                          : "Tasks you create — here or in Opus — land here."
                      }
                    />
                  );
                }
                return list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggleTask(t.id)}
                    onDelete={() => deleteTask(t.id)}
                    onEdit={() => openTaskForm(null, t)}
                    onAssign={(projectId) => assignTask(t.id, projectId)}
                    projects={projects}
                  />
                ));
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Signals</h3>
              <button
                onClick={() => openSignalForm()}
                aria-label="Add Signal"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {upcomingSignals.length === 0 && (
                <EmptyState
                  icon={BellOff}
                  title="No active signals"
                  description="Timed nudges you set here arrive as notifications."
                />
              )}
              {upcomingSignals.map((s) => (
                <SignalRow
                  key={s.id}
                  signal={s}
                  onDelete={() => {
                    clearScheduled(s.id);
                    setReminders((p) => p.filter((x) => x.id !== s.id));
                  }}
                  onEdit={() => openSignalForm(s)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right column — calendar, or whichever form is open */}
      <div className="relative flex h-full flex-col overflow-hidden bg-muted/20">
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

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border-subtle">
              <div className="flex-none border-b border-border-subtle p-4 px-6">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Sessions</span>
              </div>
              <DailyTimeline
                sessions={sessions}
                setSessions={setSessions}
                selectedDate={selectedDate}
                onOpenSessionForm={openSessionForm}
              />
            </div>
          </>
        )}

        {rightView === "task-form" && (
          <EntityForm
            title={taskDraft.id ? "Edit Task" : "New Task"}
            onCancel={closeForm}
            onSubmit={saveTask}
            submitLabel={taskDraft.id ? "Save Changes" : "Create Task"}
          >
            <Field label="Title" required error={formError}>
              <Input
                autoFocus
                placeholder="What needs to be done?"
                value={taskDraft.title}
                onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && saveTask()}
              />
            </Field>

            <Select
              label="Priority"
              value={taskDraft.priority}
              options={TASK_PRIORITIES}
              onChange={(val) => setTaskDraft((d) => ({ ...d, priority: val }))}
            />

            <DateTimeField
              label="Deadline"
              value={taskDraft.due}
              dateOnly
              onChange={(val) => setTaskDraft((d) => ({ ...d, due: val }))}
            />

            <Field label="Description">
              <Textarea
                placeholder="Add details…"
                className="h-36 resize-none"
                value={taskDraft.description}
                onChange={(e) => setTaskDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </Field>
          </EntityForm>
        )}

        {rightView === "signal-form" && (
          <EntityForm
            title={signalDraft.id ? "Edit Signal" : "New Signal"}
            onCancel={closeForm}
            onSubmit={saveSignal}
            submitLabel={signalDraft.id ? "Save Changes" : "Create Signal"}
          >
            <Field label="Title" required error={formError}>
              <Input
                autoFocus
                placeholder="Signal name…"
                value={signalDraft.title}
                onChange={(e) => setSignalDraft((d) => ({ ...d, title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && saveSignal()}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Time</span>
              <div className="grid grid-cols-[112px_1fr] items-start gap-3">
                <Tabs value={signalDraft.mode} onValueChange={(mode) => setSignalDraft((d) => ({ ...d, mode }))}>
                  <TabsList className="h-9 w-full">
                    <TabsTrigger value="in" className="flex-1">In</TabsTrigger>
                    <TabsTrigger value="at" className="flex-1">At</TabsTrigger>
                  </TabsList>
                </Tabs>

                {signalDraft.mode === "in" ? (
                  <Select
                    value={signalDraft.minutes}
                    options={IN_PRESETS}
                    onChange={handleInPresetChange}
                    placeholder="Duration"
                  />
                ) : (
                  <DateTimeField value={signalDraft.at} onChange={(val) => setSignalDraft((d) => ({ ...d, at: val }))} />
                )}
              </div>
            </div>

            <Select
              label="Priority"
              value={signalDraft.priority}
              options={SIGNAL_PRIORITIES}
              onChange={(val) => setSignalDraft((d) => ({ ...d, priority: val }))}
            />

            <Field label="Description">
              <Textarea
                placeholder="Signal details…"
                className="h-36 resize-none"
                value={signalDraft.description}
                onChange={(e) => setSignalDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </Field>
          </EntityForm>
        )}

        {rightView === "session-form" && (
          <EntityForm
            title={sessionDraft.id ? "Edit Session" : "New Session"}
            onCancel={closeForm}
            onSubmit={saveSession}
            submitLabel={sessionDraft.id ? "Save Changes" : "Create Session"}
          >
            <Field label="Title" required error={formError}>
              <Input
                autoFocus
                placeholder="Deep work session…"
                value={sessionDraft.title}
                onChange={(e) => setSessionDraft((d) => ({ ...d, title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && saveSession()}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Colour</span>
              <SessionColorSwatches
                value={sessionDraft.color}
                onChange={(color) => setSessionDraft((d) => ({ ...d, color }))}
              />
            </div>

            <DateTimeField
              label="Start"
              value={sessionDraft.start ? toLocalInputValue(sessionDraft.start) : ""}
              onChange={(val) => setSessionDraft((d) => ({ ...d, start: new Date(val) }))}
            />

            <DateTimeField
              label="End"
              value={sessionDraft.end ? toLocalInputValue(sessionDraft.end) : ""}
              onChange={(val) => setSessionDraft((d) => ({ ...d, end: new Date(val) }))}
            />

            <Select
              label="Project"
              icon={FolderIcon}
              value={sessionDraft.linkedProjectId === "none" ? null : sessionDraft.linkedProjectId}
              options={projectOptions}
              placeholder="Link project"
              clearLabel="No project"
              onChange={(val) => setSessionDraft((d) => ({ ...d, linkedProjectId: val || "none" }))}
            />

            <Field label="Description">
              <Textarea
                placeholder="What will you work on…"
                className="h-32 resize-none"
                value={sessionDraft.description}
                onChange={(e) => setSessionDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </Field>
          </EntityForm>
        )}
      </div>
    </AppDialog>
  );
}
