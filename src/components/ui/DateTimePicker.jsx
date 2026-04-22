import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";
import { motion, AnimatePresence } from "framer-motion";
import { INPUT_CLASS, POPOVER_CLASS } from "@/lib/constants";
import { toLocalInputValue } from "@/lib/time";
import { Calendar03 } from "./CustomIcon.jsx";

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
      const popoverWidth = Math.max(rect.width, 280);
      const popoverHeight = 340; // approximate max height
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.bottom + 8;
      let left = rect.left;

      // Flip above if overflowing bottom
      if (top + popoverHeight > vh - 8) {
        top = rect.top - popoverHeight - 8;
      }
      // Clamp horizontal
      if (left + popoverWidth > vw - 8) {
        left = vw - popoverWidth - 8;
      }
      if (left < 8) left = 8;

      setCoords({ top, left, width: popoverWidth });
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
    <div className="relative space-y-2" ref={ref}>
      {label && <label className="text-fluid-3xs font-mono text-zinc-500 uppercase tracking-[0.15em] font-bold ml-1 block">{label}</label>}
      <button
        onClick={() => setOpen(!open)}
        className={cn(INPUT_CLASS, "w-full p-3 flex justify-between items-center text-left min-h-[46px]")}
        aria-label="Select Date and Time"
      >
        <div className="flex items-center gap-3 truncate">
          <Calendar03 size={14} className="text-zinc-500 shrink-0" />
          <span className="truncate flex-1 font-mono">{formatDisplay(value)}</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.1 }}
              className={cn(POPOVER_CLASS, "fixed z-[9999] p-4 custom-portal-content")}
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              {/* Tabs */}
              {!dateOnly && (
                <div className="flex bg-white/5 p-[3px] rounded-xl mb-4 gap-[3px]">
                  <button onClick={() => setTab('date')} className={cn("flex-1 py-1.5 text-xs rounded-[17px] font-medium font-mono transition-all", tab === 'date' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-white")}>Date</button>
                  <button onClick={() => setTab('time')} className={cn("flex-1 py-1.5 text-xs rounded-[17px] font-medium font-mono transition-all", tab === 'time' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-white")}>Time</button>
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
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-fluid-3xs uppercase font-bold text-zinc-600 py-1">{d}</div>)}
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
                      <div className="text-fluid-3xs text-zinc-600 uppercase font-bold text-center mb-1 sticky top-0 bg-[#09090b] py-1 z-10">Hour</div>
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
                      <div className="text-fluid-3xs text-zinc-600 uppercase font-bold text-center mb-1 sticky top-0 bg-[#09090b] py-1 z-10">Min</div>
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
                    <div className="grid grid-cols-2 gap-[3px] bg-white/5 p-[3px] rounded-xl border border-white/10 w-fit">
                      <button
                        onClick={() => setTimePart('ampm', 'AM')}
                        className={cn("px-5 py-1.5 rounded-full text-xs font-mono font-bold transition-all", !isPm ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-white")}
                      >
                        AM
                      </button>
                      <button
                        onClick={() => setTimePart('ampm', 'PM')}
                        className={cn("px-5 py-1.5 rounded-full text-xs font-mono font-bold transition-all", isPm ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-white")}
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
