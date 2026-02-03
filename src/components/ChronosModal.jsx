// @maia:chronos-modal
import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { ensurePermission, scheduleLocalNotification, rescheduleAll, clearScheduled } from "../utils/notify.js";

export default function ChronosModal({
  onClose,
  tasks,
  setTasks,
  reminders,
  setReminders,
  pushToast,
}) {
  const today = new Date();

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toLocalInputValue = (date) => {
    // Helper to format date for datetime-local input
    const pad = (n) => (n < 10 ? "0" + n : n);
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  };

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
  const [rightWidth] = useState(() =>
    Number(localStorage.getItem("pulse.rightWidth")) || 440
  );
  // useEffect(() => {
  //   localStorage.setItem("pulse.rightWidth", String(rightWidth));
  // }, [rightWidth]);

  // const draggingRef = useRef(false);
  // const onHandleDown = (e) => {
  //   draggingRef.current = true;
  //   document.body.style.cursor = "col-resize";
  //   e.preventDefault();
  // };
  // useEffect(() => {
  //   const onMove = (e) => {
  //     if (!draggingRef.current || !containerRef.current) return;
  //     const rect = containerRef.current.getBoundingClientRect();
  //     const w = Math.min(MAX_RIGHT, Math.max(MIN_RIGHT, rect.right - e.clientX));
  //     setRightWidth(w);
  //   };
  //   const onUp = () => {
  //     if (!draggingRef.current) return;
  //     draggingRef.current = false;
  //     document.body.style.cursor = "";
  //   };
  //   window.addEventListener("mousemove", onMove);
  //   window.addEventListener("mouseup", onUp);
  //   return () => {
  //     window.removeEventListener("mousemove", onMove);
  //     window.removeEventListener("mouseup", onUp);
  //   };
  // }, []);

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

  // -------- tasks helpers
  const addTask = (title, date = null, description) => {
    const t = (title || "").trim();
    if (!t) return;
    const dueIso = date ? new Date(date).toISOString() : null;
    setTasks((prev) => [
      { id: uid(), title: t, desc: description, done: false, createdAt: isoNow(), due: dueIso },
      ...prev,
    ]);
  };
  const toggleTask = (id) =>
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  // -------- reminders helpers
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>

      {/* FLOATING SHEET CONTAINER */}
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-6xl h-[85vh] rounded-3xl grid overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
        style={{
          gridTemplateColumns: `minmax(0,1fr) ${rightWidth}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT: header + tasks + reminders */}
        <div className="h-full overflow-y-auto overscroll-contain p-6 space-y-6 bg-black/5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="text-xl font-medium text-white tracking-wide">Chronos</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{today.toLocaleDateString()}</div>
              <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" aria-label="Close">×</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Tasks card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Priority</div>
                <button onClick={openTaskModal} className="text-zinc-400 hover:text-white text-lg leading-none" aria-label="Add Task">+</button>
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
                <button onClick={() => setShowReminderModal(true)} className="text-zinc-400 hover:text-white text-lg leading-none" aria-label="Add Reminder">+</button>
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
              <button onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400" aria-label="Previous Month">‹</button>
              <button onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400" aria-label="Next Month">›</button>
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
