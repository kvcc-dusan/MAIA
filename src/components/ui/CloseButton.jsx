import React from "react";
import { cn } from "@/lib/utils";
import { CancelSquare } from "./CustomIcon.jsx";

export function CloseButton({ onClick, className, ...props }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
      {...props}
    >
      <CancelSquare size={14} />
    </button>
  )
}
