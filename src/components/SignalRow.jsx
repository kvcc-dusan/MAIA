import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { AnimatePresence } from "framer-motion";
import { cn, getPriorityColor } from "@/lib/utils";
import { POPOVER_CLASS, SIGNAL_PRIORITIES } from "@/lib/constants";
import { CloseButton } from "./ui/CloseButton";
import { CancelSquare } from "./ui/CustomIcon.jsx";

export default React.memo(SignalRow);

function SignalRow({ signal, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const dotColor = getPriorityColor(signal.priority || 'low');
  const priorityLabel = SIGNAL_PRIORITIES.find(p => p.value === (signal.priority || 'low'))?.label || 'Normal Priority';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="block">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <div className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }}></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate font-mono">{signal.title}</div>
                <div className="text-fluid-3xs text-zinc-500 font-mono mt-0.5">{new Date(signal.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-white text-sm leading-tight font-mono">{signal.title}</h4>
                      <Popover.Close className="text-zinc-500 hover:text-white transition-colors shrink-0">
                        <CancelSquare size={14} className="shrink-0" />
                      </Popover.Close>
                    </div>

                    {signal.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed font-mono">{signal.description}</p>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-fluid-3xs font-mono text-zinc-300">{priorityLabel}</span>
                      </div>
                      <span className="text-fluid-3xs text-zinc-500 font-mono">
                        {new Date(signal.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
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
        <ContextMenu.Content className={cn(POPOVER_CLASS, "z-[9999] w-48 p-1 animate-in fade-in duration-200 overflow-hidden")}>
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-white/10 hover:text-white rounded-xl cursor-pointer outline-none transition-colors"
            onSelect={onEdit}
          >
            Edit Signal
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-white/10 my-1" />
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl cursor-pointer outline-none transition-colors"
            onSelect={onDelete}
          >
            Cancel Signal
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
