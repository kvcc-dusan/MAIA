import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";
import { motion, AnimatePresence } from "framer-motion";
import { POPOVER_CLASS } from "@/lib/constants";
import { Plus, X } from "lucide-react";

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
      const dropdownHeight = 224; // max-h-56 = 14rem = 224px
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.bottom + 8;
      let left = rect.left;

      // Flip above if overflowing bottom
      if (top + dropdownHeight > vh - 8) {
        top = rect.top - dropdownHeight - 8;
      }
      // Clamp horizontal
      if (left + rect.width > vw - 8) {
        left = vw - rect.width - 8;
      }
      if (left < 8) left = 8;

      setCoords({ top, left, width: rect.width });
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
