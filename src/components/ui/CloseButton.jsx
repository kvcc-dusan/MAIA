import React from "react";
import { cn } from "@/lib/utils";

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
