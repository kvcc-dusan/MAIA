// @maia:chronos-calendar
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatDayLabel, formatMonthYear, sameDay } from "../../../lib/time";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

/**
 * Chronos's month calendar.
 *
 * Extracted from ChronosModal, which had grown a hand-rolled grid whose day
 * cells were ~30 consecutive unlabeled buttons — a screen reader got nothing,
 * and "normal day" vs "selected day" was the only visible state. Cells now
 * carry full-date aria-labels plus selected/today/has-tasks state, and days
 * with tasks show a dot (the task map existed but was never used to decorate
 * the calendar).
 */
export default function MonthCalendar({ view, setView, selectedDate, onSelectDate, today, tasksOn }) {
  const gridCells = useMemo(() => {
    const monthStart = new Date(view.y, view.m, 1);
    const monthEnd = new Date(view.y, view.m + 1, 0);
    const startPad = (monthStart.getDay() + 6) % 7; // Monday-first
    const daysInMonth = monthEnd.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [view.y, view.m]);

  return (
    <>
      <div className="flex flex-none items-center justify-between p-6 pb-2">
        <span className="text-sm font-medium text-foreground">
          {selectedDate ? formatDayLabel(selectedDate) : formatMonthYear(new Date(view.y, view.m, 1))}
        </span>
        <div className="flex gap-1">
          <button
            aria-label="Previous month"
            onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            aria-label="Next month"
            onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex-none px-4 pb-4" role="group" aria-label="Month calendar">
        <div className="mb-2 grid grid-cols-7">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} aria-hidden="true" className="py-1 text-center text-xs font-bold text-subtle-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {gridCells.map((d, i) => {
            if (!d) return <div key={i} className="h-9" />;

            const isSel = sameDay(d, selectedDate);
            const isToday = sameDay(d, today);
            const isPast = d < today && !isToday;
            const taskCount = tasksOn(d).length;

            return (
              <div key={i} className="h-9">
                <button
                  onClick={() => onSelectDate((prev) => (prev && sameDay(prev, d) ? null : d))}
                  aria-label={`${formatDayLabel(d)}${taskCount > 0 ? `, ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""}${isToday ? ", today" : ""}${isSel ? ", selected" : ""}`}
                  aria-pressed={isSel}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "relative flex h-full w-full flex-col items-center justify-center rounded-lg transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                    isSel
                      ? "bg-primary font-semibold text-primary-foreground shadow-lg"
                      : isPast
                        ? "text-faint-foreground hover:bg-overlay-subtle hover:text-muted-foreground"
                        : "text-foreground-secondary hover:bg-overlay-subtle hover:text-foreground",
                    isToday && !isSel && "border border-border-strong bg-overlay font-semibold text-foreground"
                  )}
                >
                  <span className="text-xs">{d.getDate()}</span>
                  {taskCount > 0 && !isSel && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0.5 size-1 rounded-full",
                        isPast ? "bg-faint-foreground" : "bg-info"
                      )}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
