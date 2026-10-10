import React, { useId } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Progress } from "@/components/arc/progress/progress";
import { CountPill } from "@/components/composed/SectionBits";
import { formatDay } from "./taskDisplay";
import styles from "./TaskGroup.module.css";

/** A collapsible band of rows. With `showHeader` false (no grouping) it is just the list. */
export default function TaskGroup({ group, isOpen, onToggle, today, showHeader = true, children }) {
  const id = useId();
  const bodyId = `${id}-rows`;
  const hasProgress = group.total != null && group.total > 0;
  const due = group.date ? formatDay(group.date, today) : "";
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <section className={styles.group} aria-labelledby={showHeader ? id : undefined} aria-label={showHeader ? undefined : "Tasks"}>
      {showHeader && (
        <div className={styles.head}>
          <h3 id={id} className={styles.heading}>
            <button type="button" className={styles.toggle} aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
              <Chevron size={16} strokeWidth={1.75} aria-hidden="true" />
              {group.color && <span className={styles.dot} style={{ backgroundColor: group.color }} aria-hidden="true" />}
              <span className={styles.name}>{group.label}</span>
              <CountPill>{group.tasks.length}</CountPill>
            </button>
          </h3>
          {due && <span className={styles.date}>Due {due}</span>}
          {hasProgress && (
            <Progress className={styles.progress} value={group.done} max={group.total} label={`${group.done} of ${group.total} done`} showValue />
          )}
        </div>
      )}
      {(isOpen || !showHeader) && <ul id={bodyId} className={styles.rows}>{children}</ul>}
    </section>
  );
}
