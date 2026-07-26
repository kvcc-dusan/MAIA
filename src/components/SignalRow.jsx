import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { getPriorityColor } from "@/lib/utils";
import { SIGNAL_PRIORITIES } from "@/lib/constants";
import { CloseButton } from "./ui/CloseButton";

export default React.memo(SignalRow);

// SIGNAL_PRIORITIES only ever contained p1/p2/p3 — the 'low' fallback here
// (and the matching default in ChronosModal's signalDraft) never matched an
// entry, so a freshly-created signal's priority silently failed to resolve.
function SignalRow({ signal, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const dotColor = getPriorityColor(signal.priority || 'p3');
  const priorityLabel = SIGNAL_PRIORITIES.find(p => p.value === (signal.priority || 'p3'))?.label || 'Normal Priority';

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            nativeButton={false}
            render={
              <div className="group flex items-center gap-3 p-3 rounded-xl bg-overlay-subtle border border-border-subtle hover:bg-overlay hover:border-border transition-all cursor-pointer" />
            }
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }}></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate">{signal.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{new Date(signal.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" aria-label="Delete Signal" />
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm leading-tight">{signal.title}</h4>

              {signal.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
              )}

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-overlay-subtle border border-border">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                  <span className="text-xs text-foreground-secondary">{priorityLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(signal.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <Menu.ContextItem onClick={onEdit}>Edit Signal</Menu.ContextItem>
        <Menu.ContextSeparator />
        <ContextDangerItem onClick={onDelete}>Cancel Signal</ContextDangerItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
}
