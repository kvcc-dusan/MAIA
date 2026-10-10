import React, { useId } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import TaskCard from "./TaskCard";
import { STATUS_LABELS, WIP_LIMIT } from "./model";
import styles from "./BoardColumn.module.css";

export default function BoardColumn({
  status, ids, tasksById, workstreamsById, today, total, hidden, showAllDone, showOwner, isTarget,
  onOpen, onMoveTo, onAdd, onToggleShowAll,
}) {
  const headingId = useId();
  const { setNodeRef } = useDroppable({ id: status });
  const label = STATUS_LABELS[status];
  const canToggle = status === "done" && (hidden > 0 || showAllDone);

  return (
    <section className={styles.column} aria-labelledby={headingId} data-status={status} data-target={isTarget ? "" : undefined}>
      <header className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        <h2 id={headingId} className={styles.title}>{label}</h2>
        <span className={styles.count}>{total}</span>
      </header>
      {status === "doing" && total > WIP_LIMIT && (
        <p className={styles.wip}><span className={styles.wipDot} aria-hidden="true" />More than {WIP_LIMIT} in progress</p>
      )}

      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={styles.drop}>
          {ids.length > 0 ? (
            <ul className={styles.list} aria-labelledby={headingId}>
              {ids.map((id) => {
                const task = tasksById.get(id);
                return task ? (
                  <TaskCard
                    key={id}
                    task={task}
                    status={status}
                    workstream={workstreamsById.get(task.workstreamId)}
                    today={today}
                    showOwner={showOwner}
                    onOpen={onOpen}
                    onMoveTo={onMoveTo}
                  />
                ) : null;
              })}
            </ul>
          ) : (
            <p className={styles.hint}>No tasks</p>
          )}
        </div>
      </SortableContext>

      <footer className={styles.footer}>
        {canToggle && (
          <Button variant="ghost" size="sm" onClick={onToggleShowAll}>
            {showAllDone ? "Show recent only" : `Show all ${total}`}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onAdd(status)} aria-label={`Add task to ${label}`}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Add task
        </Button>
      </footer>
    </section>
  );
}
