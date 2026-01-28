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
    <div
      ref={containerRef}
      className="h-full grid overflow-hidden"
      style={{
        gridTemplateColumns: `minmax(0,1fr) ${HANDLE_W}px ${rightWidth}px`,
      }}
    >
      {/* LEFT: header + tasks + reminders */}
      <div className="h-full overflow-y-auto overscroll-contain p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {goBack && (
              <button
                onClick={goBack}
                aria-label="Back"
                className="text-zinc-400 hover:text-zinc-100 leading-none text-xl -ml-1"
              >
                ←
              </button>
            )}
            <div className="text-2xl font-semibold text-zinc-100">Pulse</div>
          </div>
        </div>

        {/* Tasks card (list + New) */}
        <div className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-zinc-400 uppercase tracking-widest">
              {selectedDate
                ? `Tasks — ${selectedDate.toLocaleDateString()}`
                : "Tasks"}
            </div>
            <button
              onClick={openTaskModal}
              className="px-2 py-1 text-xs rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
            >
              + New
            </button>
          </div>

          {/* Optional info when filtered by day */}
          {selectedDate && (
            <div className="mb-2 text-xs text-zinc-500">
              Showing tasks for {selectedDate.toLocaleDateString()} •{" "}
              <button
                className="underline decoration-dotted hover:text-zinc-300"
                onClick={() => setSelectedDate(null)}
              >
                show all
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(() => {
              const list = selectedDate ? tasksOn(selectedDate) : tasks;
              if (list.length === 0)
                return <div className="text-zinc-600 text-sm">No tasks.</div>;
              return list.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40"
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className={`text-sm ${t.done ? "line-through text-zinc-500" : "text-zinc-100"}`}>
                        {t.title}
                      </div>
                      {t.desc && (
                        <div className="text-xs text-zinc-500 mt-0.5">{t.desc}</div>
                      )}
                      {t.due && (
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(t.due).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </label>
                  <button
                    className="text-xs text-zinc-400 hover:text-zinc-100"
                    onClick={() => deleteTask(t.id)}
                  >
                    Delete
                  </button>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Reminders card */}
        <div className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-zinc-400 uppercase tracking-widest">
              Upcoming Reminders
            </div>
            <button
              onClick={() => setShowReminderModal(true)}
              className="px-2 py-1 text-xs rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
            >
              + New
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.length === 0 && (
              <div className="text-zinc-500 text-sm">No reminders.</div>
            )}
            {upcoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40"
              >
                <div>
                  <div className="text-zinc-100 text-sm">{r.title}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(r.scheduledAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    clearScheduled(r.id);
                    setReminders((prev) => prev.filter((x) => x.id !== r.id));
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MIDDLE: drag handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onHandleDown}
        className="h-full cursor-col-resize bg-transparent hover:bg-zinc-800/50"
        title="Drag to resize calendar"
      />

      {/* RIGHT: full-height calendar */}
      <div className="h-full overflow-hidden bg-black/40 border-l border-zinc-800/70">
        <div className="h-full flex flex-col">
          {/* Calendar header */}
          <div className="px-3 py-2 border-b border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))
                }
                className="px-2 py-1 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
              >
                ‹
              </button>
              <div className="text-sm text-zinc-300">
                {new Date(view.y, view.m, 1).toLocaleString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                onClick={() =>
                  setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))
                }
                className="px-2 py-1 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
              >
                ›
              </button>
            </div>
            <button
              onClick={() => {
                const now = new Date();
                setView({ y: now.getFullYear(), m: now.getMonth() });
                setSelectedDate(now); // also select today for Day Plan
              }}
              className="px-2 py-1 text-zinc-400 hover:text-zinc-100"
            >
              Today
            </button>
          </div>

          {/* Calendar body */}
          <div className="flex-1 overflow-auto overscroll-contain">
            <div className="grid grid-cols-7 text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-zinc-500 border-b border-zinc-800/60"
                >
                  {d}
                </div>
              ))}

              {grid.map((d, i) => {
                const isToday = d && sameDay(d, today);
                const isSel = d && selectedDate && sameDay(d, selectedDate);
                const count = d ? tasksOn(d).length : 0;

                return (
                  <div
                    key={i}
                    className={`min-h-[86px] border-r border-b border-zinc-800/60 ${
                      i % 7 === 6 ? "border-r-0" : ""
                    } ${d ? "bg-zinc-950/40" : "bg-transparent"}`}
                  >
                    {d && (
                      <button
                        onClick={() => setSelectedDate(d)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData("text/task-id");
                          if (!id) return;
                          const date = new Date(d);
                          // default to 09:00 when dropping onto a day cell
                          date.setHours(9, 0, 0, 0);
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === id ? { ...t, due: date.toISOString() } : t
                            )
                          );
                        }}
                        className={`w-full h-full text-left p-2 flex flex-col ${isSel ? "bg-zinc-900/50" : ""}`}
                      >
                        <div
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs
                          ${isToday ? "bg-white text-black" : "text-zinc-400"}`}
                        >
                          {d.getDate()}
                        </div>

                        {count > 0 && (
                          <div className="mt-2 flex gap-1">
                            {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                              <span
                                key={j}
                                className="w-1.5 h-1.5 rounded-full bg-zinc-300/80 inline-block"
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day plan timeline (always visible because selectedDate defaults to today) */}
            {selectedDate && (
              <div className="border-t border-zinc-800/60 mt-2">
                <div className="px-3 py-2 text-xs uppercase tracking-widest text-zinc-500">
                  Day plan — {selectedDate.toLocaleDateString()}
                </div>

                <div className="max-h-[420px] overflow-auto">
                  {Array.from({ length: 12 }, (_, k) => k + 8).map((hour) => {
                    const slotStart = new Date(selectedDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(selectedDate);
                    slotEnd.setHours(hour + 1, 0, 0, 0);

                    const inThisSlot = (tasks || []).filter((t) => {
                      if (!t.due) return false;
                      const d = new Date(t.due).getTime();
                      return d >= slotStart.getTime() && d < slotEnd.getTime();
                    });

                    return (
                      <div
                        key={hour}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData("text/task-id");
                          if (!id) return;
                          const date = new Date(selectedDate);
                          date.setHours(hour, 0, 0, 0);
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === id ? { ...t, due: date.toISOString() } : t
                            )
                          );
                        }}
                        className="grid grid-cols-[80px_1fr] items-center border-t border-zinc-900/60 px-3 py-2 hover:bg-zinc-900/40"
                      >
                        <div className="text-xs text-zinc-600">
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="min-h-[32px]">
                          {inThisSlot.map((t) => (
                            <div
                              key={t.id}
                              className="inline-flex items-center gap-2 text-sm text-zinc-100 border border-zinc-800 px-2 py-1 mr-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reminder modal */}
      {showReminderModal && (
        <div
          className="fixed inset-0 bg-black/60 grid place-items-center z-50"
          onMouseDown={() => setShowReminderModal(false)}
        >
          <div
            className="w-[440px] rounded-xl bg-zinc-950 border border-zinc-800/70 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800/60 text-sm text-zinc-400">
              Create Reminder
            </div>

            <div className="p-4 flex flex-col gap-4">
              {/* Title */}
              <input
                value={reminderDraft.title}
                onChange={(e) =>
                  setReminderDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Title"
                autoFocus
                className="w-full bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md placeholder:text-zinc-500"
              />

              {/* Quick picks (IN) */}
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 45, 60].map((m) => {
                  const selected =
                    reminderDraft.mode === "in" && Number(reminderDraft.minutes) === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInMinutes(m)}
                      className={`px-2.5 py-1 rounded-full text-xs border ${
                        selected
                          ? "border-zinc-300 text-zinc-100"
                          : "border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                      }`}
                    >
                      {m < 60 ? `${m} min` : "1 h"}
                    </button>
                  );
                })}
              </div>

              {/* "In" row */}
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={reminderDraft.mode === "in"}
                    onChange={() =>
                      setReminderDraft((d) => ({ ...d, mode: "in" }))
                    }
                  />
                  In
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={reminderDraft.minutes}
                  onChange={(e) =>
                    setReminderDraft((d) => ({ ...d, minutes: e.target.value }))
                  }
                  className="w-24 bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-2 py-1.5 text-sm rounded-md"
                />
                <span className="text-sm">minutes</span>
              </div>

              {/* Divider */}
              <div className="text-xs text-zinc-600 text-center">or</div>

              {/* "At" row */}
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={reminderDraft.mode === "at"}
                    onChange={() =>
                      setReminderDraft((d) => ({ ...d, mode: "at" }))
                    }
                  />
                  At
                </label>
                <input
                  type="datetime-local"
                  value={reminderDraft.at}
                  onChange={(e) =>
                    setReminderDraft((d) => ({ ...d, at: e.target.value }))
                  }
                  className="flex-1 bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-2 py-1.5 text-sm rounded-md"
                />
              </div>

              {/* Quick picks (AT) */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={laterToday}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Later today · 18:00
                </button>
                <button
                  type="button"
                  onClick={tomorrowMorning}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Tomorrow · 09:00
                </button>
                <button
                  type="button"
                  onClick={nextMondayMorning}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Next Mon · 09:00
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-3 py-1.5 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
                >
                  Cancel
                </button>
                <button
                  onClick={createReminder}
                  className="px-3 py-1.5 rounded-md bg白 text-black"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {showTaskModal && (
        <div
          className="fixed inset-0 bg-black/60 grid place-items-center z-50"
          onMouseDown={() => setShowTaskModal(false)}
        >
          <div
            className="w-[480px] rounded-xl bg-zinc-950 border border-zinc-800/70 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800/60 text-sm text-zinc-400">
              {selectedDate
                ? `Add Task — ${selectedDate.toLocaleDateString()}`
                : "Add Task"}
            </div>

            <div className="p-4 flex flex-col gap-4">
              {/* Title */}
              <input
                value={taskDraft.title}
                onChange={(e) =>
                  setTaskDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Task title"
                autoFocus
                className="w-full bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md placeholder:text-zinc-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createTaskFromModal();
                }}
              />

              {/* Description */}
              <textarea
                value={taskDraft.description}
                onChange={(e) =>
                  setTaskDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="Description (optional)"
                rows={4}
                className="w-full bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md placeholder:text-zinc-500"
              />

              {/* Quick picks */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={taskPickTodayEvening}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Today · 18:00
                </button>
                <button
                  type="button"
                  onClick={taskPickTomorrowMorning}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Tomorrow · 09:00
                </button>
                <button
                  type="button"
                  onClick={taskPickNextMonday}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
                >
                  Next Mon · 09:00
                </button>
              </div>

              {/* When */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-400 w-[2.5rem]">At</span>
                <input
                  type="datetime-local"
                  value={taskDraft.at}
                  onChange={(e) =>
                    setTaskDraft((d) => ({ ...d, at: e.target.value }))
                  }
                  className="flex-1 bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-2 py-1.5 text-sm rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeTaskModal}
                  className="px-3 py-1.5 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
                >
                  Cancel
                </button>
                <button
                  onClick={createTaskFromModal}
                  className="px-3 py-1.5 rounded-md bg-white text-black"
                >
                  Create
                </button>
              </div>
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
          placeholder={`Add task${
            selectedDate ? " for " + selectedDate.toLocaleDateString() : ""
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
          className={`px-2 py-1 rounded-md border ${
            useDeadline
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
                const d = new Date(); d.setHours(18,0,0,0);
                setDeadline(toLocalInputValue(d));
              }} />
              <QuickPick label="Tomorrow" onPick={() => {
                const d = new Date(); d.setDate(d.getDate()+1); d.setHours(10,0,0,0);
                setDeadline(toLocalInputValue(d));
              }} />
              <QuickPick label="Next week" onPick={() => {
                const d = new Date(); d.setDate(d.getDate()+7); d.setHours(9,0,0,0);
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
