// @maia:chronos-calendar
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDayLabel, formatMonthYear, sameDay } from "../../../lib/time";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { IconButton } from "@/components/composed/IconButton";
import styles from "./MonthCalendar.module.css";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const dayKey = (d) => d.toDateString();

const addDays = (d, n) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

// Monday-first offset, matching the grid's pad order.
const weekdayIndex = (d) => (d.getDay() + 6) % 7;

/**
 * Chronos's month calendar — flat, flush with the right column's top, per the
 * reference layout: selected-date header with the month chevrons beside it,
 * grid beneath, no card box (the column divider and the sessions border do
 * the separating).
 *
 * Keyboard model: the grid is a SINGLE tab stop via roving tabindex — exactly
 * one day button (the "focus day") has tabIndex 0, the rest are -1. Arrow
 * keys move the focus day (±1 day / ±7 days, Home/End within the week,
 * PageUp/PageDown across months), which both moves real DOM focus and becomes
 * the next Tab re-entry point. Enter/Space need no extra code: the day cells
 * are real buttons, so native activation fires the same select/deselect
 * click. Arrowing past a month edge flips the view month so the focused day
 * is always rendered. All 42 cells were tab stops before this — 41 of them
 * are now unreachable by Tab alone, which is the point.
 */
export default function MonthCalendar({ view, setView, selectedDate, onSelectDate, today, tasksOn }) {
  const gridCells = useMemo(() => {
    const monthStart = new Date(view.y, view.m, 1);
    const monthEnd = new Date(view.y, view.m + 1, 0);
    const startPad = weekdayIndex(monthStart);
    const daysInMonth = monthEnd.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [view.y, view.m]);

  // The focus day drives the roving tabindex. It can drift out of the
  // rendered month (month chevrons), so the actual tab stop falls back to
  // the selected day, then today, then the 1st — the grid must never be
  // without a Tab entry point.
  const [focusDate, setFocusDate] = useState(() => new Date(today));
  // Keyboard nav focuses the next cell after it renders — month flips swap
  // the button elements out from under the handler, so focus is applied in
  // an effect rather than synchronously.
  const [pendingFocus, setPendingFocus] = useState(null);
  const cellRefs = useRef(new Map());

  useEffect(() => {
    if (!pendingFocus) return;
    cellRefs.current.get(dayKey(pendingFocus))?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  const inViewMonth = (d) =>
    d && d.getMonth() === view.m && d.getFullYear() === view.y;
  const activeFocus = inViewMonth(focusDate)
    ? focusDate
    : inViewMonth(selectedDate)
      ? selectedDate
      : inViewMonth(today)
        ? today
        : new Date(view.y, view.m, 1);

  const shiftMonth = (delta) => {
    const rawM = view.m + delta;
    const nextM = (rawM + 12) % 12;
    const nextY = view.y + Math.floor(rawM / 12);
    setView({ y: nextY, m: nextM });
    // Keep the tab stop inside the newly shown month: same day-of-month,
    // clamped for shorter months (Jan 31 → Feb 28).
    const lastDay = new Date(nextY, nextM + 1, 0).getDate();
    setFocusDate((prev) => new Date(nextY, nextM, Math.min(prev.getDate(), lastDay)));
  };

  const handleGridKeyDown = (e) => {
    let next = null;
    if (e.key === "ArrowLeft") next = addDays(activeFocus, -1);
    else if (e.key === "ArrowRight") next = addDays(activeFocus, 1);
    else if (e.key === "ArrowUp") next = addDays(activeFocus, -7);
    else if (e.key === "ArrowDown") next = addDays(activeFocus, 7);
    else if (e.key === "Home") next = addDays(activeFocus, -weekdayIndex(activeFocus));
    else if (e.key === "End") next = addDays(activeFocus, 6 - weekdayIndex(activeFocus));
    else if (e.key === "PageUp" || e.key === "PageDown") {
      const dir = e.key === "PageDown" ? 1 : -1;
      const candidate = new Date(view.y, view.m + dir, activeFocus.getDate());
      // Date normalisation can spill into the month after the target one;
      // clamp to the target month's last day when it does.
      next =
        candidate.getMonth() === (view.m + dir + 12) % 12
          ? candidate
          : new Date(view.y, view.m + dir + 1, 0);
    } else return;

    e.preventDefault();
    setFocusDate(next);
    setPendingFocus(next);
    if (!inViewMonth(next)) setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.heading} aria-live="polite">
          {selectedDate ? formatDayLabel(selectedDate) : formatMonthYear(new Date(view.y, view.m, 1))}
        </span>
        <div className={styles.nav}>
          <IconButton icon={ChevronLeftIcon} label="Previous month" onClick={() => shiftMonth(-1)} />
          <IconButton icon={ChevronRightIcon} label="Next month" onClick={() => shiftMonth(1)} />
        </div>
      </div>

      <div className={styles.body} role="group" aria-label="Month calendar" onKeyDown={handleGridKeyDown}>
        <div className={styles.weekdays}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} aria-hidden="true" className={styles.weekday}>
              {d}
            </div>
          ))}
        </div>
        <div className={styles.grid}>
          {gridCells.map((d, i) => {
            if (!d) return <div key={i} className={styles.cell} />;

            const isSel = sameDay(d, selectedDate);
            const isToday = sameDay(d, today);
            const isPast = d < today && !isToday;
            const taskCount = tasksOn(d).length;

            return (
              <div key={i} className={styles.cell}>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) cellRefs.current.set(dayKey(d), el);
                    else cellRefs.current.delete(dayKey(d));
                  }}
                  tabIndex={sameDay(d, activeFocus) ? 0 : -1}
                  onClick={() => {
                    setFocusDate(d);
                    onSelectDate((prev) => (prev && sameDay(prev, d) ? null : d));
                  }}
                  aria-label={`${formatDayLabel(d)}${taskCount > 0 ? `, ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""}${isToday ? ", today" : ""}${isSel ? ", selected" : ""}`}
                  aria-pressed={isSel}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(styles.day, isPast && styles.past, isToday && styles.today, isSel && styles.selected)}
                >
                  <span>{d.getDate()}</span>
                  {taskCount > 0 && <span aria-hidden="true" className={styles.dot} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
