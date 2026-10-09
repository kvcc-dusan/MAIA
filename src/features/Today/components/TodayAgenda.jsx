import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import { PriorityCheckbox } from "@/components/ui/PriorityCheckbox";
import { Calendar03 as Calendar, Clock01 as Clock, Layers01 as Layers } from "@/components/ui/CustomIcon.jsx";
import { Bell } from "lucide-react";
import { formatTime, formatMonthDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import styles from "./TodayAgenda.module.css";

/**
 * The agenda — everything today that has a clock attached.
 *
 * This is the half of Today that was missing entirely: the page used to build
 * its task list from `isNextAction` and the inbox, never reading `due` or
 * `schedule`, so a task due in two hours simply did not appear anywhere.
 *
 * The division of labour with the Focus widget is deliberate: the agenda owns
 * time-bound items (sessions, due tasks, signals), Focus owns untimed ones
 * (next action per project, inbox). Nothing should appear in both.
 *
 * Items are pre-sorted and pre-grouped by the caller (HomePage) so this stays
 * a presentational component.
 */

const KIND_ICON = {
  session: Layers,
  signal: Bell,
};

/** Fixed-width so every row's title starts on the same x, list-style. */
function TimeCell({ children, className }) {
  return <span className={cn(styles.time, className)}>{children}</span>;
}

function ContextLabel({ children }) {
  if (!children) return null;
  return <span className={styles.context}>{children}</span>;
}

function TaskRow({ item, onToggle, onOpen }) {
  const { task, contextLabel, isPast, isOverdue } = item;
  return (
    <div className={cn(styles.row, isPast && !isOverdue && styles.past)}>
      {/* An overdue task's due *time* is from another day and reads as
          nonsense next to today's times, so show the date it was due. */}
      <TimeCell className={isOverdue ? styles.overdueTime : undefined}>
        {isOverdue ? formatMonthDay(task.due) : task.due ? formatTime(task.due) : "No time"}
      </TimeCell>
      <PriorityCheckbox
        checked={!!task.done}
        priority={task.priority || "p3"}
        onChange={() => onToggle?.(task.id)}
        aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
      />
      <button type="button" onClick={() => onOpen?.(item)} className={styles.title}>
        {task.title}
      </button>
      <ContextLabel>{contextLabel}</ContextLabel>
    </div>
  );
}

function EventRow({ item, onOpen }) {
  const Icon = KIND_ICON[item.kind] || Clock;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className={cn(styles.row, item.isPast && styles.past)}
    >
      <TimeCell>{item.timeLabel}</TimeCell>
      <span className={styles.kindIcon}>
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className={styles.title}>{item.title}</span>
      <ContextLabel>{item.contextLabel}</ContextLabel>
    </button>
  );
}

function AgendaRow(props) {
  return props.item.kind === "task" ? <TaskRow {...props} /> : <EventRow {...props} />;
}

/** The boundary between what has passed and what is still ahead. */
function NowMarker({ label }) {
  return (
    <div className={styles.marker} aria-hidden="true">
      <span className={styles.markerTime}>{label}</span>
      <span className={styles.markerLine} />
    </div>
  );
}

export default function TodayAgenda({
  overdue = [],
  today = [],
  nowLabel,
  nowIndex = -1,
  onToggleTask,
  onOpenItem,
}) {
  const isClear = overdue.length === 0 && today.length === 0;

  return (
    <SectionCard
      icon={Calendar}
      title="Agenda"
      titleAs="h2"
      count={overdue.length + today.length || null}
      bodyClassName="p-3"
    >
      {isClear ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled today"
          description="Tasks with a due time, sessions and signals for today show up here."
          action={
            <Button variant="secondary" size="sm" onClick={() => onOpenItem?.()}>
              Open calendar
            </Button>
          }
        />
      ) : (
        <>
          {overdue.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupHeader}>
                <SectionLabel className={styles.overdueLabel}>Overdue</SectionLabel>
                <CountPill>{overdue.length}</CountPill>
              </div>
              {overdue.map((item) => (
                <AgendaRow
                  key={item.id}
                  item={item}
                  onToggle={onToggleTask}
                  onOpen={onOpenItem}
                />
              ))}
            </div>
          )}

          {today.length > 0 && (
            <div className={styles.group}>
              {overdue.length > 0 && (
                <div className={styles.groupHeader}>
                  <SectionLabel>Today</SectionLabel>
                </div>
              )}
              {today.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i === nowIndex && <NowMarker label={nowLabel} />}
                  <AgendaRow item={item} onToggle={onToggleTask} onOpen={onOpenItem} />
                </React.Fragment>
              ))}
              {nowIndex === today.length && <NowMarker label={nowLabel} />}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
