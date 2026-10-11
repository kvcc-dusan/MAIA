"use client";
import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import { useToday } from "../lib/use-today";
import styles from "./calendar.module.css";
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const sameDay = (a, b) => Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
const sameMonth = (a, b) => Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth());
const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const shiftMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, Math.min(date.getDate(), new Date(date.getFullYear(), date.getMonth() + amount + 1, 0).getDate()));
const isBefore = (a, b) => Boolean(b && startOfDay(a).getTime() < startOfDay(b).getTime());
const isAfter = (a, b) => Boolean(b && startOfDay(a).getTime() > startOfDay(b).getTime());
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const weekdayColumn = (date, weekStartsOn) => (date.getDay() - weekStartsOn + 7) % 7;
const makeWeeks = (month, weekStartsOn) => {
  const start = addDays(month, -weekdayColumn(month, weekStartsOn));
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_2, day) => addDays(start, week * 7 + day)));
};
const subscribeNothing = () => () => {
};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export { useToday } from "../lib/use-today";
const { spring, duration, ease } = motionTokens;
const stripSpring = { type: "spring", visualDuration: 0.36, bounce: 0, restDelta: 2e-3 };
const monthIndex = (date) => date.getFullYear() * 12 + date.getMonth();
const fromIndex = (index) => new Date(Math.floor(index / 12), (index % 12 + 12) % 12, 1);
const titleSlide = {
  enter: (direction) => ({ opacity: 0, x: direction * 12 }),
  center: { opacity: 1, x: 0, transition: { duration: duration.standard, ease: ease.enter } },
  exit: (direction) => ({ opacity: 0, x: direction * -12, transition: { duration: 0.14, ease: ease.standard } })
};
const titleFade = { enter: { opacity: 1, x: 0 }, center: { opacity: 1, x: 0, transition: { duration: 0 } }, exit: { opacity: 0, transition: { duration: 0 } } };
function SelectionDisc({ cell, reduced }) {
  const visible = cell >= 0;
  const col = useMotionValue(visible ? cell % 7 : 0);
  const row = useMotionValue(visible ? Math.floor(cell / 7) : 0);
  const opacity = useMotionValue(visible ? 1 : 0);
  const scale = useMotionValue(visible ? 1 : 0.6);
  const transform = useTransform(() => `translate(calc(${col.get()} * (100% + 4px)), calc(${row.get()} * (100% + 4px))) scale(${scale.get()})`);
  const hidden = useRef(!visible);
  useLayoutEffect(() => {
    if (!visible) {
      hidden.current = true;
      const fade = reduced ? { duration: 0 } : { duration: 0.14, ease: ease.standard };
      const controls2 = [animate(opacity, 0, fade), animate(scale, 0.6, fade)];
      return () => controls2.forEach((control) => control.stop());
    }
    const nextCol = cell % 7, nextRow = Math.floor(cell / 7);
    const controls = [];
    if (hidden.current || reduced) {
      col.jump(nextCol);
      row.jump(nextRow);
    } else controls.push(animate(col, nextCol, spring.morph), animate(row, nextRow, spring.morph));
    hidden.current = false;
    controls.push(animate(opacity, 1, reduced ? { duration: 0 } : { duration: duration.fast, ease: ease.enter }), animate(scale, 1, reduced ? { duration: 0 } : spring.snappy));
    return () => controls.forEach((control) => control.stop());
  }, [cell, visible, reduced, col, row, opacity, scale]);
  return <motion.span className={styles.highlight} style={{ transform, opacity }} aria-hidden="true"><span className={styles.highlightFill} /></motion.span>;
}
function MonthPane({ index, position, present, children }) {
  const x = useTransform(position, (value) => `calc(${(index - value) * 100}% + ${(index - value) * 16}px)`);
  const opacity = useTransform(position, (value) => 1 - Math.min(1, Math.abs(index - value)) * 0.6);
  return <motion.div className={styles.monthBody} style={{ x, opacity }} data-present={present || void 0} aria-hidden={present ? void 0 : true} inert={!present}>{children}</motion.div>;
}
export function Calendar({
  value,
  onChange,
  month: controlledMonth,
  onMonthChange,
  minDate,
  maxDate,
  disabledDates,
  locale = "en-US",
  className,
  showToday = false,
  weekStartsOn = 0
}) {
  const titleId = useId();
  const today = useToday();
  const hydrated = useSyncExternalStore(subscribeNothing, clientSnapshot, serverSnapshot);
  const reducedMotion = (useReducedMotion() ?? false) && hydrated;
  const [internalMonth, setInternalMonth] = useState(() => value ? monthStart(value) : void 0);
  const [focusedDate, setFocusedDate] = useState(value);
  const viewportRef = useRef(null);
  const focusRequest = useRef(null);
  const fallback = value ?? today;
  const month = controlledMonth ? monthStart(controlledMonth) : internalMonth ?? (fallback && monthStart(fallback));
  if (!controlledMonth && !internalMonth && month) setInternalMonth(month);
  const monthTime = month?.getTime();
  const monthKey = month ? dateKey(month) : "pending";
  const [shownMonth, setShownMonth] = useState(monthTime);
  const [direction, setDirection] = useState(0);
  if (shownMonth !== monthTime) {
    setShownMonth(monthTime);
    setDirection(shownMonth === void 0 || monthTime === void 0 ? 0 : monthTime > shownMonth ? 1 : -1);
  }
  const weeks = useMemo(() => monthTime === void 0 ? [] : makeWeeks(new Date(monthTime), weekStartsOn), [monthTime, weekStartsOn]);
  const target = month ? monthIndex(month) : 0;
  const position = useMotionValue(target);
  const [span, setSpan] = useState([target, target]);
  useMotionValueEvent(position, "change", (value2) => {
    const next = [Math.floor(value2 + 1e-3), Math.ceil(value2 - 1e-3)];
    setSpan((current) => current[0] === next[0] && current[1] === next[1] ? current : next);
  });
  const ready = month !== void 0;
  const placed = useRef(ready);
  useLayoutEffect(() => {
    if (!ready) return;
    const from = position.get();
    if (from === target) return;
    if (!placed.current || reducedMotion) {
      placed.current = true;
      position.jump(target);
      return;
    }
    if (Math.abs(target - from) > 2) position.jump(target - Math.sign(target - from));
    const controls = animate(position, target, stripSpring);
    return () => controls.stop();
  }, [ready, target, reducedMotion, position]);
  const paneIndexes = Array.from(/* @__PURE__ */ new Set([span[0], span[1], target])).sort((a, b) => a - b);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(new Date(2024, 0, 7 + weekStartsOn + index))), [weekdayFormatter, weekStartsOn]);
  const monthLabel = month ? formatter.format(month) : "";
  const valueKey = value ? dateKey(value) : "";
  const [last, setLast] = useState({ key: valueKey, date: value });
  const [handoff, setHandoff] = useState({ from: "", to: "", distance: 0 });
  if (last.key !== valueKey) {
    const days = last.date && value ? Math.round((startOfDay(value).getTime() - startOfDay(last.date).getTime()) / 864e5) : 0;
    const columns = last.date && value ? weekdayColumn(value, weekStartsOn) - weekdayColumn(last.date, weekStartsOn) : 0;
    setLast({ key: valueKey, date: value });
    setHandoff({ from: last.key, to: valueKey, distance: Math.hypot(columns, (days - columns) / 7) });
  }
  const numberDelay = (key) => {
    if (!handoff.distance || reducedMotion || key !== handoff.to && key !== handoff.from) return void 0;
    const delay = key === handoff.to ? Math.min(260, 95 + 85 * Math.log(handoff.distance)) : Math.max(20, 130 / handoff.distance);
    return { "--number-delay": `${Math.round(delay)}ms` };
  };
  const isDisabled = (date) => isBefore(date, minDate) || isAfter(date, maxDate) || Boolean(disabledDates?.(date));
  const previousMonth = month && addMonths(month, -1);
  const nextMonth = month && addMonths(month, 1);
  const previousDisabled = Boolean(previousMonth && minDate && previousMonth.getTime() < monthStart(minDate).getTime());
  const nextDisabled = Boolean(nextMonth && maxDate && nextMonth.getTime() > monthStart(maxDate).getTime());
  const todaySelectable = Boolean(today && !isDisabled(today) && onChange);
  const todayIdle = Boolean(today && sameMonth(month, today) && (!todaySelectable || sameDay(value, today)));
  const tabbableKey = (() => {
    const open = (date) => date && sameMonth(date, month) && !isDisabled(date) ? dateKey(date) : "";
    return open(focusedDate) || open(value) || open(today) || dateKey(weeks.flat().find((date) => sameMonth(date, month) && !isDisabled(date)) ?? /* @__PURE__ */ new Date(0));
  })();
  const changeMonth = (target2) => {
    const normalized = monthStart(target2);
    if (!controlledMonth) setInternalMonth(normalized);
    onMonthChange?.(normalized);
  };
  useLayoutEffect(() => {
    const key = focusRequest.current;
    if (!key) return;
    const button = viewportRef.current?.querySelector(`[data-present] [data-date="${key}"]`);
    if (button) {
      focusRequest.current = null;
      button.focus({ preventScroll: true });
    }
  });
  const moveFocus = (from, target2, step) => {
    let next = isBefore(target2, minDate) && minDate ? startOfDay(minDate) : isAfter(target2, maxDate) && maxDate ? startOfDay(maxDate) : target2;
    for (let tries = 0; tries < 42 && isDisabled(next); tries += 1) next = addDays(next, step);
    if (isDisabled(next) || sameDay(next, from)) return;
    setFocusedDate(next);
    focusRequest.current = dateKey(next);
    if (!sameMonth(next, month)) changeMonth(next);
  };
  const onDayKeyDown = (event, date) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isDisabled(date)) onChange?.(date);
      return;
    }
    const moves = {
      ArrowLeft: [addDays(date, -1), -1],
      ArrowRight: [addDays(date, 1), 1],
      ArrowUp: [addDays(date, -7), -1],
      ArrowDown: [addDays(date, 7), 1],
      Home: [addDays(date, -weekdayColumn(date, weekStartsOn)), 1],
      End: [addDays(date, 6 - weekdayColumn(date, weekStartsOn)), -1],
      PageUp: [shiftMonths(date, event.shiftKey ? -12 : -1), -1],
      PageDown: [shiftMonths(date, event.shiftKey ? 12 : 1), 1]
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(date, move[0], move[1]);
  };
  const goToToday = () => {
    if (!today || !month || todayIdle) return;
    setFocusedDate(today);
    if (!sameMonth(today, month)) changeMonth(today);
    if (todaySelectable && !sameDay(value, today)) onChange?.(today);
  };
  const cx = (...names) => names.filter(Boolean).join(" ");
  const cellOf = (paneMonth) => {
    if (!value) return -1;
    const first = addDays(paneMonth, -weekdayColumn(paneMonth, weekStartsOn));
    const index = Math.round((startOfDay(value).getTime() - first.getTime()) / 864e5);
    return index >= 0 && index < 42 ? index : -1;
  };
  const renderMonth = (paneMonth, present) => <>
    <SelectionDisc cell={cellOf(paneMonth)} reduced={reducedMotion} />
    <div className={styles.grid} role="grid" aria-label={formatter.format(paneMonth)}>
    {makeWeeks(paneMonth, weekStartsOn).map((week) => <div key={dateKey(week[0])} className={styles.week} role="row">
      {week.map((date) => {
    const key = dateKey(date);
    const selected = sameDay(date, value);
    const isToday = sameDay(date, today);
    return <button
      key={key}
      type="button"
      role="gridcell"
      data-date={key}
      aria-label={date.toLocaleDateString(locale, { dateStyle: "full" })}
      aria-selected={selected}
      aria-current={isToday ? "date" : void 0}
      tabIndex={present && key === tabbableKey ? 0 : -1}
      disabled={isDisabled(date)}
      style={present ? numberDelay(key) : void 0}
      className={cx(styles.day, !sameMonth(date, paneMonth) && styles.outside, selected && styles.selected, isToday && styles.today)}
      onFocus={() => setFocusedDate(date)}
      onKeyDown={(event) => onDayKeyDown(event, date)}
      onClick={() => onChange?.(date)}
    ><span className={styles.dayNumber}>{date.getDate()}</span></button>;
  })}
    </div>)}
    </div>
  </>;
  return <section className={cx(styles.calendar, className)} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.heading}>
          <span className={styles.srOnly}>{monthLabel}</span>
          <span className={styles.title} aria-hidden="true">
            <AnimatePresence initial={false} custom={direction}>
              {month && <motion.span key={monthKey} className={styles.titleRow} custom={direction} variants={reducedMotion || !direction ? titleFade : titleSlide} initial="enter" animate="center" exit="exit">{monthLabel}</motion.span>}
            </AnimatePresence>
          </span>
        </h2>
        <span className={styles.srOnly} aria-live="polite">{direction ? monthLabel : ""}</span>
        <div className={styles.navigation}>
          {showToday && <button type="button" className={styles.todayButton} aria-disabled={todayIdle || void 0} aria-label={today ? `Today, ${today.toLocaleDateString(locale, { dateStyle: "full" })}` : "Today"} onClick={goToToday}>Today</button>}
          <button type="button" className={styles.navButton} aria-label="Previous month" aria-disabled={previousDisabled || void 0} onClick={() => {
    if (!previousDisabled && previousMonth) changeMonth(previousMonth);
  }}><ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /></button>
          <button type="button" className={styles.navButton} aria-label="Next month" aria-disabled={nextDisabled || void 0} onClick={() => {
    if (!nextDisabled && nextMonth) changeMonth(nextMonth);
  }}><ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" /></button>
        </div>
      </div>
      <div className={styles.weekdays} aria-hidden="true">{weekdays.map((day, index) => <span key={`${day}-${index}`}>{day.slice(0, 2)}</span>)}</div>
      <div className={styles.monthViewport} ref={viewportRef}>
        {month ? paneIndexes.map((index) => <MonthPane key={index} index={index} position={position} present={index === target}>{renderMonth(fromIndex(index), index === target)}</MonthPane>) : <div className={styles.monthBody} aria-hidden="true"><div className={styles.grid}>{Array.from({ length: 6 }, (_, week) => <div key={week} className={styles.week}>{Array.from({ length: 7 }, (_2, day) => <span key={day} className={styles.placeholderDay} />)}</div>)}</div></div>}
      </div>
    </section>;
}
export { addDays, addMonths, sameDay, startOfDay };
