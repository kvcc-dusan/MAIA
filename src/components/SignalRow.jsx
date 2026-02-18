import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { AnimatePresence } from "framer-motion";
import { cn, getPriorityColor } from "@/lib/utils";
import { POPOVER_CLASS } from "@/lib/constants";
import { CloseButton } from "./ui/CloseButton";

export default React.memo(SignalRow);

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
              <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" aria-label="Delete Signal" />
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
