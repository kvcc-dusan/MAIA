import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { toLocalInputValue } from "../../lib/time";
import { getPriorityColor } from "../../lib/constants";

export const INPUT_CLASS = "bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none ring-0 focus:outline-none focus:ring-0 focus:border-white/10 focus-visible:ring-2 focus-visible:ring-white/20 transition-all placeholder:text-zinc-600";
export const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";

export function Portal({ children }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

export function CloseButton({ onClick, className, ...props }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
      {...props}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  )
}

export function PriorityCheckbox({ checked, onChange, priority, ...props }) {
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
      {...props}
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

export function CustomSelect({ label, value, options, onChange, placeholder = "Select..." }) {
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

export function PillSelect({ value, options, onChange, placeholder, icon: Icon }) {
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

export function DateTimePicker({ label, value, onChange, dateOnly = false }) {
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

  return (
    <div className="relative space-y-2 h-full flex flex-col min-w-0" ref={ref}>
      {label && <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-1 block">{label}</label>}
      <button
        onClick={() => setOpen(!open)}
        className={cn(INPUT_CLASS, "w-full p-3 flex justify-between items-center text-left h-full min-h-[46px]")}
        aria-label="Select Date and Time"
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
