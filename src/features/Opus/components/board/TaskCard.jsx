import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useReducedMotion } from "motion/react";
import { ArrowRightLeft, Check, CircleAlert } from "lucide-react";
import { Badge } from "@/components/arc/badge/badge";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { STATUS_LABELS, STATUS_ORDER, cardLabel, dueInfo, formatEstimate, workstreamColor } from "./model";
import styles from "./TaskCard.module.css";

/** Presentational card content, shared by the list item and the drag overlay. */
export function CardBody({ task, workstream, due }) {
  const estimate = formatEstimate(task.estimate);
  return (
    <span className={styles.body}>
      <span className={styles.title}>{task.title || "Untitled task"}</span>
      {workstream && (
        <span className={styles.ws}>
          <span className={styles.dot} style={{ "--ws-color": workstreamColor(workstream) }} aria-hidden="true" />
          <span className={styles.wsName}>{workstream.name}</span>
        </span>
      )}
      {(due || estimate || task.isNextAction) && (
        <span className={styles.meta}>
          {due && (
            <span className={styles.due} data-overdue={due.isOverdue ? "" : undefined}>
              {due.isOverdue && <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />}
              {due.isOverdue ? `Overdue ${due.label}` : due.label}
            </span>
          )}
          {estimate && <span className={styles.estimate}>{estimate}</span>}
          {task.isNextAction && <Badge tone="info" size="sm">Next action</Badge>}
        </span>
      )}
    </span>
  );
}

export const OverlayCard = ({ task, workstream, today }) => (
  <div className={`${styles.card} ${styles.overlay}`}>
    <span className={styles.main}><CardBody task={task} workstream={workstream} due={dueInfo(task, today)} /></span>
  </div>
);

// Space is the pick-up key. Without this a button also fires click on Space
// keyup, which would open the editor at the end of every keyboard drag.
const swallowSpaceClick = (e) => { if (e.key === " ") e.preventDefault(); };

function TaskCard({ task, status, workstream, today, onOpen, onMoveTo }) {
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    attributes: { roleDescription: "draggable task" },
    transition: reduced ? null : undefined,
  });
  const due = dueInfo({ ...task, status }, today);
  const label = cardLabel({ task, statusLabel: STATUS_LABELS[status], due, workstreamName: workstream?.name });

  return (
    <li
      ref={setNodeRef}
      className={styles.item}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-ghost={isDragging ? "" : undefined}
    >
      <div className={styles.card}>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className={styles.main}
          data-task-card={task.id}
          {...attributes}
          {...listeners}
          role={undefined}
          aria-label={label}
          onClick={() => onOpen(task.id)}
          onKeyUp={swallowSpaceClick}
        >
          <CardBody task={task} workstream={workstream} due={due} />
        </button>
        <Menu.Root>
          <Menu.Trigger
            render={<IconButton icon={ArrowRightLeft} label={`Move task: ${task.title || "Untitled task"}`} className={styles.move} />}
          />
          <Menu.Content align="end">
            <Menu.Group>
              <Menu.Label>Move to</Menu.Label>
              {STATUS_ORDER.map((s) => (
                <Menu.Item key={s} disabled={s === status} onClick={() => onMoveTo(task, s)}>
                  {STATUS_LABELS[s]}
                  {s === status && <Check size={16} strokeWidth={1.75} aria-hidden="true" style={{ marginInlineStart: "auto" }} />}
                </Menu.Item>
              ))}
            </Menu.Group>
          </Menu.Content>
        </Menu.Root>
      </div>
    </li>
  );
}

export default memo(TaskCard);
