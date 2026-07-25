import React from "react";
import { cn } from "@/lib/utils";
import { CancelSquare } from "./CustomIcon.jsx";

export function CloseButton({ onClick, className, ...props }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      className={cn("w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-overlay hover:text-foreground-secondary transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-overlay-strong", className)}
      {...props}
    >
      <CancelSquare size={14} />
    </button>
  )
}
