import React, { useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/arc/popover/popover";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { cn, getPriorityColor } from "@/lib/utils";
import { TASK_PRIORITIES } from "@/lib/constants";
import { formatTime, formatMonthDay } from "@/lib/time";
import ProjectIcon from "@/components/ProjectIcon";
import { PriorityCheckbox } from "@/components/ui/PriorityCheckbox";
import styles from "./Row.module.css";

export default React.memo(TaskRow);

/**
 * Right-click menu (Base UI via composed/Menu) and a detail popover (Arc).
 * The row's main area is a real button, so the detail view is reachable by
 * keyboard; the checkbox and remove button are siblings, not nested inside it.
 */
function TaskRow({ task, onToggle, onDelete, onEdit, onAssign, projects = [] }) {
  const [open, setOpen] = useState(false);

  const priority = task.priority || "p3";
  const priorityLabel = TASK_PRIORITIES.find((p) => p.value === priority)?.label || "Normal priority";
  const priorityColor = getPriorityColor(priority);

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <div className={styles.row}>
          {/* The wrapper widens the hit area; the checkbox stops propagation itself. */}
          <span className={styles.check} onClick={onToggle}>
            <PriorityCheckbox
              checked={task.done}
              priority={priority}
              onChange={onToggle}
              aria-label={task.done ? "Mark as not done" : "Mark as done"}
            />
          </span>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={styles.main}>
                <span className={cn(styles.title, task.done && styles.done)}>{task.title}</span>
                {task.due && <span className={styles.meta}>{formatTime(task.due)}</span>}
                <span className={styles.srOnly}>{priorityLabel}{task.done ? ", done" : ""}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className={styles.detail}>
              <div className={styles.detailBody}>
                <h4 className={styles.detailTitle}>{task.title}</h4>
                {task.desc && <p className={styles.detailText}>{task.desc}</p>}
                <div className={styles.detailFoot}>
                  <span className={styles.priority}>
                    <span className={styles.priorityDot} style={{ backgroundColor: priorityColor }} aria-hidden="true" />
                    {priorityLabel}
                  </span>
                  {task.due && <span>{formatMonthDay(task.due)}</span>}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <IconButton icon={X} label="Delete task" className={styles.remove} onClick={onDelete} />
        </div>
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <Menu.ContextItem onClick={onEdit}>Edit task</Menu.ContextItem>

        <Menu.ContextSub>
          <Menu.ContextSubTrigger>Assign to project</Menu.ContextSubTrigger>
          <Menu.ContextSubContent>
            {projects.length === 0 && <div className={styles.noProjects}>No projects yet</div>}
            {projects.map((p) => (
              <Menu.ContextItem key={p.id} onClick={() => onAssign(p.id)}>
                <ProjectIcon name={p.icon} size={14} />
                <span className="truncate">{p.name}</span>
              </Menu.ContextItem>
            ))}
          </Menu.ContextSubContent>
        </Menu.ContextSub>

        <Menu.ContextSeparator />

        <ContextDangerItem onClick={onDelete}>Delete task</ContextDangerItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
}
