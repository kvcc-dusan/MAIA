import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";
import { motion, AnimatePresence } from "framer-motion";
import { INPUT_CLASS, POPOVER_CLASS } from "@/lib/constants";

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
