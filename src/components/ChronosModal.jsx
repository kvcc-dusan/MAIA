// @maia:chronos-modal
import ProjectIcon from "./ProjectIcon";
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import * as Popover from "@radix-ui/react-popover";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { uid, isoNow } from "../lib/ids.js";
import { ensurePermission, scheduleLocalNotification, rescheduleAll, clearScheduled } from "../utils/notify.js";
import { cn } from "@/lib/utils";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, CheckSquare, Folder } from "lucide-react";

// --- CONSTANTS ---
const NEON_BLUE = '#0044FF';
const NEON_ORANGE = '#FF5930';
const NEON_GREEN = '#ABFA54';

const TASK_PRIORITIES = [
  { value: 'p1', label: 'High Priority', color: NEON_BLUE },
  { value: 'p2', label: 'Medium Priority', color: NEON_ORANGE },
  { value: 'p3', label: 'Normal Priority', color: NEON_GREEN }
];

const SIGNAL_PRIORITIES = [
  { value: 'p1', label: 'High Priority', color: NEON_BLUE },
  { value: 'p2', label: 'Medium Priority', color: NEON_ORANGE },
  { value: 'p3', label: 'Normal Priority', color: NEON_GREEN }
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
    case 'p1': return NEON_BLUE;
    case 'p2': return NEON_ORANGE;
    case 'p3': return NEON_GREEN;
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

function CloseButton({ onClick, className }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
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

function PillSelect({ value, options, onChange, placeholder, icon: Icon }) {
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

  const selectedOption = options.find(o => o.value == value);
  const hasValue = value && value !== 'none';

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full border transition-all text-xs font-medium",
          hasValue ? "bg-zinc-900/50 border-zinc-700 text-white hover:bg-zinc-800/50" : "bg-zinc-900/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={14} className={cn("shrink-0", hasValue ? "text-white" : "text-zinc-500")} />}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        {hasValue ? (
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('none');
            }}
            className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={12} />
          </div>
        ) : (
          <Plus size={12} className="opacity-50" />
        )}
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
function DateTimePicker({ label, value, onChange, dateOnly = false }) {
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
    if (!dateOnly) setTab('time');
    else setOpen(false);
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
    if (!d) return dateOnly ? "Select Date..." : "Select Time...";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Invalid Date";
    // Format: Feb 6 , 2:23 PM (Without year, matching user pref)
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (dateOnly) return dateStr;
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
              {!dateOnly && (
                <div className="flex bg-white/5 p-1 rounded-xl mb-4">
                  <button onClick={() => setTab('date')} className={cn("flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors", tab === 'date' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-white")}>Date</button>
                  <button onClick={() => setTab('time')} className={cn("flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors", tab === 'time' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-white")}>Time</button>
                </div>
              )}

              {tab === 'date' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-white text-sm font-medium px-1">
                    <button onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth() - 1)))} className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-white">‹</button>
                    <span>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth() + 1)))} className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-white">›</button>
                  </div>
                  <div className="grid grid-cols-7 text-center gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <div key={d} className="text-[10px] uppercase font-bold text-zinc-600 py-1">{d}</div>)}
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

              {tab === 'time' && !dateOnly && (
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

// --- POPUP & CONTEXT MENU ROW COMPONENTS ---

function TaskRow({ task, onToggle, onDelete, onEdit, onAssign, projects = [] }) {
  const [open, setOpen] = useState(false);

  // Derived
  const priorityLabel = TASK_PRIORITIES.find(p => p.value === (task.priority || 'p3'))?.label || 'Normal';
  const priorityColor = getPriorityColor(task.priority || 'p3');

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="block">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <div
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:bg-white/10 cursor-pointer"
              onClick={(e) => {
                // Prevent popover if clicking checkbox or delete
                if (e.target.closest('button')) {
                  e.preventDefault();
                  return;
                }
              }}
            >
              <PriorityCheckbox checked={task.done} priority={task.priority || 'p3'} onChange={onToggle} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium transition-colors truncate", task.done ? "text-zinc-500 line-through" : "text-zinc-200")}>{task.title}</div>
                {task.due && <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
              <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" />
            </div>
          </Popover.Trigger>

          <AnimatePresence>
            {open && (
              <Popover.Portal>
                <Popover.Content
                  className={cn(POPOVER_CLASS, "z-[9999] w-64 p-4 animate-in zoom-in-95 duration-200")}
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-white text-sm leading-tight">{task.title}</h4>
                      <Popover.Close className="text-zinc-500 hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </Popover.Close>
                    </div>
                    {task.desc && <p className="text-xs text-zinc-400 leading-relaxed">{task.desc}</p>}

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
                        <span className="text-[10px] font-medium text-zinc-300">{priorityLabel}</span>
                      </div>
                      {task.due && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(task.due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Popover.Arrow className="fill-[#09090b]" />
                </Popover.Content>
              </Popover.Portal>
            )}
          </AnimatePresence>
        </Popover.Root>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={cn(POPOVER_CLASS, "z-[9999] w-48 p-1 animate-in fade-in duration-200 overflow-hidden")}>
          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors"
            onSelect={onEdit}
          >
            <span>Edit Task</span>
          </ContextMenu.Item>

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors">
              Assign to Project
              <span>›</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={cn(POPOVER_CLASS, "z-[9999] w-48 p-1 animate-in fade-in duration-200 ml-1")}>
                {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-zinc-600 italic">No projects</div>}
                {projects.map(p => (
                  <ContextMenu.Item
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors"
                    onSelect={() => onAssign(p.id)}
                  >
                    <ProjectIcon name={p.icon} size={14} className="text-zinc-500 group-hover:text-white" />
                    <span className="truncate">{p.name}</span>
                  </ContextMenu.Item>
                ))}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className="h-px bg-white/10 my-1" />

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded cursor-pointer outline-none transition-colors"
            onSelect={onDelete}
          >
            Delete Task
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function SignalRow({ signal, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const dotColor = getPriorityColor(signal.priority || 'low');

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="block">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <div className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ backgroundColor: dotColor }}></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{signal.title}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{new Date(signal.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" />
            </div>
          </Popover.Trigger>

          <AnimatePresence>
            {open && (
              <Popover.Portal>
                <Popover.Content
                  className={cn(POPOVER_CLASS, "z-[9999] w-64 p-4 animate-in zoom-in-95 duration-200")}
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-white text-sm leading-tight">{signal.title}</h4>
                      <Popover.Close className="text-zinc-500 hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </Popover.Close>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <div className="text-[10px] text-zinc-400 font-mono">
                        Scheduled for {new Date(signal.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <Popover.Arrow className="fill-[#09090b]" />
                </Popover.Content>
              </Popover.Portal>
            )}
          </AnimatePresence>
        </Popover.Root>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={cn(POPOVER_CLASS, "z-[9999] w-48 p-1 animate-in fade-in duration-200")}>
          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors"
            onSelect={onEdit}
          >
            Edit Signal
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-white/10 my-1" />
          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded cursor-pointer outline-none transition-colors"
            onSelect={onDelete}
          >
            Cancel Signal
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

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
  const { show: pushToast } = useToast();
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

  // Drag to create/edit session
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'create', 'move', 'resize'
  const [dragStart, setDragStart] = useState(null); // Date (for create) or Slot Index (for move offset)
  const [dragCurrent, setDragCurrent] = useState(null); // Date (current slot)
  const [dragSession, setDragSession] = useState(null); // Session being edited

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
      const now = new Date();
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
  const tasksOn = (date) => tasks.filter((t) => t.due && sameDay(new Date(t.due), date) && !t.deleted);

  const toggleTask = (id) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));

  const upcomingSignals = useMemo(
    () => reminders.filter((r) => !r.delivered).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [reminders]
  );

  // -- SESSIONS LOGIC --
  // Helper: Check if two time ranges overlap
  const checkOverlap = (start1, end1, start2, end2, excludeId = null) => {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();
    return s1 < e2 && s2 < e1;
  };

  // Helper: Check if a time slot overlaps with any existing session
  const hasOverlap = (start, end, excludeSessionId = null) => {
    return sessions.some(s => {
      if (excludeSessionId && s.id === excludeSessionId) return false;
      return checkOverlap(start, end, s.start, s.end);
    });
  };

  // Helper: Check if a time is in the past
  const isPastTime = (date) => {
    return new Date(date) < new Date();
  };

  // Auto-cleanup: Remove expired sessions
  useEffect(() => {
    const now = new Date();
    const activeSessions = sessions.filter(s => new Date(s.end) > now);
    if (activeSessions.length !== sessions.length) {
      setSessions(activeSessions);
    }
  }, [selectedDate]); // Run when date changes

  // Sessions now come from props (persisted in DataContext)
  const [sessionDraft, setSessionDraft] = useState({
    id: null,
    title: "",
    description: "",
    start: null,
    end: null,
    linkedTaskId: "none",
    linkedProjectId: "none"
  });
  const [gridDraft, setGridDraft] = useState(null); // { start, end } for on-grid creation
  const [showSessionPopover, setShowSessionPopover] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const openSessionForm = (date, endDate = null) => {
    // Default to 60 mins if no end provided
    let start = new Date(date);
    let end = endDate ? new Date(endDate) : new Date(start.getTime() + 60 * 60000);

    setSessionDraft({
      id: null,
      title: "",
      description: "",
      start: start,
      end: end,
      linkedTaskId: "none",
      linkedProjectId: "none"
    });
    // setRightView('session-form'); // Old side panel
    setShowSessionPopover(true);
  };

  const saveSession = () => {
    if (!sessionDraft.title.trim()) return;

    // Prevent creating sessions in the past
    if (isPastTime(sessionDraft.start)) {
      pushToast && pushToast("Cannot create sessions in the past");
      return;
    }

    // Check for overlaps (exclude current session if editing)
    if (hasOverlap(sessionDraft.start, sessionDraft.end, sessionDraft.id)) {
      pushToast && pushToast("Time slot is already occupied");
      return;
    }

    // Create new session
    const newSession = {
      id: sessionDraft.id || uid(),
      title: sessionDraft.title,
      description: sessionDraft.description,
      start: sessionDraft.start.toISOString(),
      end: sessionDraft.end.toISOString(),
      linkedTaskId: sessionDraft.linkedTaskId === 'none' ? null : sessionDraft.linkedTaskId,
      linkedProjectId: sessionDraft.linkedProjectId === 'none' ? null : sessionDraft.linkedProjectId
    };

    if (sessionDraft.id) {
      // Edit existing
      setSessions(prev => prev.map(s => s.id === sessionDraft.id ? newSession : s));
    } else {
      // Create new
      setSessions(prev => [...prev, newSession]);
    }

    // Cleanup
    setRightView('calendar'); // Just in case
    setShowSessionPopover(false);
    setGridDraft(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>

      <div
        ref={containerRef}
        className={cn(
          "w-full max-w-5xl h-[80vh] rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300",
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
              <CloseButton onClick={onClose} className="text-zinc-400 hover:text-white transition-colors" />
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
                <button onClick={() => openSignalForm()} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white">+</button>
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
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <div key={d} className="text-center text-[10px] font-bold text-zinc-600 py-1">{d}</div>)}
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

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0" ref={scrollContainerRef}>
                  {/* Session Popover */}
                  {showSessionPopover && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => { setShowSessionPopover(false); setGridDraft(null); }}>
                      <div
                        className="w-[380px] bg-[#09090b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="p-5 space-y-5">
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-lg font-semibold text-white tracking-tight">Session</span>
                              {sessionDraft.start && sessionDraft.end && (
                                <span className="text-xs font-mono text-zinc-400">
                                  {sessionDraft.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {sessionDraft.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => { setShowSessionPopover(false); setGridDraft(null); }}
                              className="text-zinc-500 hover:text-white transition-colors p-1"
                            >
                              <span className="text-xs font-bold uppercase tracking-wider">Cancel</span>
                            </button>
                          </div>

                          <div className="space-y-4">
                            {/* TITLE INPUT - Clean, no borders */}
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Session Title</label>
                              <input
                                autoFocus
                                className="w-full bg-transparent p-2 text-white placeholder:text-zinc-600 text-xl font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg transition-colors"
                                placeholder="Deep work session"
                                value={sessionDraft.title}
                                onChange={e => setSessionDraft(d => ({ ...d, title: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && saveSession()}
                              />
                            </div>

                            {/* LINK PROJECT */}
                            <div className="flex flex-col gap-2 w-full mt-2">
                              {/* Project Chip */}
                              <PillSelect
                                value={sessionDraft.linkedProjectId}
                                options={projects.map(p => ({ value: p.id, label: p.name }))}
                                onChange={val => setSessionDraft(d => ({ ...d, linkedProjectId: val }))}
                                placeholder="Link Project"
                                icon={Folder}
                              />
                            </div>

                            {/* DESCRIPTION */}
                            <div className="pt-0">
                              <textarea
                                className="w-full h-20 bg-transparent border-none p-3 text-sm text-zinc-300 placeholder:text-zinc-600 resize-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-xl transition-all custom-scrollbar"
                                placeholder="Add details about this session..."
                                value={sessionDraft.description}
                                onChange={e => setSessionDraft(d => ({ ...d, description: e.target.value }))}
                              />
                            </div>
                          </div>

                          <button
                            onClick={saveSession}
                            className="w-full bg-white text-black text-sm font-bold uppercase tracking-wider rounded-xl py-3.5 hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                          >
                            Create Session
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDate ? (() => {
                    // ... EXISTING GRID RENDER LOGIC ...
                    // This block just places the Popover ABOVE existing grid logic
                    // The actual grid rendering logic is below, re-rendered in its own block.
                    return null;
                  })() : null}

                  {/* Re-render grid loop because we are replacing the block container */}
                  {selectedDate ? (() => {
                    const slots = Array.from({ length: 48 }, (_, i) => i);
                    const SLOT_HEIGHT = 40;

                    // Helper to get slot info
                    const getSlotDate = (i) => {
                      const d = new Date(selectedDate);
                      d.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
                      return d;
                    };

                    const handleSlotDown = (i) => {
                      const d = getSlotDate(i);

                      // Prevent interaction with past time slots
                      if (isPastTime(d)) return;

                      // Prevent interaction with occupied slots
                      const slotEnd = new Date(d.getTime() + 30 * 60000);
                      if (hasOverlap(d, slotEnd)) return;

                      setGridDraft(null);
                      setIsDragging(true);
                      setDragMode('create');
                      setDragStart(d);
                      setDragCurrent(d);
                    };

                    const handleSlotEnter = (i) => {
                      if (isDragging) {
                        setDragCurrent(getSlotDate(i));
                      }
                    };

                    const handleSessionMouseDown = (e, s, mode, isDraft = false) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setIsDragging(true);
                      setDragMode(mode);
                      setDragSession(s); // if isDraft, s is the gridDraft object
                      setDragStart(new Date(s.start));
                      setDragCurrent(new Date(s.start));
                      // If it's a draft, we are modifying gridDraft state
                      // If it's a real session, we are modifying sessions state
                    };

                    const handleMouseUp = () => {
                      if (!isDragging) return;
                      setIsDragging(false);
                      const current = dragCurrent || dragStart;

                      if (dragMode === 'create' && dragStart) {
                        const start = new Date(Math.min(dragStart, current));
                        const end = new Date(Math.max(dragStart, current) + 30 * 60000);

                        // Prevent creating in past or overlapping slots
                        if (isPastTime(start) || hasOverlap(start, end)) {
                          // Reset drag state without creating
                          setDragStart(null);
                          setDragCurrent(null);
                          setDragMode(null);
                          return;
                        }

                        // Set draft AND open popover
                        setGridDraft({ start, end });

                        // Initialize session draft for form
                        setSessionDraft({
                          id: null,
                          title: "",
                          description: "",
                          start: start,
                          end: end,
                          linkedTaskId: "none",
                          linkedProjectId: "none"
                        });
                        setShowSessionPopover(true);

                      } else if (dragMode === 'move' && dragSession) {
                        const start = new Date(current);
                        const duration = new Date(dragSession.end) - new Date(dragSession.start);
                        const end = new Date(start.getTime() + duration);

                        if (dragSession.id === 'draft') {
                          setGridDraft({ start, end });
                          // Also update session draft time
                          setSessionDraft(prev => ({ ...prev, start, end }));
                        } else {
                          const updated = { ...dragSession, start: start.toISOString(), end: end.toISOString() };
                          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
                        }
                      } else if (dragMode === 'resize' && dragSession) {
                        const start = new Date(dragSession.start);
                        let newEnd = new Date(current.getTime() + 30 * 60000);
                        if (newEnd <= start) newEnd = new Date(start.getTime() + 30 * 60000);

                        if (dragSession.id === 'draft') {
                          setGridDraft({ start, end: newEnd });
                          setSessionDraft(prev => ({ ...prev, end: newEnd }));
                        } else {
                          const updated = { ...dragSession, end: newEnd.toISOString() };
                          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
                        }
                      }

                      setDragStart(null);
                      setDragCurrent(null);
                      setDragMode(null);
                      setDragSession(null);
                    };

                    // Filter sessions for this day
                    const daySessions = sessions.filter(s => {
                      const d = new Date(s.start);
                      return sameDay(d, selectedDate);
                    });

                    return (
                      <div className="relative h-full" onMouseUp={handleMouseUp} onMouseLeave={() => isDragging && handleMouseUp()}>
                        {slots.map((i) => {
                          const slotDate = getSlotDate(i);
                          const hour = Math.floor(i / 2);
                          const isHourStart = i % 2 === 0;

                          const isPm = hour >= 12;
                          const h12 = hour % 12 || 12;
                          const label = isHourStart ? `${h12.toString().padStart(2, '0')}:00 ${isPm ? 'PM' : 'AM'}` : '';

                          return (
                            <div
                              key={i}
                              id={isHourStart ? `timeline-hour-${hour}` : undefined}
                              className="flex min-h-[40px] group select-none"
                            >
                              {/* Left Column: Hour Label */}
                              <div className={cn(
                                "w-24 border-r border-white/5 text-[10px] text-zinc-600 font-mono flex items-start justify-center shrink-0 pt-2 transition-colors",
                                isHourStart ? "" : "border-b border-white/5" // Only border-b at end of hour (odd index)
                              )}>
                                {isHourStart && label}
                              </div>

                              {/* Right Column: Slot */}
                              <div
                                className={cn(
                                  "flex-1 relative transition-colors",
                                  isHourStart ? "border-b border-dashed border-white/5" : "border-b border-white/5", // Dashed at mid-hour, Solid at end-hour
                                  (() => {
                                    const slotEnd = new Date(slotDate.getTime() + 30 * 60000);
                                    const isPast = isPastTime(slotDate);
                                    const isOccupied = hasOverlap(slotDate, slotEnd);

                                    if (isPast) return "opacity-30 cursor-not-allowed bg-zinc-900/20";
                                    if (isOccupied) return "opacity-50 cursor-not-allowed";
                                    return "cursor-pointer hover:bg-white/[0.02]";
                                  })()
                                )}
                                onMouseDown={() => handleSlotDown(i)}
                                onMouseEnter={() => handleSlotEnter(i)}
                                onDoubleClick={() => {
                                  // Prevent double-click on past or occupied slots
                                  const slotEnd = new Date(slotDate.getTime() + 60 * 60000);
                                  if (isPastTime(slotDate) || hasOverlap(slotDate, slotEnd)) return;

                                  setGridDraft({ start: slotDate, end: slotEnd });
                                  setSessionDraft({
                                    id: null,
                                    title: "",
                                    description: "",
                                    start: slotDate,
                                    end: slotEnd,
                                    linkedTaskId: "none",
                                    linkedProjectId: "none"
                                  });
                                  setShowSessionPopover(true);
                                }}
                              >
                                {/* Slot content */}
                              </div>
                            </div>
                          )
                        })}

                        {/* RENDER SESSIONS */}
                        {/* 1. Existing Sessions */}
                        {daySessions.map(s => {
                          const start = new Date(s.start);
                          const end = new Date(s.end);
                          const startMins = start.getHours() * 60 + start.getMinutes();
                          const endMins = end.getHours() * 60 + end.getMinutes();
                          const durationMins = (endMins - startMins) || 60;

                          const top = (startMins / 30) * SLOT_HEIGHT;
                          const height = (durationMins / 30) * SLOT_HEIGHT;
                          const isBeingDragged = isDragging && dragSession?.id === s.id;
                          const isEditing = showSessionPopover && sessionDraft.id === s.id;
                          const isShort = durationMins <= 30;

                          if (isEditing) return null;

                          return (
                            <div
                              key={s.id}
                              className={cn(
                                "absolute left-28 right-4 rounded-xl bg-[#09090b]/90 backdrop-blur-sm border border-white/5 px-3 overflow-hidden hover:bg-white/10 hover:border-white/10 transition-all z-10 select-none group",
                                isBeingDragged ? "opacity-30 pointer-events-none" : "cursor-move",
                                isShort ? "flex items-center justify-between py-0" : "flex flex-col py-2 gap-0.5"
                              )}
                              style={{ top: `${top}px`, height: `${height - 1}px` }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSessionDraft({
                                  id: s.id,
                                  title: s.title,
                                  description: s.description,
                                  start: start,
                                  end: end,
                                  linkedTaskId: s.linkedTaskId || "none",
                                  linkedProjectId: s.linkedProjectId || "none"
                                });
                                setShowSessionPopover(true);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, session: s });
                              }}
                              onMouseDown={(e) => handleSessionMouseDown(e, s, 'move')}
                            >
                              <div className={cn("font-medium truncate text-white pointer-events-none", isShort ? "text-xs" : "text-xs")}>
                                {s.title}
                              </div>

                              {!isShort && s.description && (
                                <div className="text-[10px] text-zinc-500 line-clamp-2 leading-tight pointer-events-none whitespace-pre-wrap">
                                  {s.description}
                                </div>
                              )}

                              <div className={cn(
                                "text-[10px] text-zinc-500 font-mono tracking-tight pointer-events-none",
                                isShort ? "shrink-0 ml-2" : "mt-auto opacity-0 group-hover:opacity-100 transition-opacity"
                              )}>
                                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>

                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
                                onMouseDown={(e) => handleSessionMouseDown(e, s, 'resize')}
                              />
                            </div>
                          )
                        })}

                        {/* Ghost Draft Session (When Popover Open) */}
                        {showSessionPopover && sessionDraft.start && sessionDraft.end && (() => {
                          if (!sameDay(new Date(sessionDraft.start), selectedDate)) return null;

                          const start = new Date(sessionDraft.start);
                          const end = new Date(sessionDraft.end);
                          const startMins = start.getHours() * 60 + start.getMinutes();
                          const endMins = end.getHours() * 60 + end.getMinutes();
                          const durationMins = (endMins - startMins) || 60;

                          const top = (startMins / 30) * SLOT_HEIGHT;
                          const height = (durationMins / 30) * SLOT_HEIGHT;

                          return (
                            <div
                              className="absolute left-28 right-4 rounded-md bg-zinc-800/80 border border-white/10 px-3 py-2 text-xs text-zinc-200 overflow-hidden shadow-sm z-10 pointer-events-none"
                              style={{ top: `${top}px`, height: `${height - 1}px` }}
                            >
                              <div className="font-medium truncate italic text-white/70">{sessionDraft.title || "New Session..."}</div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Grid Draft (During Drag) */}
                        {gridDraft && (() => {
                          if (!sameDay(new Date(gridDraft.start), selectedDate)) return null;

                          const start = new Date(gridDraft.start);
                          const end = new Date(gridDraft.end);
                          const startMins = start.getHours() * 60 + start.getMinutes();
                          const endMins = end.getHours() * 60 + end.getMinutes();
                          const durationMins = (endMins - startMins) || 60;

                          const top = (startMins / 30) * SLOT_HEIGHT;
                          const height = (durationMins / 30) * SLOT_HEIGHT;

                          const draftObj = { id: 'draft', start: start.toISOString(), end: end.toISOString(), title: 'New Session' };
                          const isBeingDragged = isDragging && dragSession?.id === 'draft';

                          return (
                            <div
                              className={cn(
                                "absolute left-28 right-4 rounded-md bg-zinc-800/80 border border-white/20 px-3 py-2 text-xs text-zinc-200 overflow-hidden shadow-sm z-20 select-none",
                                isBeingDragged ? "opacity-50" : "cursor-move"
                              )}
                              style={{ top: `${top}px`, height: `${height - 1}px` }}
                              onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'move', true)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSessionDraft({
                                  id: null,
                                  title: "",
                                  description: "",
                                  start: start,
                                  end: end,
                                  linkedTaskId: "none",
                                  linkedProjectId: "none"
                                });
                                setShowSessionPopover(true);
                              }}
                            >
                              <div className="font-medium truncate italic text-white/70">New Session</div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
                                onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'resize', true)}
                              />
                            </div>
                          )
                        })()}

                        {/* DRAG PREVIEW */}
                        {isDragging && dragMode === 'create' && dragStart && dragCurrent && (() => {
                          const start = new Date(Math.min(dragStart, dragCurrent));
                          const end = new Date(Math.max(dragStart, dragCurrent) + 30 * 60000);
                          const startMins = start.getHours() * 60 + start.getMinutes();
                          const endMins = end.getHours() * 60 + end.getMinutes();
                          const durationMins = endMins - startMins;
                          const top = (startMins / 30) * SLOT_HEIGHT;
                          const height = (durationMins / 30) * SLOT_HEIGHT;

                          return (
                            <div
                              className="absolute left-24 right-4 rounded-md bg-white/10 border border-white/20 z-20 pointer-events-none"
                              style={{ top: `${top}px`, height: `${height - 1}px` }}
                            />
                          )
                        })()}

                      </div>
                    );
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

          {/* NEW SESSION FORM */}
          {rightView === 'session-form' && (
            <div className="h-full flex flex-col p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold text-white">
                    New Session
                  </h2>
                  {sessionDraft.start && sessionDraft.end && (
                    <div className="text-sm font-mono text-zinc-400">
                      {sessionDraft.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {sessionDraft.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <button onClick={closeForm} className="text-zinc-400 hover:text-white text-sm focus:outline-none focus-visible:underline">Cancel</button>
              </div>

              <div className="flex-1 space-y-6">
                {/* Time display removed from here */}

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Title</label>
                  <input
                    autoFocus
                    className={cn(INPUT_CLASS, "w-full p-4")}
                    placeholder="Session name..."
                    value={sessionDraft.title}
                    onChange={e => setSessionDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveSession()}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <CustomSelect
                      label="Link Task"
                      value={sessionDraft.linkedTaskId}
                      options={[
                        { value: 'none', label: 'None' },
                        ...tasks.filter(t => !t.done && t.title).map(t => ({ value: t.id, label: t.title }))
                      ]}
                      onChange={val => setSessionDraft(d => ({ ...d, linkedTaskId: val }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <CustomSelect
                      label="Link Project"
                      value={sessionDraft.linkedProjectId}
                      options={[
                        { value: 'none', label: 'None' },
                        ...projects.map(p => ({ value: p.id, label: p.name }))
                      ]}
                      onChange={val => setSessionDraft(d => ({ ...d, linkedProjectId: val }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1">Description</label>
                  <textarea
                    className={cn(INPUT_CLASS, "w-full p-4 h-40 resize-none custom-scrollbar")}
                    placeholder="Session plans..."
                    value={sessionDraft.description}
                    onChange={e => setSessionDraft(d => ({ ...d, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={saveSession} className="bg-white text-black font-semibold rounded-xl px-8 py-3 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Create Session
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


          <AnimatePresence>
            {contextMenu && (
              <Portal>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
                <div
                  className="fixed bg-[#18181b] border border-white/10 rounded-xl shadow-2xl py-1.5 w-48 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1 bg-white/[0.02]">
                    Session Options
                  </div>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                    onClick={() => {
                      const s = contextMenu.session;
                      const start = new Date(s.start);
                      const end = new Date(s.end);
                      setSessionDraft({
                        id: s.id,
                        title: s.title,
                        description: s.description || "",
                        start: start,
                        end: end,
                        linkedTaskId: s.linkedTaskId || "none",
                        linkedProjectId: s.linkedProjectId || "none"
                      });
                      setShowSessionPopover(true);
                      setContextMenu(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    Edit Session
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setSessions(prev => prev.filter(s => s.id !== contextMenu.session.id));
                      setContextMenu(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete Session
                  </button>
                </div>
              </Portal>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div >
  );
}


