import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { cn, getPriorityColor } from "@/lib/utils";
import { TASK_PRIORITIES } from "@/lib/constants";
import ProjectIcon from "./ProjectIcon";
import { CloseButton } from "./ui/CloseButton";
import { PriorityCheckbox } from "./ui/PriorityCheckbox";

export default React.memo(TaskRow);

/**
 * Right-click menu and detail popover both move onto the app's one set of
 * primitives (Base UI via composed/Menu and ui/popover) — this was the last
 * file still importing Radix's context-menu/popover directly.
 */
function TaskRow({ task, onToggle, onDelete, onEdit, onAssign, projects = [] }) {
  const [open, setOpen] = useState(false);

  const priorityLabel = TASK_PRIORITIES.find(p => p.value === (task.priority || 'p3'))?.label || 'Normal';
  const priorityColor = getPriorityColor(task.priority || 'p3');

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            nativeButton={false}
            render={
              <div
                className="group flex items-center gap-3 p-3 rounded-xl bg-overlay-subtle border border-border-subtle hover:border-border transition-all hover:bg-overlay cursor-pointer"
                onClick={(e) => {
                  if (e.target.closest('button')) {
                    e.preventDefault();
                    return;
                  }
                }}
              />
            }
          >
            <PriorityCheckbox checked={task.done} priority={task.priority || 'p3'} onChange={onToggle} aria-label={task.done ? "Mark as not done" : "Mark as done"} />
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm font-medium transition-colors truncate", task.done ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</div>
              {task.due && <div className="text-xs text-muted-foreground mt-0.5">{new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            </div>
            <CloseButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" aria-label="Delete Task" />
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm leading-tight">{task.title}</h4>

              {task.desc && <p className="text-xs text-muted-foreground leading-relaxed">{task.desc}</p>}

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-overlay-subtle border border-border">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
                  <span className="text-xs text-foreground-secondary">{priorityLabel} Priority</span>
                </div>
                {task.due && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.due).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <Menu.ContextItem onClick={onEdit}>Edit Task</Menu.ContextItem>

        <Menu.ContextSub>
          <Menu.ContextSubTrigger>Assign to Project</Menu.ContextSubTrigger>
          <Menu.ContextSubContent>
            {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-subtle-foreground italic">No projects</div>}
            {projects.map(p => (
              <Menu.ContextItem key={p.id} onClick={() => onAssign(p.id)}>
                <ProjectIcon name={p.icon} size={14} className="text-muted-foreground" />
                <span className="truncate">{p.name}</span>
              </Menu.ContextItem>
            ))}
          </Menu.ContextSubContent>
        </Menu.ContextSub>

        <Menu.ContextSeparator />

        <ContextDangerItem onClick={onDelete}>Delete Task</ContextDangerItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
}
