import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import { PriorityCheckbox } from "@/components/ui/PriorityCheckbox";
import { Calendar03 as Calendar, Clock01 as Clock, Layers01 as Layers } from "@/components/ui/CustomIcon.jsx";
import { Bell } from "lucide-react";
import { formatTime, formatMonthDay } from "@/lib/time";
import { cn } from "@/lib/utils";

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

const ROW_BASE =
  "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-overlay-subtle";

const KIND_ICON = {
  session: Layers,
  signal: Bell,
};

/** Fixed-width so every row's title starts on the same x, list-style. */
function TimeCell({ children, muted, className }) {
  return (
    <span
      className={cn(
        "w-32 shrink-0 whitespace-nowrap text-xs tabular-nums",
        muted ? "text-faint-foreground" : "text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

function ContextLabel({ children }) {
  if (!children) return null;
  return (
    <span className="shrink-0 truncate text-xs text-subtle-foreground max-w-[10rem]">
      {children}
    </span>
  );
}

function TaskRow({ item, onToggle, onOpen }) {
  const { task, contextLabel, isPast, isOverdue } = item;
  return (
    <div className={cn(ROW_BASE, isPast && !isOverdue && "opacity-55")}>
      {/* An overdue task's due *time* is from another day and reads as
          nonsense next to today's times — show how far back it was. */}
      <TimeCell muted={isOverdue ? false : isPast} className={isOverdue ? "text-destructive" : undefined}>
        {isOverdue ? formatMonthDay(task.due) : task.due ? formatTime(task.due) : "—"}
      </TimeCell>
      <PriorityCheckbox
        checked={!!task.done}
        priority={task.priority || "p3"}
        onChange={() => onToggle?.(task.id)}
        aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
      />
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        className="min-w-0 flex-1 truncate text-left text-sm text-card-foreground transition-colors group-hover:text-foreground"
      >
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
      className={cn(ROW_BASE, item.isPast && "opacity-55")}
    >
      <TimeCell muted={item.isPast}>{item.timeLabel}</TimeCell>
      <span className="grid size-5 shrink-0 place-items-center text-subtle-foreground">
        <Icon size={12} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-card-foreground transition-colors group-hover:text-foreground">
        {item.title}
      </span>
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
    <div className="flex items-center gap-3 px-2 py-1" aria-hidden="true">
      <span className="w-32 shrink-0 text-xs font-bold tabular-nums text-priority-1">{label}</span>
      <span className="h-px flex-1 bg-priority-1/40" />
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
      count={overdue.length + today.length || null}
      bodyClassName="p-3"
    >
      {isClear ? (
        <p className="px-2 py-3 text-sm text-subtle-foreground">
          Nothing scheduled today.
        </p>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 px-2 pb-1">
                <SectionLabel className="text-destructive">Overdue</SectionLabel>
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
            <div>
              {overdue.length > 0 && (
                <SectionLabel className="block px-2 pt-2 pb-1">Today</SectionLabel>
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
