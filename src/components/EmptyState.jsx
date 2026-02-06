import React from "react";
import ProjectIcon from "./ProjectIcon";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon = "layers", message = "No items found.", action, actionLabel, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in-95 duration-500", className)}>
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
        <ProjectIcon name={icon} size={28} className="text-zinc-500 opacity-80" />
      </div>
      <p className="text-sm text-zinc-500 font-medium mb-4 max-w-[200px] leading-relaxed">
        {message}
      </p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/5 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
