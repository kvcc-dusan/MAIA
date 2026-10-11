import React from "react";
import { Check, ChevronDown } from "@/components/icons";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { Menu } from "@/components/composed/Menu";
import { DueLabel, ListRow, OwnerAvatar, StatusBadge, statusLabel } from "../../kit";
import { PRIORITY_LABEL, STATUS_OPTIONS } from "./taskDisplay";
import styles from "./TaskRow.module.css";

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true };

// Open tasks only: a finished High task no longer needs attention.
const priorityText = (task) =>
  task.status !== "done" && (task.priority === "p1" || task.priority === "p2") ? PRIORITY_LABEL[task.priority] : "";

/** Priority, then the group names the card title does not already show, then the notes. */
const subtitleOf = (task, workstream, milestone) => {
  const bits = [priorityText(task), workstream?.name, milestone?.title, task.desc].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
};

/**
 * One task row: checkbox, title and subtitle, status badge (a menu), owner,
 * due date. `ctx` carries what rows share. `workstream` and `milestone` are
 * only passed when the current grouping does not already show them.
 */
export default function TaskRow({ task, ctx, workstream, milestone }) {
  const { today, showOwners, onToggle, onUpdate, onOpen } = ctx;
  const isDone = task.status === "done";

  return (
    <ListRow
      leading={
        <Checkbox
          checked={isDone}
          onCheckedChange={() => onToggle(task.id)}
          aria-label={`${isDone ? "Mark as not done" : "Mark as done"}: ${task.title}`}
        />
      }
      title={<span className={isDone ? styles.done : undefined}>{task.title}</span>}
      subtitle={subtitleOf(task, workstream, milestone)}
      onClick={() => onOpen(task.id)}
      aria-label={`Edit task: ${task.title}`}
      trailing={
        <>
          <Menu.Root>
            <Menu.Trigger className={styles.status} aria-label={`${statusLabel(task.status)}. Change status of ${task.title}`}>
              <StatusBadge status={task.status} />
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Content align="end">
              {STATUS_OPTIONS.map((option) => (
                <Menu.Item key={option.value} onClick={() => onUpdate(task.id, { status: option.value })}>
                  <Check {...ICON} className={option.value === task.status ? undefined : styles.hidden} />
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Root>
          {showOwners ? <span className={styles.owner}><OwnerAvatar name={task.owner} showName /></span> : null}
          <span className={styles.due}><DueLabel due={task.due} today={today} done={isDone} /></span>
        </>
      }
    />
  );
}
