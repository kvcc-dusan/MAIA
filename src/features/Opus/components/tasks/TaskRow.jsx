import React, { useState } from "react";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/arc/popover/popover";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { StatusDot } from "@/components/composed/StatusDot";
import { cn } from "@/lib/utils";
import TaskMenuItems from "./TaskMenuItems";
import TaskEditor from "./TaskEditor";
import { PRIORITY_LABEL, STATUS_OPTIONS, STATUS_TONE, dueInfo, statusLabel, workstreamColor } from "./taskDisplay";
import styles from "./TaskRow.module.css";

const DROPDOWN_PARTS = { Item: Menu.Item, Separator: Menu.Separator, DangerItem: MenuDangerItem };
const CONTEXT_PARTS = { Item: Menu.ContextItem, Separator: Menu.ContextSeparator, DangerItem: ContextDangerItem };

/**
 * One task. Click the title for the edit popover, right-click or use the
 * actions button for the menu. `ctx` carries what rows share: today, the
 * project's workstreams and milestones, the actions, and which of workstream
 * or milestone the current grouping already shows.
 */
export default function TaskRow({ task, ctx, showNextMarker = true }) {
  const [isEditing, setIsEditing] = useState(false);
  const { today, workstreams, milestones, actions, hide } = ctx;
  const isDone = task.status === "done";
  const workstream = hide.workstream ? null : workstreams.find((w) => w.id === task.workstreamId);
  const milestone = hide.milestone ? null : milestones.find((m) => m.id === task.milestoneId);
  const due = dueInfo(task, today);
  const priorityLabel = !isDone && (task.priority === "p1" || task.priority === "p2") ? PRIORITY_LABEL[task.priority] : null;
  const label = statusLabel(task.status);

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <div className={cn(styles.row, isDone && styles.done)} data-status={task.status}>
          <Checkbox
            checked={isDone}
            onCheckedChange={() => actions.onToggle(task.id)}
            aria-label={`${isDone ? "Mark as not done" : "Mark as done"}: ${task.title}`}
          />
          <Popover open={isEditing} onOpenChange={setIsEditing}>
            <PopoverTrigger asChild>
              <button type="button" className={styles.main}>
                <span className={styles.title}>{task.title}</span>
                <span className={styles.meta}>
                  {showNextMarker && task.isNextAction && !isDone && <span className={styles.next}>Next move</span>}
                  {workstream && (
                    <span className={styles.metaItem}>
                      <span className={styles.dot} style={{ backgroundColor: workstreamColor(workstream) }} aria-hidden="true" />
                      {workstream.name}
                    </span>
                  )}
                  {milestone && <span className={styles.metaItem}>{milestone.title}</span>}
                  {task.estimate && <span className={styles.metaItem}>Est. {task.estimate}</span>}
                  {priorityLabel && (
                    <span className={styles.metaItem}>
                      <StatusDot tone={task.priority} size="sm" />
                      {priorityLabel}
                    </span>
                  )}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className={styles.editorPanel}>
              <TaskEditor
                task={task}
                workstreams={workstreams}
                milestones={milestones}
                onUpdate={actions.onUpdate}
                onDone={() => setIsEditing(false)}
              />
            </PopoverContent>
          </Popover>

          <div className={styles.aside}>
            <Menu.Root>
              <Menu.Trigger
                className={styles.status}
                aria-label={`${label}. Change status of ${task.title}`}
              >
                <StatusDot tone={STATUS_TONE[task.status] ?? "muted"} size="sm" />
                {label}
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Content align="start">
                {STATUS_OPTIONS.map((o) => (
                  <Menu.Item key={o.value} onClick={() => actions.onUpdate(task.id, { status: o.value })}>
                    <Check size={16} strokeWidth={1.75} aria-hidden="true" className={o.value === task.status ? undefined : styles.hidden} />
                    {o.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Root>
            {due && (
              <span className={cn(styles.due, due.isOverdue && styles.overdue)}>
                {due.isOverdue ? "Overdue, " : <span className={styles.srOnly}>Due </span>}
                {due.label}
              </span>
            )}
          </div>

          <Menu.Root>
            <Menu.Trigger
              render={
                <IconButton
                  icon={MoreHorizontal}
                  label={`More actions for ${task.title}`}
                  tooltip={false}
                  className={styles.actions}
                />
              }
            />
            <Menu.Content align="end">
              <TaskMenuItems parts={DROPDOWN_PARTS} task={task} actions={actions} />
            </Menu.Content>
          </Menu.Root>
        </div>
      </Menu.ContextTrigger>
      <Menu.ContextContent>
        <TaskMenuItems parts={CONTEXT_PARTS} task={task} actions={actions} />
      </Menu.ContextContent>
    </Menu.Context>
  );
}
