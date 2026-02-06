// @maia:chronos-modal
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { uid, isoNow } from "../lib/ids.js";
import { ensurePermission, scheduleLocalNotification, rescheduleAll, clearScheduled } from "../utils/notify.js";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- CONSTANTS ---
const NEON_BLUE = '#3377FF';
const NEON_ORANGE = '#FF5930';
const NEON_GREEN = '#ABFA54';

const TASK_PRIORITIES = [
  { value: 'p1', label: 'High Priority', color: NEON_BLUE },
  { value: 'p2', label: 'Medium Priority', color: NEON_ORANGE },
  { value: 'p3', label: 'Normal Priority', color: NEON_GREEN }
];

const SIGNAL_PRIORITIES = [
  { value: 'high', label: 'High', color: NEON_BLUE },
  { value: 'medium', label: 'Medium', color: NEON_ORANGE },
  { value: 'low', label: 'Low', color: NEON_GREEN }
];

const IN_PRESETS = [
  { value: 5, label: '5 m' },
  { value: 10, label: '10 m' },
  { value: 15, label: '15 m' },
  { value: 30, label: '30 m' },
  { value: 60, label: '1 h' },
  { value: 240, label: 'Later today (4h)' },
  { value: 'tonight', label: 'Tonight (9pm)' },
  { value: 'tm_morning', label: 'Tomorrow Morning (9am)' },
  { value: 'tm_noon', label: 'Tomorrow (12pm)' }
];

const getPriorityColor = (p) => {
  switch (p) {
    case 'high': case 'p1': return NEON_BLUE;
    case 'medium': case 'p2': return NEON_ORANGE;
    case 'low': case 'p3': return NEON_GREEN;
    default: return NEON_GREEN;
  }
};

// --- HELPERS ---

const INPUT_CLASS = "bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none ring-0 focus:outline-none focus:ring-0 focus:border-white/10 focus-visible:ring-2 focus-visible:ring-white/20 transition-all placeholder:text-zinc-600";
const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";

function Portal({ children }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

function CloseButton({ onClick, className, "aria-label": ariaLabel = "Close" }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
      aria-label={ariaLabel}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  )
}

function PriorityCheckbox({ checked, onChange, priority }) {
  const color = getPriorityColor(priority);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange && onChange(); }}
      aria-label={`Mark as ${checked ? 'not done' : 'done'} - Priority ${priority}`}
      className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 relative group",
        checked
          ? "bg-white/20 text-white"
          : "bg-transparent hover:bg-white/5"
      )}
    >
      {/* The Dot (Visible when not checked) */}
      <span
        className={cn(
          "absolute w-2 h-2 rounded-full transition-all duration-300",
          checked ? "opacity-0 scale-0" : "opacity-100 scale-100"
        )}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
      />

      {/* The Checkmark (Visible when checked) */}
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        className={cn(
          "transition-all duration-300 relative z-10",
          checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
        )}
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>

      {/* Hover Hint (Empty circle ring on hover when not checked) */}
      {!checked && (
        <span className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-colors" />
      )}
    </button>
  )
}

function CustomSelect({ label, value, options, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const globalClick = (e) => {
      if (open && ref.current && !ref.current.contains(e.target) && !e.target.closest('.custom-portal-content')) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", globalClick);
    return () => window.removeEventListener("mousedown", globalClick);
  }, [open]);

  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [open]);

  const selectedIdx = options.findIndex(o => o.value == value);
  const selectedOption = selectedIdx >= 0 ? options[selectedIdx] : null;

  return (
    <div className="relative space-y-2 h-full flex flex-col min-w-0" ref={ref}>
      {label && <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1 block">{label}</label>}
      <button
        onClick={() => setOpen(!open)}
        className={cn(INPUT_CLASS, "w-full p-3 flex justify-between items-center text-left h-full min-h-[46px]")}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
          )}
          <span className="truncate">{selectedOption?.label || value || placeholder}</span>
        </div>
        <span className="text-zinc-500 text-xs shrink-0 ml-1">▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.1 }}
              className={cn(POPOVER_CLASS, "fixed z-[9999] py-1 max-h-56 overflow-y-auto custom-scrollbar custom-portal-content")}
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-3",
                    opt.value == value ? "bg-white/5 text-white" : "text-zinc-400"
                  )}
                >
                  {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                  <span className={cn(opt.value == value ? "font-medium" : "")}>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  )
}

// Custom Date Time Picker Popover (12h Support + AM/PM Toggle)
function DateTimePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [tab, setTab] = useState('date');
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const dateObj = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(dateObj));

  // Derived 12h values
  const hours24 = dateObj.getHours();
  const isPm = hours24 >= 12;
  const hours12 = hours24 % 12 || 12; // 0 becomes 12
  const minutes = dateObj.getMinutes();

  useEffect(() => {
    const globalClick = (e) => {
      if (open && ref.current && !ref.current.contains(e.target) && !e.target.closest('.custom-portal-content')) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", globalClick);
    return () => window.removeEventListener("mousedown", globalClick);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (open && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [open]);

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startPad = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const gridCells = [];
  for (let i = 0; i < startPad; i++) gridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));

  const setDatePart = (d) => {
    const newDate = new Date(dateObj);
    newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(toLocalInputValue(newDate));
    setTab('time');
  };

  const setTimePart = (field, val) => {
    // field: 'hour' (1-12), 'min' (0-59), 'ampm' ('AM'|'PM')
    let newH = hours24;
    let newM = minutes;

    if (field === 'hour') {
      const isP = newH >= 12;
      if (val === 12) newH = isP ? 12 : 0;
      else newH = isP ? val + 12 : val;
    } else if (field === 'min') {
      newM = val;
    } else if (field === 'ampm') {
      if (val === 'AM' && newH >= 12) newH -= 12;
      if (val === 'PM' && newH < 12) newH += 12;
    }

    const newDate = new Date(dateObj);
    newDate.setHours(newH, newM);
    onChange(toLocalInputValue(newDate));
  };

  const formatDisplay = (d) => {
    if (!d) return "Select Time...";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Invalid Date";
    // Format: Feb 6 , 2:23 PM (Without year, matching user pref)
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} , ${timeStr}`;
  };

  const toLocalInputValue = (date) => {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
  };

  return (
    <div className="relative space-y-2 h-full flex flex-col min-w-0" ref={ref}>
      {label && <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1 block">{label}</label>}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Select Date and Time"
        className={cn(INPUT_CLASS, "w-full p-3 flex justify-between items-center text-left h-full min-h-[46px]")}
      >
        <div className="flex items-center gap-3 truncate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span className="truncate flex-1">{formatDisplay(value)}</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.1 }}
              className={cn(POPOVER_CLASS, "fixed z-[9999] p-4 custom-portal-content w-80")}
              style={{ top: coords.top, left: coords.left }}
            >
              {/* Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl mb-4">
                <button onClick={() => setTab('date')} className={cn("flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors", tab === 'date' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-white")}>Date</button>
                <button onClick={() => setTab('time')} className={cn("flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors", tab === 'time' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-white")}>Time</button>
              </div>

              {tab === 'date' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-white text-sm font-medium px-1">
                    <button onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth() - 1)))} className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-white">‹</button>
                    <span>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth() + 1)))} className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-white">›</button>
                  </div>
                  <div className="grid grid-cols-7 text-center gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-[10px] uppercase font-bold text-zinc-600 py-1">{d}</div>)}
                    {gridCells.map((d, i) => (
                      <div key={i} className="aspect-square">
                        {d && (
                          <button
                            onClick={() => setDatePart(d)}
                            className={cn(
                              "w-full h-full text-xs rounded-lg hover:bg-white/10 flex items-center justify-center transition-all",
                              d.toDateString() === dateObj.toDateString() ? "bg-white text-black font-bold shadow-lg scale-110" : "text-zinc-400"
                            )}
                          >
                            {d.getDate()}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'time' && (
                <div className="flex flex-col gap-2">
                  {/* Lists: Hours | Mins */}
                  <div className="h-52 grid grid-cols-2 gap-2 overflow-hidden pb-1">
                    <div className="overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1 border-r border-white/5">
                      <div className="text-[10px] text-zinc-600 uppercase font-bold text-center mb-1 sticky top-0 bg-[#09090b] py-1 z-10">Hour</div>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <button
                          key={h}
                          onClick={() => setTimePart('hour', h)}
                          className={cn("text-xs py-2 rounded-lg hover:bg-white/10 shrink-0 transition-colors", h === hours12 ? "bg-white/20 text-white font-bold" : "text-zinc-400")}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex flex-col gap-1">
                      <div className="text-[10px] text-zinc-600 uppercase font-bold text-center mb-1 sticky top-0 bg-[#09090b] py-1 z-10">Min</div>
                      {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                        <button
                          key={m}
                          onClick={() => setTimePart('min', m)}
                          className={cn("text-xs py-2 rounded-lg hover:bg-white/10 shrink-0 transition-colors", m === minutes ? "bg-white/20 text-white font-bold" : "text-zinc-400")}
                        >
                          {m.toString().padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AM/PM Toggle Footer - DISTINCT STYLE */}
                  <div className="flex justify-center pt-1">
                    <div className="grid grid-cols-2 gap-0 bg-black p-0.5 rounded-lg border border-white/20 w-fit">
                      <button
                        onClick={() => setTimePart('ampm', 'AM')}
                        className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", !isPm ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        AM
                      </button>
                      <button
                        onClick={() => setTimePart('ampm', 'PM')}
                        className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", isPm ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ChronosModal({
  onClose,
  tasks,
  setTasks,
  reminders,
  setReminders,
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

  const toLocalInputValue = (date) => {
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

  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [rightView, setRightView] = useState("calendar");

  const scrollContainerRef = useRef(null);

  // Auto-scroll to 7 AM when selectedDate changes or modal opens
  useLayoutEffect(() => {
    if (selectedDate && rightView === 'calendar') {
      const el = document.getElementById('timeline-hour-7');
      if (el && scrollContainerRef.current) {
        el.scrollIntoView({ block: 'start' });
      }
    }
  }, [selectedDate, rightView]);

  const [signalDraft, setSignalDraft] = useState({
    title: "",
    description: "",
    priority: "low",
    mode: "in",
    minutes: 15,
    at: toLocalInputValue(new Date()),
  });

  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    priority: "p3",
    repeating: "none",
    at: ""
  });

  const openTaskForm = (prefillDate = null) => {
    let base = prefillDate ? new Date(prefillDate) : (selectedDate ? new Date(selectedDate) : new Date());
    if (!prefillDate && !selectedDate) base.setHours(9, 0, 0, 0);
    else if (prefillDate) base = new Date(prefillDate);

    setTaskDraft({
      title: "",
      description: "",
      priority: "p3",
      repeating: "none",
      at: toLocalInputValue(base),
    });
    setRightView("task-form");
  };

  const openSignalForm = () => {
    setSignalDraft({
      title: "",
      description: "",
      priority: "low",
      mode: "in",
      minutes: 15,
      at: toLocalInputValue(new Date()),
    });
    setRightView("signal-form");
  };

  const closeForm = () => {
    setRightView("calendar");
  };

  const addTask = (title, date = null, description, priority = "p3") => {
    const t = (title || "").trim();
    if (!t) return;
    const dueIso = date ? new Date(date).toISOString() : null;
    setTasks((prev) => [
      { id: uid(), title: t, desc: description, done: false, createdAt: isoNow(), due: dueIso, priority },
      ...prev,
    ]);
  };
  const createTask = () => {
    const title = taskDraft.title.trim();
    if (!title || !taskDraft.at) return;
    addTask(title, new Date(taskDraft.at), taskDraft.description.trim() || undefined, taskDraft.priority);
    closeForm();
  };

  const createSignal = () => {
    const title = signalDraft.title.trim();
    if (!title) return;

    const when =
      signalDraft.mode === "in"
        ? new Date(Date.now() + Number(signalDraft.minutes || 0) * 60000)
        : new Date(signalDraft.at);
    if (isNaN(when.getTime())) return;

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
    closeForm();

    ensurePermission().then((ok) => {
      if (ok) scheduleLocalNotification(id, title, newSignal.scheduledAt);
    });
    pushToast?.(`Signal set for ${when.toLocaleTimeString()}`);
  };

  useEffect(() => {
    rescheduleAll(reminders || []);
  }, [reminders]);

  const handleInPresetChange = (val) => {
    if (typeof val === 'number') {
      setSignalDraft(d => ({ ...d, minutes: val }));
    } else {
      // Handle smart presets
      const now = new Date();
      let target = new Date();

      switch (val) {
        case 'tonight':
          target.setHours(21, 0, 0, 0); // 9 PM
          // If it's already past 9pm, maybe set for tomorrow? Or just keep today even if past. 
          // User said "Tonight (9pm)". Let's assume today.
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

  const containerRef = useRef(null);
  const [rightWidth, setRightWidth] = useState(() =>
    Number(localStorage.getItem("pulse.rightWidth")) || 420
  );

  const monthStart = new Date(view.y, view.m, 1);
  const monthEnd = new Date(view.y, view.m + 1, 0);
  const startPad = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const gridCells = [];
  for (let i = 0; i < startPad; i++) gridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(new Date(view.y, view.m, d));
  while (gridCells.length < 42) gridCells.push(null);

  const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
  const tasksOn = (date) => tasks.filter((t) => t.due && sameDay(new Date(t.due), date));

  const toggleTask = (id) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  const upcomingSignals = useMemo(
    () => reminders.filter((r) => !r.delivered).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>

      <div
        ref={containerRef}
        className={cn(
          "w-full max-w-5xl h-[80vh] rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300",
          "border border-white/10 bg-black/80 backdrop-blur-xl",
          "grid"
        )}
        style={{ gridTemplateColumns: `minmax(0,1fr) ${rightWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="h-full flex flex-col overflow-hidden border-r border-white/5">
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
                <button onClick={() => openTaskForm()} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white">+</button>
              </div>

              <div className="space-y-2">
                {(() => {
                  const list = selectedDate ? tasksOn(selectedDate) : tasks.filter(t => !t.done);
                  if (list.length === 0) {
                    return <div className="py-8 text-center text-sm text-zinc-600 italic">No tasks for {selectedDate ? "this day" : "now"}.</div>;
                  }
                  return list.map(t => (
                    <div key={t.id} className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:bg-white/10">
                      <PriorityCheckbox checked={t.done} priority={t.priority || 'p3'} onChange={() => toggleTask(t.id)} />
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-medium transition-colors truncate", t.done ? "text-zinc-500 line-through" : "text-zinc-200")}>{t.title}</div>
                        {t.due && <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{new Date(t.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                      </div>
                      <CloseButton onClick={() => deleteTask(t.id)} aria-label="Delete Task" className="opacity-0 group-hover:opacity-100" />
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between group py-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Signals</h3>
                <button onClick={() => openSignalForm()} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white">+</button>
              </div>

              <div className="space-y-2">
                {upcomingSignals.length === 0 && <div className="py-2 text-sm text-zinc-600 italic">No active signals.</div>}
                {upcomingSignals.map(s => {
                  const dotColor = getPriorityColor(s.priority || 'low');
                  return (
                    <div key={s.id} className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all">
                      {/* Alignment Wrapper for Dot: Matches Task Checkbox size (w-5 h-5) */}
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ backgroundColor: dotColor }}></span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-200 truncate">{s.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <CloseButton onClick={() => { clearScheduled(s.id); setReminders(p => p.filter(x => x.id !== s.id)); }} aria-label="Delete Signal" className="opacity-0 group-hover:opacity-100" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="h-full bg-black/20 flex flex-col border-l border-white/5 relative overflow-hidden">

          {rightView === 'calendar' && (
            <>
              <div className="p-6 pb-2 flex-none flex items-center justify-between">
                <span className="text-lg font-medium text-white">
                  {new Date(view.y, view.m, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">‹</button>
                  <button onClick={() => setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">›</button>
                </div>
              </div>

              <div className="px-6 pb-6 flex-none">
                <div className="grid grid-cols-7 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-center text-[10px] font-bold text-zinc-600 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                  {gridCells.map((d, i) => {
                    const isToday = d && sameDay(d, today);
                    const isSel = d && sameDay(d, selectedDate);
                    const hasTasks = d && tasksOn(d).length > 0;

                    return (
                      <div key={i} className="aspect-square">
                        {d && (
                          <button
                            onClick={() => setSelectedDate(d)}
                            className={cn(
                              "w-full h-full rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                              isSel ? "bg-white text-black shadow-lg scale-100 font-semibold" : "text-zinc-400 hover:bg-white/5 hover:text-white",
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
                    {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : "Select a date"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0" ref={scrollContainerRef}>
                  {selectedDate ? (() => {
                    // Standard 0-23h List
                    const hours = Array.from({ length: 24 }, (_, i) => i);

                    return hours.map((hour) => {
                      const slotDate = new Date(selectedDate); slotDate.setHours(hour, 0, 0, 0);
                      const slotEnd = new Date(selectedDate); slotEnd.setHours(hour + 1, 0, 0, 0);

                      const slotTasks = tasks.filter(t => t.due && new Date(t.due) >= slotDate && new Date(t.due) < slotEnd);

                      // 12h Formatting
                      const isPm = hour >= 12;
                      const h12 = hour % 12 || 12;
                      const label = `${h12.toString().padStart(2, '0')}:${'00'} ${isPm ? 'PM' : 'AM'}`;

                      return (
                        <div
                          key={hour}
                          id={`timeline-hour-${hour}`}
                          className="group flex border-b border-white/5 min-h-[60px] hover:bg-white/[0.02] cursor-pointer"
                          onDoubleClick={() => openTaskForm(slotDate)}
                        >                        <div className="w-20 border-r border-white/5 text-[10px] text-zinc-600 font-mono flex items-center justify-center shrink-0 group-hover:text-zinc-400">
                            {label}
                          </div>
                          <div className="flex-1 p-1 pl-2 flex flex-col justify-center">
                            {slotTasks.map(t => (
                              <div key={t.id} className="text-xs font-medium text-zinc-200 bg-white/5 px-3 py-1.5 rounded-lg inline-block w-max border border-white/10 hover:bg-white/10 transition-colors mb-1 shadow-sm">
                                {t.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    });
                  })() : (
                    <div className="h-full flex items-center justify-center text-zinc-700 text-sm italic">
                      Select a date to view timeline
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {rightView === 'task-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-white">New Task</h2>
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
                    onKeyDown={e => e.key === 'Enter' && createTask()}
                  />
                </div>

                <div className="space-y-2">
                  <CustomSelect
                    label="Priority"
                    value={taskDraft.priority}
                    options={TASK_PRIORITIES}
                    onChange={val => setTaskDraft(d => ({ ...d, priority: val }))}
                  />
                </div>

                <div className="space-y-2">
                  <CustomSelect
                    label="Repeating"
                    value={taskDraft.repeating}
                    options={[
                      { value: 'none', label: 'Does not repeat' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                    onChange={val => setTaskDraft(d => ({ ...d, repeating: val }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Description</label>
                  <textarea className={cn(INPUT_CLASS, "w-full p-4 h-40 resize-none custom-scrollbar")} placeholder="Add details..." value={taskDraft.description} onChange={e => setTaskDraft(d => ({ ...d, description: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={createTask} className="bg-white text-black font-semibold rounded-xl px-8 py-3 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Create Task
                </button>
              </div>
            </div>
          )}

          {rightView === 'signal-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-white">New Signal</h2>
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
                  Create Signal
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
