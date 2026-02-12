import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { AnimatePresence } from "framer-motion";
import { cn, getPriorityColor } from "@/lib/utils";
import { POPOVER_CLASS, TASK_PRIORITIES } from "@/lib/constants";
import ProjectIcon from "./ProjectIcon";
import { CloseButton } from "./ui/CloseButton";
import { PriorityCheckbox } from "./ui/PriorityCheckbox";

export default function TaskRow({ task, onToggle, onDelete, onEdit, onAssign, projects = [] }) {
  const [open, setOpen] = useState(false);

  // Derived
  const priorityLabel = TASK_PRIORITIES.find(p => p.value === (task.priority || 'p3'))?.label || 'Normal';
  const priorityColor = getPriorityColor(task.priority || 'p3');

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="block">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <div
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:bg-white/10 cursor-pointer"
              onClick={(e) => {
                // Prevent popover if clicking checkbox or delete
                if (e.target.closest('button')) {
                  e.preventDefault();
                  return;
                }
              }}
            >
              <PriorityCheckbox checked={task.done} priority={task.priority || 'p3'} onChange={onToggle} aria-label={task.done ? "Mark as not done" : "Mark as done"} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium transition-colors truncate", task.done ? "text-zinc-500 line-through" : "text-zinc-200")}>{task.title}</div>
                {task.due && <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
              <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" aria-label="Delete Task" />
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
                      <h4 className="font-semibold text-white text-sm leading-tight">{task.title}</h4>
                      <Popover.Close className="text-zinc-500 hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </Popover.Close>
                    </div>
                    {task.desc && <p className="text-xs text-zinc-400 leading-relaxed">{task.desc}</p>}

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
                        <span className="text-[10px] font-medium text-zinc-300">{priorityLabel}</span>
                      </div>
                      {task.due && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(task.due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
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
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors"
            onSelect={onEdit}
          >
            <span>Edit Task</span>
          </ContextMenu.Item>

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors">
              Assign to Project
              <span>›</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={cn(POPOVER_CLASS, "z-[9999] w-48 p-1 animate-in fade-in duration-200 ml-1")}>
                {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-zinc-600 italic">No projects</div>}
                {projects.map(p => (
                  <ContextMenu.Item
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded cursor-pointer outline-none transition-colors"
                    onSelect={() => onAssign(p.id)}
                  >
                    <ProjectIcon name={p.icon} size={14} className="text-zinc-500 group-hover:text-white" />
                    <span className="truncate">{p.name}</span>
                  </ContextMenu.Item>
                ))}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className="h-px bg-white/10 my-1" />

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded cursor-pointer outline-none transition-colors"
            onSelect={onDelete}
          >
            Delete Task
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
