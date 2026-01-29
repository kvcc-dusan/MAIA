// @maia:pulse (split layout: left = tasks+reminders, right = full-height calendar)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { ensurePermission, scheduleLocalNotification, rescheduleAll, clearScheduled } from "../utils/notify.js";

// @maia:pulse
export default function PulsePage({
  tasks,
  setTasks,
  reminders,
  setReminders,
  pushToast,
  goBack,
}) {
  const today = new Date();

  // ---- calendar view state
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // Always show a Day Plan: default to *today*
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // ---- reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDraft, setReminderDraft] = useState({
    title: "",
    mode: "in",
    minutes: 15,
    at: new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
  });

  // quick-pick helpers for the reminder modal
  const setInMinutes = (mins) =>
    setReminderDraft((d) => ({ ...d, mode: "in", minutes: mins }));

  const scheduleFor = (date) =>
    setReminderDraft((d) => ({ ...d, mode: "at", at: toLocalInputValue(date) }));

  const laterToday = () => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); // if past 18:00, use tomorrow
    scheduleFor(d);
  };

  const tomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    scheduleFor(d);
  };

  const nextMondayMorning = () => {
    const d = new Date();
    const day = d.getDay(); // Sun=0 .. Sat=6
    let add = (8 - day) % 7; // days until next Monday
    if (add === 0) add = 7;
    d.setDate(d.getDate() + add);
    d.setHours(9, 0, 0, 0);
    scheduleFor(d);
  };

  // --- Task modal state ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    at: "" // "yyyy-MM-ddTHH:mm"
  });

  // open with an optional date (prefill from selected calendar day if present)
  const openTaskModal = () => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    if (!selectedDate) base.setHours(9, 0, 0, 0); // default 09:00 if no day selected
    setTaskDraft({
      title: "",
      description: "",
      at: toLocalInputValue(base),
    });
    setShowTaskModal(true);
  };
  const closeTaskModal = () => setShowTaskModal(false);

  // quick picks
  const taskPickTodayEvening = () => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    setTaskDraft((t) => ({ ...t, at: toLocalInputValue(d) }));
  };
  const taskPickTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setTaskDraft((t) => ({ ...t, at: toLocalInputValue(d) }));
  };
  const taskPickNextMonday = () => {
    const d = new Date();
    const day = d.getDay();          // Sun=0..Sat=6
    let add = (8 - day) % 7;         // next Monday
    if (add === 0) add = 7;
    d.setDate(d.getDate() + add);
    d.setHours(9, 0, 0, 0);
    setTaskDraft((t) => ({ ...t, at: toLocalInputValue(d) }));
  };

  const createTaskFromModal = () => {
    const title = taskDraft.title.trim();
    if (!title || !taskDraft.at) return;
    addTask(title, new Date(taskDraft.at), taskDraft.description.trim() || undefined);
    closeTaskModal();
  };

  // reschedule native notifications when reminders change
  useEffect(() => {
    rescheduleAll(reminders || []);
  }, [reminders]);

  // =========================
  // Resizable right pane (calendar)
  // =========================
  const containerRef = useRef(null);
  const HANDLE_W = 8;
  const MIN_RIGHT = 360;
  const MAX_RIGHT = 900;
  const [rightWidth, setRightWidth] = useState(() =>
    Number(localStorage.getItem("pulse.rightWidth")) || 440
  );
  useEffect(() => {
    localStorage.setItem("pulse.rightWidth", String(rightWidth));
  }, [rightWidth]);

  const draggingRef = useRef(false);
  const onHandleDown = (e) => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.min(MAX_RIGHT, Math.max(MIN_RIGHT, rect.right - e.clientX));
      setRightWidth(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // -------- calendar data
  const monthStart = new Date(view.y, view.m, 1);
  const monthEnd = new Date(view.y, view.m + 1, 0);
  const startPad = (monthStart.getDay() + 6) % 7; // Monday=0
  const days = monthEnd.getDate();
  const grid = [];
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(new Date(view.y, view.m, d));
  while (grid.length % 7 !== 0) grid.push(null);

  const sameDay = (a, b) =>
    a && b && new Date(a).toDateString() === new Date(b).toDateString();
  const tasksOn = (date) =>
    tasks.filter((t) => t.due && sameDay(new Date(t.due), date));

  // -------- tasks
  const addTask = (title, date = null, description) => {
    const t = (title || "").trim();
    if (!t) return;
    // Preserve the exact time passed in
    const dueIso = date ? new Date(date).toISOString() : null;
    setTasks((prev) => [
      { id: uid(), title: t, desc: description, done: false, createdAt: isoNow(), due: dueIso },
      ...prev,
    ]);
  };

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  // -------- reminders
  const createReminder = () => {
    const title = reminderDraft.title.trim();
    if (!title) return;

    const when =
      reminderDraft.mode === "in"
        ? new Date(Date.now() + Number(reminderDraft.minutes || 0) * 60000)
        : new Date(reminderDraft.at);
    if (isNaN(when.getTime())) return;

    const id = uid();
    const newReminder = {
      id,
      title,
      scheduledAt: when.toISOString(),
      createdAt: isoNow(),
      delivered: false,
    };

    setReminders((prev) => [newReminder, ...prev]);
    setShowReminderModal(false);
    setReminderDraft({
      title: "",
      mode: "in",
      minutes: 15,
      at: new Date().toISOString().slice(0, 16),
    });

    ensurePermission().then((ok) => {
      if (ok) scheduleLocalNotification(id, title, newReminder.scheduledAt);
    });

    pushToast?.(`Reminder set for ${when.toLocaleString()}`);
  };

  const upcoming = useMemo(
    () =>
      reminders
        .filter((r) => !r.delivered)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  const inbox = tasks.filter((t) => !t.due);
  const scheduled = tasks.filter((t) => t.due);

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      {/* FLOATING SHEET CONTAINER */}
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-6xl h-full max-h-[85vh] rounded-3xl grid overflow-hidden shadow-2xl relative"
        style={{
          gridTemplateColumns: `minmax(0,1fr) ${rightWidth}px`,
        }}
      >
        {/* LEFT: header + tasks + reminders */}
        <div className="h-full overflow-y-auto overscroll-contain p-6 space-y-6 bg-black/5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              {goBack && (
                <button
                  onClick={goBack}
                  aria-label="Back"
                  className="text-zinc-500 hover:text-white leading-none text-xl transition-colors"
                >
                  ←
                </button>
              )}
              <div className="text-xl font-medium text-white tracking-wide">Chronos</div>
            </div>
            <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{today.toLocaleDateString()}</div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Tasks card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Priority</div>
                <button onClick={openTaskModal} className="text-zinc-400 hover:text-white text-lg leading-none">+</button>
              </div>

              <div className="space-y-1">
                {(() => {
                  const list = selectedDate ? tasksOn(selectedDate) : tasks;
                  if (list.length === 0)
                    return <div className="px-4 py-6 border border-dashed border-white/5 rounded-xl text-center text-xs text-zinc-600">No tasks for today.</div>;
                  return list.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                      className="group flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t.id)}
                        className="mt-1 appearance-none w-4 h-4 border border-zinc-600 rounded-md checked:bg-zinc-400 checked:border-zinc-400 transition-colors cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${t.done ? "line-through text-zinc-600" : "text-zinc-200"}`}>
                          {t.title}
                        </div>
                        {t.due && (
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                            {new Date(t.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">×</button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Reminders card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Signals & Reminders</div>
                <button onClick={() => setShowReminderModal(true)} className="text-zinc-400 hover:text-white text-lg leading-none">+</button>
              </div>

              <div className="space-y-1">
                {upcoming.length === 0 && (
                  <div className="px-4 py-4 text-xs text-zinc-600 italic">No upcoming signals.</div>
                )}
                {upcoming.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                      <div>
                        <div className="text-zinc-200 text-sm">{r.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        clearScheduled(r.id);
                        setReminders((prev) => prev.filter((x) => x.id !== r.id));
                      }}
                      className="text-zinc-600 hover:text-zinc-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Calendar (Darker Side) */}
        <div className="h-full overflow-hidden bg-black/40 border-l border-white/5 flex flex-col relative">
          {/* Date Nav */}
          <div className="p-4 flex items-center justify-between border-b border-white/5">
            <span className="text-sm font-medium text-white tracking-wide">
              {new Date(view.y, view.m, 1).toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400">‹</button>
              <button onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400">›</button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto custom-scrollbar p-4">
            <div className="grid grid-cols-7 mb-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-zinc-600 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                const isToday = d && sameDay(d, today);
                const isSel = d && selectedDate && sameDay(d, selectedDate);
                const count = d ? tasksOn(d).length : 0;
                return (
                  <div key={i} className="aspect-square">
                    {d && (
                      <button
                        onClick={() => setSelectedDate(d)}
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData("text/task-id");
                          if (!id) return;
                          const date = new Date(d);
                          date.setHours(9, 0, 0, 0);
                          setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due: date.toISOString() } : t));
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`w-full h-full rounded-lg flex flex-col items-center justify-center transition-all relative group
                           ${isSel ? "bg-white text-black shadow-lg scale-105 z-10" : "text-zinc-400 hover:bg-white/5"}
                           ${isToday && !isSel ? "bg-white/10 text-white border border-white/20" : ""}
                         `}
                      >
                        <span className="text-xs font-medium">{d.getDate()}</span>
                        {count > 0 && <span className={`absolute bottom-2 w-1 h-1 rounded-full ${isSel ? "bg-black" : "bg-zinc-500"}`} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Timeline View for Selected Day */}
            {selectedDate && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-bold flex justify-between items-center">
                  <span>Waitlist · {selectedDate.toLocaleDateString()}</span>
                  <button onClick={() => setSelectedDate(null)} className="hover:text-white transition-colors">Clear</button>
                </div>
                <div className="space-y-[1px] bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                  {/* Simplified timeline slots - showing only active for brevity if many */}
                  {Array.from({ length: 9 }, (_, k) => k + 9).map((hour) => { // 09:00 to 17:00
                    const slotStart = new Date(selectedDate); slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(selectedDate); slotEnd.setHours(hour + 1, 0, 0, 0);
                    const inThisSlot = (tasks || []).filter((t) => {
                      if (!t.due) return false;
                      const d = new Date(t.due).getTime();
                      return d >= slotStart.getTime() && d < slotEnd.getTime();
                    });

                    return (
                      <div key={hour} className="flex bg-black/40 h-10 group hover:bg-white/5 transition-colors relative"
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData("text/task-id");
                          if (!id) return;
                          const date = new Date(selectedDate);
                          date.setHours(hour, 0, 0, 0);
                          setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due: date.toISOString() } : t));
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div className="w-12 border-r border-white/5 text-[10px] text-zinc-600 font-mono flex items-center justify-center">
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 flex items-center px-2 gap-2">
                          {inThisSlot.map(t => (
                            <div key={t.id} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded border border-white/10 truncate">
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reminder modal (simplified) */}
      {showReminderModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={() => setShowReminderModal(false)}>
          <div className="glass-panel w-[400px] p-6 rounded-2xl" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-white text-sm font-medium mb-4">Set Reminder</h3>
            <input
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none mb-4 focus:bg-white/10"
              placeholder="What's on your mind?"
              value={reminderDraft.title}
              onChange={e => setReminderDraft(d => ({ ...d, title: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReminderModal(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Cancel</button>
              <button onClick={createReminder} className="text-xs bg-white text-black px-4 py-2 rounded-lg font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
      {showTaskModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={() => setShowTaskModal(false)}>
          <div className="glass-panel w-[460px] p-6 rounded-2xl" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-white text-sm font-medium mb-4">New Task</h3>
            <input
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none mb-3 focus:bg-white/10"
              placeholder="Task name"
              value={taskDraft.title}
              onChange={e => setTaskDraft(d => ({ ...d, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createTaskFromModal()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeTaskModal} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Cancel</button>
              <button onClick={createTaskFromModal} className="text-xs bg-white text-black px-4 py-2 rounded-lg font-medium">Add Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small inputs & lists ---------- */

function TextInput({ value, onChange, placeholder, autoFocus, id, className = "" }) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md placeholder:text-zinc-500 ${className}`}
    />
  );
}

function NumberInput({ value, onChange, min = 0, className = "" }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-2 py-1.5 text-sm rounded-md ${className}`}
    />
  );
}

function TaskComposer({ onAdd, selectedDate, clearDate }) {
  const [title, setTitle] = useState("");
  const [useDeadline, setUseDeadline] = useState(false);
  const [deadline, setDeadline] = useState(""); // yyyy-MM-ddTHH:mm

  const add = () => {
    const fromCalendar = selectedDate
      ? (() => {
        const d = new Date(selectedDate);
        d.setHours(0, 0, 0, 0);
        return d;
      })()
      : null;

    const fromInput =
      useDeadline && deadline ? new Date(deadline) : null;

    const due = fromCalendar || fromInput || null;

    onAdd(title, due);
    setTitle("");
    setUseDeadline(false);
    setDeadline("");
    clearDate?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Add task${selectedDate ? " for " + selectedDate.toLocaleDateString() : ""
            }`}
          className="flex-1 bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button
          onClick={add}
          className="px-3 py-2 rounded-md bg-black text-white border border-white hover:bg-zinc-900"
        >
          Add
        </button>
      </div>

      {/* Deadline controls */}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setUseDeadline((v) => !v)}
          className={`px-2 py-1 rounded-md border ${useDeadline
              ? "border-zinc-700 bg-zinc-900/60"
              : "border-zinc-800/70 hover:bg-zinc-900/40"
            }`}
        >
          {useDeadline ? "Deadline: On" : "Set deadline"}
        </button>

        {useDeadline && !selectedDate && (
          <>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-2 py-1.5 text-sm rounded-md"
            />
            {/* Quick picks */}
            <div className="flex items-center gap-1">
              <QuickPick label="Today" onPick={() => {
                const d = new Date(); d.setHours(18, 0, 0, 0);
                setDeadline(toLocalInputValue(d));
              }} />
              <QuickPick label="Tomorrow" onPick={() => {
                const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
                setDeadline(toLocalInputValue(d));
              }} />
              <QuickPick label="Next week" onPick={() => {
                const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0);
                setDeadline(toLocalInputValue(d));
              }} />
            </div>
          </>
        )}

        {selectedDate && (
          <div className="text-xs text-zinc-500">
            Using date from calendar: {selectedDate.toLocaleDateString()}
            <button
              onClick={clearDate}
              className="ml-2 underline decoration-dotted hover:text-zinc-300"
            >
              clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// small helper components
function QuickPick({ label, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="px-2 py-0.5 rounded-full border border-zinc-800/70 hover:bg-zinc-900/50 text-xs"
    >
      {label}
    </button>
  );
}

function toLocalInputValue(date) {
  // returns "yyyy-MM-ddTHH:mm" in the user's local time
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function TaskList({ title, tasks, onToggle, onDelete, showDue = false }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-2 uppercase tracking-widest">{title}</div>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && <div className="text-zinc-600 text-sm">No tasks.</div>}
        {tasks.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
            className="flex items-center justify-between rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} />
              <span className={`text-sm ${t.done ? "line-through text-zinc-500" : "text-zinc-100"}`}>
                {t.title}
              </span>
            </label>
            <div className="flex items-center gap-3">
              {showDue && t.due && (
                <span className="text-xs text-zinc-500">{new Date(t.due).toLocaleString()}</span>
              )}
              <button
                className="text-xs text-zinc-400 hover:text-zinc-100"
                onClick={() => onDelete(t.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
