import React from "react";
import { cn, getPriorityColor } from "@/lib/utils";

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
