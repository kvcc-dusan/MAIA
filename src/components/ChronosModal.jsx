// @maia:chronos-modal
import React, { useEffect, useMemo, useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { ensurePermission, scheduleLocalNotification, rescheduleAll, clearScheduled } from "../utils/notify.js";
import { cn } from "@/lib/utils";
import { Folder } from "lucide-react";

import { TASK_PRIORITIES, SIGNAL_PRIORITIES, IN_PRESETS, INPUT_CLASS } from "../lib/constants";
import { sameDay, toLocalInputValue, isPastTime, hasOverlap } from "../lib/time";
import { CloseButton } from "./ui/CloseButton";
import { CustomSelect } from "./ui/CustomSelect";
import { DateTimePicker } from "./ui/DateTimePicker";
import { PillSelect } from "./ui/PillSelect";
import TaskRow from "./TaskRow";
import SignalRow from "./SignalRow";
import DailyTimeline from "./DailyTimeline";

export default function ChronosModal({
  onClose,
  tasks,
  setTasks,
  reminders,
  setReminders,
  sessions,
  setSessions,
  projects = [],
  pushToast,
}) {
  const today = new Date();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [rightView, setRightView] = useState("calendar");

  const [signalDraft, setSignalDraft] = useState({
    id: null,
    title: "",
    description: "",
    priority: "low",
    mode: "in",
    minutes: 15,
    at: toLocalInputValue(new Date()),
  });

  const [taskDraft, setTaskDraft] = useState({
    id: null,
    title: "",
    description: "",
    priority: "p3",
    due: ""
  });

  const openTaskForm = (prefillDate = null, existingTask = null) => {
    if (existingTask) {
      // Edit Mode
      setTaskDraft({
        id: existingTask.id,
        title: existingTask.title,
        description: existingTask.desc || "",
        priority: existingTask.priority || "p3",
        due: existingTask.due ? toLocalInputValue(new Date(existingTask.due)) : ""
      });
    } else {
      // Create Mode
      let base = prefillDate ? new Date(prefillDate) : (selectedDate ? new Date(selectedDate) : new Date());

      setTaskDraft({
        id: null,
        title: "",
        description: "",
        priority: "p3",
        due: toLocalInputValue(base),
      });
    }
    setRightView("task-form");
  };

  const openSignalForm = (existingSignal = null) => {
    if (existingSignal) {
      setSignalDraft({
        id: existingSignal.id,
        title: existingSignal.title,
        description: "", // Signals don't have desc usually
        priority: existingSignal.priority || "p3",
        mode: "at", // Edit always shows 'at'
        at: existingSignal.scheduledAt ? toLocalInputValue(new Date(existingSignal.scheduledAt)) : toLocalInputValue(new Date())
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
    setRightView("signal-form");
  };

  const [sessionDraft, setSessionDraft] = useState({
    id: null,
    title: "",
    description: "",
    start: null,
    end: null,
    linkedProjectId: "none"
  });

  const openSessionForm = (draft) => {
    setSessionDraft({
      id: draft.id || null,
      title: draft.title || "",
      description: draft.description || "",
      start: draft.start ? new Date(draft.start) : null,
      end: draft.end ? new Date(draft.end) : null,
      linkedProjectId: draft.linkedProjectId || "none"
    });
    setRightView("session-form");
  };

  const saveSession = () => {
    const title = sessionDraft.title.trim();
    if (!title || !sessionDraft.start || !sessionDraft.end) return;

    if (isPastTime(sessionDraft.start)) {
      pushToast?.("Cannot create sessions in the past");
      return;
    }

    if (hasOverlap(sessionDraft.start, sessionDraft.end, sessions, sessionDraft.id)) {
      pushToast?.("Time slot is already occupied");
      return;
    }

    const newSession = {
      id: sessionDraft.id || uid(),
      title,
      description: sessionDraft.description.trim(),
      start: sessionDraft.start.toISOString(),
      end: sessionDraft.end.toISOString(),
      linkedProjectId: sessionDraft.linkedProjectId === 'none' ? null : sessionDraft.linkedProjectId
    };

    if (sessionDraft.id) {
      setSessions(prev => prev.map(s => s.id === sessionDraft.id ? newSession : s));
    } else {
      setSessions(prev => [...prev, newSession]);
    }
    closeForm();
  };

  const closeForm = () => {
    setRightView("calendar");
  };

  const saveTask = () => {
    const title = taskDraft.title.trim();
    if (!title) return;

    const dueIso = taskDraft.due ? new Date(taskDraft.due).toISOString() : null;

    if (taskDraft.id) {
      // Update
      setTasks(prev => prev.map(t => t.id === taskDraft.id ? {
        ...t,
        title,
        desc: taskDraft.description.trim() || undefined,
        due: dueIso,
        priority: taskDraft.priority
      } : t));
    } else {
      // Create
      setTasks(prev => [
        {
          id: uid(),
          title,
          desc: taskDraft.description.trim() || undefined,
          done: false,
          createdAt: isoNow(),
          due: dueIso,
          priority: taskDraft.priority
        },
        ...prev,
      ]);
    }
    closeForm();
  };

  const assignTask = (id, projectId) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, projectId } : t));
    const projectTitle = projects.find(p => p.id === projectId)?.name || "Project";
    pushToast?.(`Assigned to ${projectTitle}`);
  };

  const createSignal = () => { // Actually 'saveSignal' now
    const title = signalDraft.title.trim();
    if (!title) return;

    const when =
      signalDraft.mode === "in"
        ? new Date(Date.now() + Number(signalDraft.minutes || 0) * 60000)
        : new Date(signalDraft.at);
    if (isNaN(when.getTime())) return;

    if (when < new Date()) {
      pushToast?.(
        <>
          <span className="text-red-400 font-bold">Error:</span>
          <span>Time is in the past!</span>
        </>
      );
      return;
    }

    const pColor = TASK_PRIORITIES.find(p => p.value === signalDraft.priority)?.color || '#fff';
    const toastContent = (label) => (
      <>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pColor }} />
        <span>{label}</span>
      </>
    );

    if (signalDraft.id) {
      // Update logic
      setReminders(prev => prev.map(s => s.id === signalDraft.id ? {
        ...s,
        title,
        priority: signalDraft.priority,
        scheduledAt: when.toISOString()
      } : s));
      ensurePermission().then((ok) => {
        if (ok) scheduleLocalNotification(signalDraft.id, title, when.toISOString());
      });
      pushToast?.(toastContent(`Signal updated for ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`));
    } else {
      // Create
      const id = uid();
      const newSignal = {
        id,
        title,
        scheduledAt: when.toISOString(),
        createdAt: isoNow(),
        delivered: false,
        priority: signalDraft.priority
      };
      setReminders((prev) => [newSignal, ...prev]);
      ensurePermission().then((ok) => {
        if (ok) scheduleLocalNotification(id, title, newSignal.scheduledAt);
      });
      pushToast?.(toastContent(`Signal set for ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`));
    }
    closeForm();
  };

  useEffect(() => {
    rescheduleAll(reminders || []);
  }, [reminders]);

  const handleInPresetChange = (val) => {
    if (typeof val === 'number') {
      setSignalDraft(d => ({ ...d, minutes: val }));
    } else {
      // Handle smart presets
      let target = new Date();

      switch (val) {
        case 'tonight':
          target.setHours(21, 0, 0, 0); // 9 PM
          break;
        case 'tm_morning':
          target.setDate(target.getDate() + 1);
          target.setHours(9, 0, 0, 0); // 9 AM
          break;
        case 'tm_noon':
          target.setDate(target.getDate() + 1);
          target.setHours(12, 0, 0, 0); // 12 PM
          break;
        default: break;
      }

      setSignalDraft(d => ({
        ...d,
        mode: 'at',
        at: toLocalInputValue(target)
      }));
    }
  };

  const rightWidth = Number(localStorage.getItem("pulse.rightWidth")) || 420;

  // Memoized Grid Cells
  const gridCells = useMemo(() => {
    const monthStart = new Date(view.y, view.m, 1);
    const monthEnd = new Date(view.y, view.m + 1, 0);
    const startPad = (monthStart.getDay() + 6) % 7;
    const daysInMonth = monthEnd.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [view.y, view.m]);

  // Memoized Task Lookup
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.deleted || !t.due) return;
      const key = new Date(t.due).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const tasksOn = React.useCallback((date) => {
    if (!date) return [];
    return tasksByDate[date.toDateString()] || [];
  }, [tasksByDate]);

  const toggleTask = (id) => setTasks((prev) => prev.map((x) => {
    if (x.id !== id) return x;
    const isDone = !x.done;
    return { ...x, done: isDone, completedAt: isDone ? isoNow() : null };
  }));
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  const upcomingSignals = useMemo(
    () => reminders.filter((r) => !r.delivered).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  // Auto-cleanup: Remove expired sessions
  useEffect(() => {
    const now = new Date();
    const activeSessions = sessions.filter(s => new Date(s.end) > now);
    if (activeSessions.length !== sessions.length) {
      setSessions(activeSessions);
    }
  }, [selectedDate]); // Run when date changes

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>

      <div
        className={cn(
          "w-full max-w-5xl h-[calc(100dvh-2rem)] sm:h-[80vh] mx-2 sm:mx-4 rounded-xl sm:rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300",
          "border border-white/10 bg-black/80 backdrop-blur-xl",
          "grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[minmax(0,1fr)_var(--right-width)]"
        )}
        style={{ '--right-width': `${rightWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="h-full flex flex-col overflow-hidden border-b border-white/5 md:border-b-0 md:border-r">
          <div className="flex-none px-8 py-6 pb-4 flex items-center justify-between bg-black/80 backdrop-blur-xl z-10">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Chronos</h2>
            <div className="flex items-center gap-6">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{today.toLocaleDateString()}</span>
              <CloseButton onClick={onClose} aria-label="Close Modal" className="text-zinc-400 hover:text-white transition-colors" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between group py-2 pt-0">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tasks</h3>
                <button onClick={() => openTaskForm()} aria-label="Add Task" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white">+</button>
              </div>

              <div className="space-y-2">
                {(() => {
                  const list = selectedDate ? tasksOn(selectedDate) : tasks.filter(t => !t.done);
                  if (list.length === 0) {
                    return <div className="py-8 text-center text-sm text-zinc-600 italic">No tasks for {selectedDate ? "this day" : "now"}.</div>;
                  }
                  return list.map(t => (
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
              <div className="flex items-center justify-between group py-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Signals</h3>
                <button onClick={() => openSignalForm()} aria-label="Add Signal" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white">+</button>
              </div>

              <div className="space-y-2">
                {upcomingSignals.length === 0 && <div className="py-2 text-sm text-zinc-600 italic">No active signals.</div>}
                {upcomingSignals.map(s => (
                  <SignalRow
                    key={s.id}
                    signal={s}
                    onDelete={() => { clearScheduled(s.id); setReminders(p => p.filter(x => x.id !== s.id)); }}
                    onEdit={() => openSignalForm(s)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-full bg-black/20 flex flex-col md:border-l border-white/5 relative overflow-hidden">

          {rightView === 'calendar' && (
            <>
              <div className="p-6 pb-2 flex-none flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : new Date(view.y, view.m, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">‹</button>
                  <button onClick={() => setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">›</button>
                </div>
              </div>

              <div className="px-6 pb-6 flex-none">
                <div className="grid grid-cols-7 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-center text-fluid-3xs font-bold text-zinc-600 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                  {gridCells.map((d, i) => {
                    const isToday = d && sameDay(d, today);
                    const isSel = d && sameDay(d, selectedDate);
                    const hasTasks = d && tasksOn(d).length > 0;
                    const isPast = d && d < today && !sameDay(d, today);

                    return (
                      <div key={i} className="aspect-square">
                        {d && (
                          <button
                            onClick={() => setSelectedDate(prev => prev && sameDay(prev, d) ? null : d)}
                            className={cn(
                              "w-full h-full rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                              isSel ? "bg-white text-black shadow-lg scale-100 font-semibold" : isPast ? "text-zinc-600 hover:bg-white/5 hover:text-zinc-500" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                              isToday && !isSel ? "bg-white/10 text-white border border-white/10" : ""
                            )}
                          >
                            <span className="text-xs">{d.getDate()}</span>
                            {hasTasks && <span className={cn("absolute bottom-1.5 w-1 h-1 rounded-full", isSel ? "bg-black" : "bg-zinc-500")} />}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 border-t border-white/5 flex flex-col min-h-0 bg-black/20 overflow-hidden">
                <div className="p-4 px-6 border-b border-white/5 flex-none flex items-center justify-between bg-black/10 z-10">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    SESSIONS
                  </span>
                </div>

                <DailyTimeline
                  sessions={sessions}
                  setSessions={setSessions}
                  selectedDate={selectedDate}
                  onOpenSessionForm={openSessionForm}
                  editingSessionId={rightView === 'session-form' ? sessionDraft.id : null}
                />
              </div>
            </>
          )}

          {rightView === 'task-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-white">
                  {taskDraft.id ? "Edit Task" : "New Task"}
                </h2>
                <button onClick={closeForm} className="text-zinc-400 hover:text-white text-sm focus:outline-none focus-visible:underline">Cancel</button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Title</label>
                  <input
                    autoFocus
                    className={cn(INPUT_CLASS, "w-full p-4")}
                    placeholder="What needs to be done?"
                    value={taskDraft.title}
                    onChange={e => setTaskDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveTask()}
                  />
                </div>



                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <CustomSelect
                      label="Priority"
                      value={taskDraft.priority}
                      options={TASK_PRIORITIES}
                      onChange={val => setTaskDraft(d => ({ ...d, priority: val }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <DateTimePicker
                      label="Deadline"
                      value={taskDraft.due}
                      dateOnly={true}
                      onChange={val => setTaskDraft(d => ({ ...d, due: val }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Description</label>
                  <textarea className={cn(INPUT_CLASS, "w-full p-4 h-40 resize-none custom-scrollbar")} placeholder="Add details..." value={taskDraft.description} onChange={e => setTaskDraft(d => ({ ...d, description: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={saveTask} className="bg-white text-black font-semibold rounded-xl px-8 py-3 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  {taskDraft.id ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </div>
          )}

          {rightView === 'signal-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-white">
                  {signalDraft.id ? "Edit Signal" : "New Signal"}
                </h2>
                <button onClick={closeForm} className="text-zinc-400 hover:text-white text-sm focus:outline-none focus-visible:underline">Cancel</button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Title</label>
                  <input
                    autoFocus
                    className={cn(INPUT_CLASS, "w-full p-4")}
                    placeholder="Signal name..."
                    value={signalDraft.title}
                    onChange={e => setSignalDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createSignal()}
                  />
                </div>

                <div className="space-y-6">

                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1 block">Time</label>
                    <div className="grid grid-cols-[100px_1fr] gap-3 h-[46px]">
                      <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        <button onClick={() => setSignalDraft(d => ({ ...d, mode: 'in' }))} className={cn("rounded-lg text-xs font-medium transition-all", signalDraft.mode === 'in' ? "bg-white text-black shadow" : "text-zinc-500 hover:text-white")}>In</button>
                        <button onClick={() => setSignalDraft(d => ({ ...d, mode: 'at' }))} className={cn("rounded-lg text-xs font-medium transition-all", signalDraft.mode === 'at' ? "bg-white text-black shadow" : "text-zinc-500 hover:text-white")}>At</button>
                      </div>

                      {signalDraft.mode === 'in' ? (
                        <CustomSelect
                          value={signalDraft.minutes}
                          options={IN_PRESETS}
                          onChange={handleInPresetChange}
                          placeholder="Duration"
                        />
                      ) : (
                        <DateTimePicker
                          value={signalDraft.at}
                          onChange={val => setSignalDraft(d => ({ ...d, at: val }))}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <CustomSelect
                      label="Priority"
                      value={signalDraft.priority}
                      options={SIGNAL_PRIORITIES}
                      onChange={val => setSignalDraft(d => ({ ...d, priority: val }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Description</label>
                  <textarea className={cn(INPUT_CLASS, "w-full p-4 h-40 resize-none custom-scrollbar")} placeholder="Signal details..." value={signalDraft.description} onChange={e => setSignalDraft(d => ({ ...d, description: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={createSignal} className="bg-white text-black font-semibold rounded-xl px-8 py-3 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  {signalDraft.id ? "Save Changes" : "Create Signal"}
                </button>
              </div>
            </div>
          )}

          {rightView === 'session-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-white">
                  {sessionDraft.id ? "Edit Session" : "New Session"}
                </h2>
                <button onClick={closeForm} className="text-zinc-400 hover:text-white text-sm focus:outline-none focus-visible:underline">Cancel</button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Title</label>
                  <input
                    autoFocus
                    className={cn(INPUT_CLASS, "w-full p-4")}
                    placeholder="Deep work session..."
                    value={sessionDraft.title}
                    onChange={e => setSessionDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveSession()}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <DateTimePicker
                      label="Start"
                      value={sessionDraft.start ? toLocalInputValue(sessionDraft.start) : ""}
                      onChange={val => setSessionDraft(d => ({ ...d, start: new Date(val) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <DateTimePicker
                      label="End"
                      value={sessionDraft.end ? toLocalInputValue(sessionDraft.end) : ""}
                      onChange={val => setSessionDraft(d => ({ ...d, end: new Date(val) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Project</label>
                  <PillSelect
                    value={sessionDraft.linkedProjectId}
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    onChange={val => setSessionDraft(d => ({ ...d, linkedProjectId: val }))}
                    placeholder="Link Project"
                    icon={Folder}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Description</label>
                  <textarea className={cn(INPUT_CLASS, "w-full p-4 h-32 resize-none custom-scrollbar")} placeholder="What will you work on..." value={sessionDraft.description} onChange={e => setSessionDraft(d => ({ ...d, description: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={saveSession} className="bg-white text-black font-semibold rounded-xl px-8 py-3 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  {sessionDraft.id ? "Save Changes" : "Create Session"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
