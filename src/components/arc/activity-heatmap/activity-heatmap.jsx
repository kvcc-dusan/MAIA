import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./activity-heatmap.module.css";
const DAY = 864e5;
const LEVELS = [0, 1, 2, 3, 4];
const enter = [...motionTokens.ease.enter];
const standard = [...motionTokens.ease.standard];
const WAVE = 420;
const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time) => new Date(time).toISOString().slice(0, 10);
function buildModel(days, weekStartsOn, thresholds, locale) {
  const dates = days.map((day) => toUtc(day.date)).filter(Number.isFinite);
  const start = dates.length ? Math.min(...dates) : toUtc("2025-01-01");
  const length = dates.length ? Math.round((Math.max(...dates) - start) / DAY) + 1 : 0;
  const counts = new Array(length).fill(0);
  days.forEach((day) => {
    const index = Math.round((toUtc(day.date) - start) / DAY);
    if (index >= 0 && index < length) counts[index] += Math.max(0, day.count);
  });
  const max = counts.reduce((a, b) => Math.max(a, b), 0);
  const bounds = thresholds ?? [Math.max(1, Math.ceil(max * 0.25)), Math.max(2, Math.ceil(max * 0.5)), Math.max(3, Math.ceil(max * 0.75))];
  const levels = counts.map((count) => count <= 0 ? 0 : count <= bounds[0] ? 1 : count <= bounds[1] ? 2 : count <= bounds[2] ? 3 : 4);
  const lead = (new Date(start).getUTCDay() - weekStartsOn + 7) % 7;
  const weeks = Math.ceil((lead + length) / 7);
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const months = [];
  for (let index = 0; index < length; index++) {
    const date = new Date(start + index * DAY);
    if (index === 0 || date.getUTCDate() === 1) months.push({ month: date.getUTCFullYear() * 12 + date.getUTCMonth(), col: Math.floor((lead + index) / 7), label: monthName.format(date) });
  }
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();
  const perLevel = [0, 0, 0, 0, 0];
  levels.forEach((level) => perLevel[level]++);
  return { start, length, lead, weeks, total: counts.reduce((a, b) => a + b, 0), counts, levels, thresholds: bounds, months, perLevel };
}
const CONTRIBUTIONS = { one: "contribution", other: "contributions" };
const noun = (count, unit) => count === 1 ? unit.one : unit.other;
const noopSubscribe = () => () => {
};
function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = useReducedMotion();
  return hydrated && !!reduced;
}
const tipText = (reduced) => ({
  from: (change) => change === "instant" ? { opacity: 1, y: "0em", filter: "blur(0px)" } : reduced ? { opacity: 0 } : { opacity: 0, y: `${0.3 * (change || 1)}em`, filter: `blur(${change ? motionTokens.blur.soft : motionTokens.blur.subtle}px)` },
  to: { opacity: 1, y: "0em", filter: "blur(0px)" },
  gone: (change) => change === "instant" || reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: `${-0.3 * (change || 1)}em`, filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.instant, ease: standard } }
});
function RollingNumber({ value, locale, reduced }) {
  const [state, setState] = useState({ value, direction: 1 });
  if (state.value !== value) setState({ value, direction: value > state.value ? 1 : -1 });
  const inner = useRef(null);
  const width = useMotionValue("auto");
  const armedUntil = useRef(0), lastValue = useRef(value);
  useLayoutEffect(() => {
    if (lastValue.current === value) return;
    lastValue.current = value;
    armedUntil.current = performance.now() + 600;
  }, [value]);
  useEffect(() => {
    const node = inner.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect().width;
      if (reduced || width.get() === "auto" || performance.now() > armedUntil.current) width.jump(next);
      else animate(width, next, motionTokens.spring.morph);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, width]);
  const chars = [...new Intl.NumberFormat(locale).format(value)];
  const variants = {
    from: (direction) => reduced ? { opacity: 0 } : { opacity: 0, y: `${0.3 * direction}em`, filter: `blur(${motionTokens.blur.soft}px)` },
    to: { opacity: 1, y: "0em", filter: "blur(0px)" },
    gone: (direction) => reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: `${-0.3 * direction}em`, filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.instant, ease: standard } }
  };
  return <motion.span className={styles.rollingFrame} style={{ width }} aria-hidden="true"><span ref={inner} className={styles.rolling}>
    {chars.map((char, index) => {
    const place = chars.length - index;
    return <span key={place} className={styles.place}>
        <AnimatePresence mode="popLayout" initial={false} custom={state.direction}>
          <motion.span
      key={char}
      className={styles.placeChar}
      custom={state.direction}
      variants={variants}
      initial="from"
      animate="to"
      exit="gone"
      transition={reduced ? { duration: motionTokens.duration.fast } : { duration: motionTokens.duration.standard, ease: enter, delay: Math.min(place * 0.018, 0.09) }}
    >{char}</motion.span>
        </AnimatePresence>
      </span>;
  })}
  </span></motion.span>;
}
function RiseText({ text, reduced, children }) {
  return <span className={styles.rise} aria-hidden="true">
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
    key={text}
    className={styles.riseLine}
    initial={reduced ? { opacity: 0 } : { opacity: 0, y: "0.3em", filter: `blur(${motionTokens.blur.soft}px)` }}
    animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: "-0.3em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.instant, ease: standard } }}
    transition={{ duration: reduced ? motionTokens.duration.fast : motionTokens.duration.standard, ease: enter }}
  >{children ?? text}</motion.span>
    </AnimatePresence>
  </span>;
}
export function ActivityHeatmap({ days, label, period, unit: unitProp = CONTRIBUTIONS, thresholds, weekStartsOn = 0, selectedDate = null, onSelectDate, actions, locale = "en-US", className }) {
  const reduced = useReducedMotionSafe();
  const id = useId();
  const unit = useMemo(() => ({ one: unitProp.one, other: unitProp.other }), [unitProp.one, unitProp.other]);
  const rootRef = useRef(null);
  const plotRef = useRef(null);
  const gridRef = useRef(null);
  const scrollerRef = useRef(null);
  const ringRef = useRef(null);
  const measureRef = useRef(null);
  const inView = useInView(plotRef, { once: true, amount: 0.35 });
  const model = useMemo(() => buildModel(days, weekStartsOn, thresholds, locale), [days, weekStartsOn, thresholds, locale]);
  const formats = useMemo(() => ({
    long: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    short: new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
    number: new Intl.NumberFormat(locale)
  }), [locale]);
  const [range, setRange] = useState({ start: model.start, direction: 1 });
  if (range.start !== model.start) setRange({ start: model.start, direction: model.start > range.start ? 1 : -1 });
  const [reveal, setReveal] = useState("hidden");
  useEffect(() => {
    if (reveal !== "hidden" || !(inView || reduced)) return;
    const frame = requestAnimationFrame(() => setReveal(reduced ? "done" : "revealing"));
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, reveal]);
  useEffect(() => {
    if (reveal !== "revealing") return;
    const timer = window.setTimeout(() => setReveal("done"), WAVE + 700);
    return () => window.clearTimeout(timer);
  }, [reveal]);
  const selectedIndex = selectedDate ? Math.round((toUtc(selectedDate) - model.start) / DAY) : -1;
  const hasSelection = selectedIndex >= 0 && selectedIndex < model.length;
  const [focusIndex, setFocusIndex] = useState(null);
  const tabIndexDay = focusIndex !== null && focusIndex < model.length ? focusIndex : hasSelection ? selectedIndex : model.length - 1;
  const [preview, setPreview] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [legendFocus, setLegendFocus] = useState(0);
  const previewTimer = useRef(0);
  const highlight = preview ?? pinned;
  const previewLevel = (level) => {
    window.clearTimeout(previewTimer.current);
    if (level !== null) setPreview(level);
    else previewTimer.current = window.setTimeout(() => setPreview(null), 90);
  };
  useEffect(() => () => window.clearTimeout(previewTimer.current), []);
  const [tip, setTip] = useState(null);
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState("instant");
  const openRef = useRef(false);
  const hideTimer = useRef(0);
  const tipX = useMotionValue(0), tipY = useMotionValue(0), tipWidth = useMotionValue("auto");
  function contentFor(index, anchor) {
    const count = model.counts[index];
    const date = new Date(model.start + index * DAY);
    return { key: `day-${toIso(date.getTime())}`, primary: count ? `${formats.number.format(count)} ${noun(count, unit)}` : `No ${unit.other}`, secondary: formats.short.format(date), value: count, anchor };
  }
  const [a, b, c] = model.thresholds;
  const ranges = [`no ${unit.other}`, a === 1 ? `1 ${unit.one}` : `1 to ${a} ${unit.other}`, `${a + 1} to ${b} ${unit.other}`, `${b + 1} to ${c} ${unit.other}`, `${c + 1} or more ${unit.other}`];
  const shortRanges = [`no ${unit.other}`, a === 1 ? `1 ${unit.one}` : `1\u2013${a} ${unit.other}`, `${a + 1}\u2013${b} ${unit.other}`, `${b + 1}\u2013${c} ${unit.other}`, `${c + 1}+ ${unit.other}`];
  const dayCount = highlight === null ? "" : `${formats.number.format(model.perLevel[highlight])} ${model.perLevel[highlight] === 1 ? "day" : "days"}`;
  const caption = highlight === null ? "" : `${dayCount} with ${shortRanges[highlight]}`;
  function show(next) {
    window.clearTimeout(hideTimer.current);
    setChange(tip && openRef.current ? Math.sign(next.value - tip.value) : "instant");
    setTip(next);
    setOpen(true);
  }
  function hideSoon(delay = 110) {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), delay);
  }
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  useLayoutEffect(() => {
    const root = rootRef.current, measure = measureRef.current;
    if (!tip || !root || !measure) return;
    const place = (glide) => {
      const box = root.getBoundingClientRect(), cell = tip.anchor.getBoundingClientRect();
      const width = Math.ceil(measure.getBoundingClientRect().width);
      const half = width / 2 + 13;
      const x = Math.min(Math.max(cell.left - box.left + cell.width / 2, half + 2), box.width - half - 2);
      const y = cell.top - box.top;
      if (glide) {
        animate(tipX, x, motionTokens.spring.snappy);
        animate(tipY, y, motionTokens.spring.snappy);
        animate(tipWidth, width, motionTokens.spring.morph);
      } else {
        tipX.jump(x);
        tipY.jump(y);
        tipWidth.jump(width);
      }
    };
    place(open && openRef.current && !reduced);
    openRef.current = open;
    if (!open) return;
    const scroller = scrollerRef.current;
    const follow = () => place(false);
    scroller?.addEventListener("scroll", follow, { passive: true });
    return () => scroller?.removeEventListener("scroll", follow);
  }, [tip, open, reduced, tipX, tipY, tipWidth]);
  const indexOf = (element) => {
    const cell = element?.closest("[data-index]");
    return cell && gridRef.current?.contains(cell) ? { cell, index: Number(cell.dataset.index) } : null;
  };
  const focusDay = (index) => gridRef.current?.querySelector(`[data-index="${index}"]`)?.focus();
  function onGridPointerOver(event) {
    const hit = indexOf(event.target);
    if (hit) show(contentFor(hit.index, hit.cell));
  }
  function onGridPointerLeave(event) {
    const focused = indexOf(document.activeElement);
    if (focused?.cell.matches(":focus-visible")) show(contentFor(focused.index, focused.cell));
    else hideSoon(event.pointerType === "touch" ? 2400 : 110);
  }
  function onGridFocus(event) {
    const hit = indexOf(event.target);
    if (!hit) return;
    setFocusIndex(hit.index);
    show(contentFor(hit.index, hit.cell));
  }
  function onGridBlur(event) {
    if (!gridRef.current?.contains(event.relatedTarget)) hideSoon(0);
  }
  function onGridKeyDown(event) {
    const hit = indexOf(event.target);
    if (!hit) return;
    const moves = { ArrowUp: hit.index - 1, ArrowDown: hit.index + 1, ArrowLeft: hit.index - 7, ArrowRight: hit.index + 7, Home: 0, End: model.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      focusDay(Math.min(Math.max(moves[event.key], 0), model.length - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectDate?.(toIso(model.start + hit.index * DAY));
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }
  function onLegendKeyDown(event) {
    const moves = { ArrowLeft: legendFocus - 1, ArrowRight: legendFocus + 1, Home: 0, End: 4 };
    if (event.key === "Escape") {
      previewLevel(null);
      return;
    }
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = Math.min(Math.max(moves[event.key], 0), 4);
    rootRef.current?.querySelector(`[data-level-key="${next}"]`)?.focus();
  }
  const ringShown = hasSelection && reveal !== "hidden";
  const ringWasShown = useRef(ringShown);
  useLayoutEffect(() => {
    const ring = ringRef.current;
    if (ring && ringShown && !ringWasShown.current) {
      ring.style.transitionProperty = "opacity";
      void ring.offsetWidth;
      ring.style.transitionProperty = "";
    }
    ringWasShown.current = ringShown;
  }, [ringShown]);
  const maxDiagonal = Math.max(1, model.weeks - 1 + 6);
  const step = Math.min(12, WAVE / maxDiagonal);
  const cells = useMemo(() => Array.from({ length: 7 }, (_, row) => <div key={row} role="row" className={styles.row}>
    {Array.from({ length: model.weeks }, (_2, col) => {
    const index = col * 7 + row - model.lead;
    const inRange = index >= 0 && index < model.length;
    const wave = { "--wave": `${Math.round((col + row) * step)}ms`, "--wave-back": `${Math.round((maxDiagonal - col - row) * step)}ms` };
    if (!inRange) return <span key={col} className={styles.cell} data-empty="" style={wave} aria-hidden="true" />;
    const count = model.counts[index];
    const date = new Date(model.start + index * DAY);
    return <span
      key={col}
      role="gridcell"
      className={styles.cell}
      style={wave}
      data-index={index}
      data-level={model.levels[index]}
      tabIndex={index === tabIndexDay ? 0 : -1}
      aria-selected={onSelectDate ? index === selectedIndex : void 0}
      aria-label={`${count ? formats.number.format(count) : "No"} ${noun(count, unit)}, ${formats.long.format(date)}`}
      onClick={() => onSelectDate?.(toIso(date.getTime()))}
    />;
  })}
  </div>), [model, step, maxDiagonal, tabIndexDay, selectedIndex, formats, unit, onSelectDate]);
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, row) => {
    const weekday = (row + weekStartsOn) % 7;
    return weekday % 2 === 1 ? formats.weekday.format(new Date((3 + weekday) * DAY)) : "";
  }), [formats, weekStartsOn]);
  const selectedCol = hasSelection ? Math.floor((selectedIndex + model.lead) / 7) : 0;
  const selectedRow = hasSelection ? (selectedIndex + model.lead) % 7 : 0;
  const summary = `${formats.number.format(model.total)} ${noun(model.total, unit)} in ${period}`;
  return <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(" ")}>
    <div className={styles.header}>
      <p className={styles.summary}>
        <span className={styles.total}><RollingNumber value={model.total} locale={locale} reduced={reduced} /> {noun(model.total, unit)}</span>{" "}
        <span className={styles.period}>in <RiseText text={period} reduced={reduced} /></span>
        <span className={styles.srOnly} role="status">{summary}</span>
      </p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>

    <div ref={scrollerRef} className={styles.scroller}>
      <div className={styles.canvas} style={{ "--weeks": model.weeks }}>
        <div className={styles.months} aria-hidden="true">
          {model.months.map((month, order) => <span key={`${month.month % 12}-${model.months.findIndex((item) => item.month % 12 === month.month % 12) === order ? 0 : 1}`} className={styles.month} style={{ "--col": month.col }}>{month.label}</span>)}
        </div>
        <div className={styles.weekdays} aria-hidden="true">{weekdayLabels.map((text, row) => <span key={row} className={styles.weekday}>{text}</span>)}</div>
        <div ref={plotRef} className={styles.plot}>
          <div
    ref={gridRef}
    role="grid"
    aria-label={label}
    aria-readonly="true"
    aria-describedby={`${id}-legend`}
    className={styles.grid}
    data-reveal={reveal}
    data-direction={range.direction < 0 ? "back" : void 0}
    data-highlight={highlight ?? void 0}
    onPointerOver={onGridPointerOver}
    onPointerLeave={onGridPointerLeave}
    onFocus={onGridFocus}
    onBlur={onGridBlur}
    onKeyDown={onGridKeyDown}
  >
            {cells}
          </div>
          <span ref={ringRef} className={styles.ring} data-shown={ringShown || void 0} style={{ "--col": selectedCol, "--row": selectedRow }} aria-hidden="true" />
        </div>
      </div>
    </div>

    <div className={styles.legend}>
      <span id={`${id}-legend`} className={styles.srOnly}>Darker squares mean more {unit.other}. Levels: {ranges.join(", ")}.</span>
      <span className={styles.caption} aria-live="polite">
        <RiseText text={caption} reduced={reduced}>{caption && <><span className={styles.captionLong}>{caption}</span><span className={styles.captionShort}>{dayCount}</span></>}</RiseText>
        <span className={styles.srOnly}>{caption}</span>
      </span>
      <span className={styles.scale}>
      <span className={styles.legendText} aria-hidden="true">Less</span>
      <div className={styles.swatches} role="group" aria-label="Highlight days by level" onKeyDown={onLegendKeyDown}>
        {LEVELS.map((level) => <button
    key={level}
    type="button"
    className={styles.swatch}
    data-level-key={level}
    data-level={level}
    tabIndex={level === legendFocus ? 0 : -1}
    aria-pressed={pinned === level}
    aria-label={`Highlight days with ${ranges[level]}`}
    onClick={() => setPinned((current) => current === level ? null : level)}
    onPointerEnter={() => previewLevel(level)}
    onPointerLeave={() => previewLevel(null)}
    onFocus={() => {
      setLegendFocus(level);
      previewLevel(level);
    }}
    onBlur={() => previewLevel(null)}
  />)}
      </div>
      <span className={styles.legendText} aria-hidden="true">More</span>
      </span>
    </div>

    <motion.div className={styles.tip} style={{ x: tipX, y: tipY }} aria-hidden="true">
      <motion.div
    className={styles.bubble}
    style={{ x: "-50%" }}
    initial={false}
    animate={open && tip ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : 0.96 }}
    transition={reduced ? { duration: open ? motionTokens.duration.fast : motionTokens.duration.instant } : open ? { ...motionTokens.spring.snappy, opacity: { duration: motionTokens.duration.fast, ease: enter } } : { duration: motionTokens.duration.instant, ease: standard }}
  >
        <motion.span className={styles.tipBody} style={{ width: tipWidth }}>
          <span ref={measureRef} className={styles.tipMeasure}><span className={styles.tipPrimary}>{tip?.primary}</span><span className={styles.tipSecondary}>{tip?.secondary}</span></span>
          <AnimatePresence mode="popLayout" initial={false} custom={change}>
            {tip && <motion.span key={tip.key} className={styles.tipLines} custom={change} variants={tipText(reduced)} initial="from" animate="to" exit="gone" transition={{ duration: reduced ? motionTokens.duration.fast : motionTokens.duration.standard, ease: enter }}>
              <span className={styles.tipPrimary}>{tip.primary}</span>
              <span className={styles.tipSecondary}>{tip.secondary}</span>
            </motion.span>}
          </AnimatePresence>
        </motion.span>
      </motion.div>
    </motion.div>
  </div>;
}
export default ActivityHeatmap;
