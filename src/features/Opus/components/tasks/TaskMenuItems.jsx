import React from "react";
import { Ban, CalendarDays, Clock, Layers, Target, Trash2, X } from "lucide-react";

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true };
const SCHEDULE_MOVES = [
  { value: "today", label: "Move to today", Icon: CalendarDays },
  { value: "soon", label: "Move to soon", Icon: Clock },
  { value: "future", label: "Move to future", Icon: Layers },
];

/**
 * Right-click and the row's actions button offer the same items; `parts`
 * carries the matching Menu.* (or Menu.Context*) components.
 */
export default function TaskMenuItems({ parts, task, actions }) {
  const { Item, Separator, DangerItem } = parts;
  const isDone = task.status === "done";
  const schedule = task.schedule || "today";
  const isBlocked = task.status === "blocked";

  return (
    <>
      {!isDone && !task.isNextAction && (
        <Item onClick={() => actions.onSetNext(task.id, task.projectId)}><Target {...ICON} />Set as next move</Item>
      )}
      {task.isNextAction && (
        <Item onClick={() => actions.onUpdate(task.id, { isNextAction: false })}><X {...ICON} />Remove next move</Item>
      )}
      {!isDone && (
        <>
          <Separator />
          {SCHEDULE_MOVES.filter((m) => m.value !== schedule).map((move) => (
            <Item key={move.value} onClick={() => actions.onUpdate(task.id, { schedule: move.value })}>
              {React.createElement(move.Icon, ICON)}{move.label}
            </Item>
          ))}
          <Separator />
          {isBlocked ? (
            <Item onClick={() => actions.onUpdate(task.id, { status: "todo" })}>Unblock</Item>
          ) : (
            <Item onClick={() => actions.onUpdate(task.id, { status: "blocked" })}><Ban {...ICON} />Mark blocked</Item>
          )}
        </>
      )}
      <Separator />
      <DangerItem onClick={() => actions.onDelete(task)}><Trash2 {...ICON} />Delete task</DangerItem>
    </>
  );
}
