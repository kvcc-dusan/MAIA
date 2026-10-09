import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./line-chart.module.css";
const { spring, duration, ease } = motionTokens;
const physical = ({ visualDuration, bounce }, restDelta = 1e-3) => {
  const root = 2 * Math.PI / (visualDuration * 1.2);
  return { type: "spring", stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta, restSpeed: restDelta * 2 };
};
const settle = physical(spring.smooth);
const glide = physical(spring.snappy, 1e-4);
const follow = { stiffness: glide.stiffness, damping: glide.damping, restDelta: 0.01 };
const draw = { duration: duration.considered * 1.75, ease: [...ease.inOut] };
const fadeFast = { duration: duration.instant, ease: [...ease.standard] };
const TOP = 12, GAP = 14;
const PALETTE = ["var(--accent)", "color-mix(in oklab, var(--foreground) 46%, var(--surface))", "color-mix(in oklab, var(--foreground) 26%, var(--surface))"];
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const colorOf = (series, index) => series.color ?? PALETTE[Math.min(index, PALETTE.length - 1)];
const clean = (value) => Number(value.toPrecision(12));
const NO_VALUE = "No value";
const EDGE = 1e-6;
const valueOf = (item, key) => {
  const value = item.values[key];
  return value === void 0 ? 0 : value;
};
function niceScale(low, high) {
  const lo = Math.min(0, low), hi = Math.max(high, lo + 1);
  const span = hi - lo, magnitude = 10 ** Math.floor(Math.log10(span / 4));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const step = factor * magnitude, bottom = Math.floor(lo / step) * step, top = Math.ceil(hi / step) * step;
    if ((top - bottom) / step <= 4 + 1e-9) {
      const ticks = [];
      for (let value = bottom; value <= top + step / 2; value += step) ticks.push(clean(value));
      return { min: clean(bottom), max: clean(top), ticks };
    }
  }
  return { min: lo, max: hi, ticks: [lo, hi] };
}
function curveFor(values, smooth, start = 0, total = values.length) {
  if (values.length === 0) return [];
  if (total === 1) return [[0, values[0]], [1, values[0]]];
  const last = values.length - 1, step = 1 / (total - 1);
  const at = (position) => start + position === total - 1 ? 1 : (start + position) * step;
  if (values.length === 1) return [[at(0), values[0]]];
  if (!smooth) return values.map((value, index) => [at(index), value]);
  const slopes = values.slice(1).map((value, index) => (value - values[index]) / step);
  const tangents = values.map((_, index) => index === 0 || index === last ? 0 : (Math.sign(slopes[index - 1]) + Math.sign(slopes[index])) * Math.min(Math.abs(slopes[index - 1]), Math.abs(slopes[index]), Math.abs(slopes[index - 1] + slopes[index]) / 4) || 0);
  if (last > 1) {
    tangents[0] = (3 * slopes[0] - tangents[1]) / 2;
    tangents[last] = (3 * slopes[last - 1] - tangents[last - 1]) / 2;
  } else {
    tangents[0] = slopes[0];
    tangents[1] = slopes[0];
  }
  const samples = Math.max(1, Math.min(16, Math.round(192 / (total - 1))));
  const points = [];
  for (let index = 0; index < last; index++) {
    const low = Math.min(values[index], values[index + 1]), high = Math.max(values[index], values[index + 1]);
    for (let sample = 0; sample < samples; sample++) {
      const t = sample / samples, t2 = t * t, t3 = t2 * t;
      const value = (2 * t3 - 3 * t2 + 1) * values[index] + (t3 - 2 * t2 + t) * step * tangents[index] + (3 * t2 - 2 * t3) * values[index + 1] + (t3 - t2) * step * tangents[index + 1];
      points.push([(start + index + t) * step, clamp(value, low, high)]);
    }
  }
  points.push([at(last), values[last]]);
  return points;
}
function lineFor(values, smooth) {
  const shape = [], runs = [];
  for (let start = 0; start < values.length; start++) {
    if (values[start] === null) continue;
    let end = start;
    while (end + 1 < values.length && values[end + 1] !== null) end++;
    const part = curveFor(values.slice(start, end + 1), smooth, start, values.length);
    for (const point of part) shape.push(point);
    runs.push([part[0][0], part[part.length - 1][0]]);
    start = end;
  }
  return { shape, runs };
}
function runPoints(shape, [from, to]) {
  return [[from, valueAt(shape, from)], ...shape.filter(([x]) => x > from + EDGE && x < to - EDGE), [to, valueAt(shape, to)]];
}
function valueAt(shape, x) {
  if (!shape.length) return 0;
  let low = 0, high = shape.length - 1;
  if (x <= shape[low][0]) return shape[low][1];
  if (x >= shape[high][0]) return shape[high][1];
  while (high - low > 1) {
    const middle = low + high >> 1;
    if (shape[middle][0] < x) low = middle;
    else high = middle;
  }
  const [x0, y0] = shape[low], [x1, y1] = shape[high];
  return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
const update = (track, patch) => Object.assign(track, patch);
const grid = Array.from({ length: 241 }, (_, index) => index / 240);
const subscribeNothing = () => () => {
};
function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return !!useReducedMotion() && hydrated;
}
function useRowY(value, scale, height) {
  return useTransform(() => {
    const span = scale.max.get() - scale.min.get() || 1;
    return Math.round(TOP + (1 - (value - scale.min.get()) / span) * (height - TOP)) + 0.5;
  });
}
function Gridline({ value, scale, height }) {
  const y = useRowY(value, scale, height);
  return <motion.line className={styles.grid} x1={0} x2="100%" y1={y} y2={y} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeFast }} transition={{ duration: duration.standard, ease: [...ease.standard] }} />;
}
function TickLabel({ value, scale, height, format }) {
  const y = useRowY(value, scale, height);
  return <motion.span className={styles.tick} style={{ y }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeFast }} transition={{ duration: duration.standard, ease: [...ease.standard] }}>
    <span className={styles.tickText}>{format(value)}</span>
  </motion.span>;
}
function axisPicks(data, width) {
  const labeled = data.flatMap((item, index) => item.axisLabel ? [index] : []);
  if (!width || !labeled.length) return [];
  const room = Math.max(2, Math.floor(width / 76));
  const stride = Math.ceil(labeled.length / room);
  return labeled.reverse().filter((_, rank) => rank % stride === 0).reverse();
}
export function LineChart({ data, series, label, unit = "", height = 220, formatValue, formatTick = (value) => compact.format(value), hiddenSeries, defaultHiddenSeries, onHiddenSeriesChange, onActiveChange, loading = false, emptyLabel = "No data for this range", legend, categoryLabel = "Date", curve = "smooth", ref, className }) {
  const reduced = useReducedMotionSafe();
  const figure = useRef(null);
  const plot = useRef(null);
  const tip = useRef(null);
  const clip = useRef(null);
  const crosshair = useRef(null);
  const lines = useRef(/* @__PURE__ */ new Map());
  const areas = useRef(/* @__PURE__ */ new Map());
  const singles = useRef(/* @__PURE__ */ new Map());
  const dots = useRef(/* @__PURE__ */ new Map());
  const groups = useRef(/* @__PURE__ */ new Map());
  useImperativeHandle(ref, () => figure.current);
  const inView = useInView(figure, { once: true, amount: 0.3 });
  const uid = `line${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const last = data.length - 1;
  const empty = data.length === 0;
  const [ownHidden, setOwnHidden] = useState(defaultHiddenSeries ?? []);
  const hidden = hiddenSeries ?? ownHidden;
  const toggle = (key) => {
    const next = hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key];
    if (hiddenSeries === void 0) setOwnHidden(next);
    onHiddenSeriesChange?.(next);
  };
  const visible = series.filter((item) => !hidden.includes(item.key));
  const showLegend = legend ?? series.length > 1;
  const signature = `${curve}|${series.map((item) => item.key).join(",")}|${data.map((item) => `${item.key}:${series.map((line) => valueOf(item, line.key) ?? "n").join(",")}`).join(";")}`;
  const targets = useMemo(() => new Map(series.map((line) => [line.key, lineFor(data.map((item) => valueOf(item, line.key)), curve === "smooth")])), [signature]);
  let low = Infinity, high = -Infinity;
  for (const line of visible) for (const item of data) {
    const value = valueOf(item, line.key);
    if (value === null) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const range = Number.isFinite(low) ? niceScale(low, high) : null;
  const [steady, setSteady] = useState(() => range ?? niceScale(0, 100));
  if (range && (range.min !== steady.min || range.max !== steady.max)) setSteady(range);
  const scale = { min: useMotionValue(steady.min), max: useMotionValue(steady.max) };
  const [active, setActive] = useState(null);
  const [seenSignature, setSeenSignature] = useState(signature);
  if (seenSignature !== signature) {
    setSeenSignature(signature);
    setActive(null);
  }
  const index = active === null || empty ? null : Math.min(active, last);
  const scrubbing = index !== null;
  const width = useRef(0);
  const [plotWidth, setPlotWidth] = useState(0);
  const tipSize = useRef({ w: 0, h: 0 });
  const tracks = useRef(/* @__PURE__ */ new Map());
  const drawn = useMotionValue(0);
  const cursor = useMotionValue(1);
  const tipTargetX = useMotionValue(0), tipTargetY = useMotionValue(0);
  const tipSpringX = useSpring(tipTargetX, follow), tipSpringY = useSpring(tipTargetY, follow);
  const live = useRef({ series, hidden });
  useLayoutEffect(() => {
    live.current = { series, hidden };
  });
  const paint = useCallback(() => {
    const w = width.current;
    if (!w) return;
    const lo = scale.min.get(), span = scale.max.get() - lo || 1;
    const toY = (value) => TOP + (1 - (value - lo) / span) * (height - TOP);
    const at = cursor.get();
    const dotYs = [];
    for (const line of live.current.series) {
      const track = tracks.current.get(line.key);
      if (!track) continue;
      const p = track.presence;
      const y = (value) => toY(lo + (value - lo) * p);
      const parts = track.runs.map((run) => ({ run, points: runPoints(track.shape, run) }));
      const trace = (points) => `M${points.map(([x2, value]) => `${(x2 * w).toFixed(1)},${y(value).toFixed(1)}`).join("L")}`;
      const edge = (x2) => +(x2 * w).toFixed(1);
      const joined = parts.filter(({ run: [from, to] }) => from < to);
      lines.current.get(line.key)?.setAttribute("d", joined.map(({ points }) => trace(points)).join(""));
      areas.current.get(line.key)?.setAttribute("d", joined.map(({ run: [from, to], points }) => `${trace(points)}L${edge(to)},${height}L${edge(from)},${height}Z`).join(""));
      singles.current.get(line.key)?.setAttribute("d", parts.filter(({ run: [from, to] }) => from === to).map(({ points }) => trace(points.slice(0, 1)) + "h0").join(""));
      const group = groups.current.get(line.key);
      if (group) group.style.opacity = String(p);
      const dot = dots.current.get(line.key);
      if (dot && track.shape.length) {
        const onLine = track.runs.some(([from, to]) => at >= from - EDGE && at <= to + EDGE);
        dot.style.opacity = onLine ? "" : "0";
        const cy = y(valueAt(track.shape, at));
        dot.setAttribute("cx", (at * w).toFixed(1));
        dot.setAttribute("cy", cy.toFixed(1));
        if (p > 0.5 && onLine) dotYs.push(cy);
      }
    }
    clip.current?.setAttribute("width", String(drawn.get() * (w + 16)));
    const cx = Math.round(at * w) + 0.5;
    crosshair.current?.setAttribute("x1", String(cx));
    crosshair.current?.setAttribute("x2", String(cx));
    const { w: tw, h: th } = tipSize.current;
    let x = cx + GAP;
    if (x + tw > w) x = cx - GAP - tw;
    tipTargetX.set(clamp(x, 0, Math.max(0, w - tw)));
    const middle = dotYs.length ? dotYs.reduce((sum, value) => sum + value, 0) / dotYs.length : height / 2;
    tipTargetY.set(clamp(middle - th / 2, 0, Math.max(0, height - th)));
  }, [cursor, drawn, height, scale.max, scale.min, tipTargetX, tipTargetY]);
  useMotionValueEvent(cursor, "change", paint);
  useMotionValueEvent(drawn, "change", paint);
  useMotionValueEvent(scale.min, "change", paint);
  useMotionValueEvent(scale.max, "change", paint);
  useLayoutEffect(paint);
  useLayoutEffect(() => {
    const node = plot.current, bubble = tip.current;
    if (!node) return;
    const read = () => {
      width.current = node.clientWidth;
      setPlotWidth(node.clientWidth);
      if (bubble) tipSize.current = { w: bubble.offsetWidth, h: bubble.offsetHeight };
      paint();
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    if (bubble) observer.observe(bubble);
    return () => observer.disconnect();
  }, [paint]);
  const morph = useRef(null);
  useEffect(() => {
    const moves = [];
    for (const [key, target] of targets) {
      const track = tracks.current.get(key);
      if (!track) {
        tracks.current.set(key, { ...target, presence: live.current.hidden.includes(key) ? 0 : 1, fade: null });
        continue;
      }
      if (!track.shape.length || !target.shape.length || reduced) {
        update(track, target);
        continue;
      }
      const xs = [.../* @__PURE__ */ new Set([...grid, ...target.shape.map(([x]) => x)])].sort((a, b) => a - b);
      moves.push({ track, xs, from: xs.map((x) => valueAt(track.shape, x)), to: xs.map((x) => valueAt(target.shape, x)), target: target.shape });
      update(track, { runs: target.runs });
    }
    morph.current?.stop();
    if (!moves.length) {
      paint();
      return;
    }
    morph.current = animate(0, 1, { ...settle, restDelta: 5e-4, onUpdate: (progress) => {
      for (const move of moves) update(move.track, { shape: move.xs.map((x, at) => [x, move.from[at] + (move.to[at] - move.from[at]) * progress]) });
      paint();
    }, onComplete: () => {
      for (const move of moves) update(move.track, { shape: move.target });
      paint();
    } });
    return () => morph.current?.stop();
  }, [paint, reduced, targets]);
  const hiddenKey = hidden.join("|");
  useEffect(() => {
    for (const [key, track] of tracks.current) {
      const to = hidden.includes(key) ? 0 : 1;
      if (track.presence === to) continue;
      track.fade?.stop();
      if (reduced) {
        update(track, { presence: to });
        continue;
      }
      update(track, { fade: animate(track.presence, to, { ...settle, onUpdate: (value) => {
        update(track, { presence: value });
        paint();
      } }) });
    }
    paint();
  }, [hiddenKey, paint, reduced]);
  useEffect(() => {
    if (reduced) {
      scale.min.jump(steady.min);
      scale.max.jump(steady.max);
      return;
    }
    const controls = [animate(scale.min, steady.min, settle), animate(scale.max, steady.max, settle)];
    return () => controls.forEach((control) => control.stop());
  }, [reduced, scale.max, scale.min, steady]);
  useEffect(() => {
    if (empty) return;
    if (reduced) {
      drawn.jump(1);
      return;
    }
    if (!inView || drawn.get() >= 1) return;
    const controls = animate(drawn, 1, draw);
    return () => controls.stop();
  }, [drawn, empty, inView, reduced]);
  const wasScrubbing = useRef(false);
  useEffect(() => {
    if (index === null) {
      wasScrubbing.current = false;
      return;
    }
    const to = last > 0 ? index / last : 0.5;
    if (reduced || !wasScrubbing.current) {
      cursor.jump(to);
      tipSpringX.jump(tipTargetX.get());
      tipSpringY.jump(tipTargetY.get());
    }
    wasScrubbing.current = true;
    if (reduced) return;
    const controls = animate(cursor, to, glide);
    return () => controls.stop();
  }, [cursor, index, last, reduced, tipSpringX, tipSpringY, tipTargetX, tipTargetY]);
  const onActive = useRef(onActiveChange);
  useLayoutEffect(() => {
    onActive.current = onActiveChange;
  });
  useEffect(() => {
    onActive.current?.(index, index === null ? null : data[index] ?? null);
  }, [index]);
  const pointAt = (clientX) => {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect?.width || last < 1) return Math.max(0, last);
    return clamp(Math.round((clientX - rect.left) / rect.width * last), 0, last);
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape" && scrubbing) {
      event.preventDefault();
      setActive(null);
      return;
    }
    const from = index ?? last + 1, page = Math.max(1, Math.round(data.length / 6));
    const next = { ArrowLeft: from - 1, ArrowDown: from - 1, ArrowRight: index === null ? last : from + 1, ArrowUp: index === null ? last : from + 1, PageDown: from - page, PageUp: from + page, Home: 0, End: last }[event.key];
    if (next === void 0 || empty) return;
    event.preventDefault();
    setActive(clamp(next, 0, last));
  };
  const onPointerDown = (event) => {
    if (empty) return;
    if (event.pointerType !== "mouse") event.currentTarget.setPointerCapture?.(event.pointerId);
    setActive(pointAt(event.clientX));
  };
  const onPointerMove = (event) => {
    if (!empty && (event.pointerType === "mouse" || event.buttons)) setActive(pointAt(event.clientX));
  };
  const format = (value, line) => value === null ? NO_VALUE : `${formatValue ? formatValue(value, line) : grouped.format(value)}${unit ? ` ${unit}` : ""}`;
  const reading = index === null ? null : data[index];
  const valueText = reading ? `${reading.label}: ${visible.map((line) => `${line.label} ${format(valueOf(reading, line.key), line)}`).join(", ")}` : empty ? emptyLabel : `${visible.length} of ${series.length} series shown`;
  const summary = empty ? `${label}. ${emptyLabel}.` : `${label}, ${data[0].label} to ${data[last].label}. ${visible.map((line) => `${line.label}, latest ${format(valueOf(data[last], line.key), line)}`).join(". ")}.`;
  const picks = axisPicks(data, plotWidth);
  const allHidden = !empty && visible.length === 0;
  const shown = reading ?? data[last];
  const tipX = reduced ? tipTargetX : tipSpringX, tipY = reduced ? tipTargetY : tipSpringY;
  return <figure ref={figure} className={[styles.figure, className].filter(Boolean).join(" ")} aria-label={label} aria-busy={loading || void 0}>
    {showLegend && <div className={styles.legend} role="group" aria-label={`${label} series`}>
      {series.map((line, at) => <button key={line.key} type="button" className={styles.toggle} aria-pressed={!hidden.includes(line.key)} onClick={() => toggle(line.key)} style={{ "--series": colorOf(line, at) }}>
        <span className={styles.swatch} data-dashed={line.dashed || void 0} aria-hidden="true" />
        <span className={styles.toggleLabel}>{line.label}</span>
      </button>)}
    </div>}
    <div className={styles.chart} data-scrubbing={scrubbing || void 0} data-loading={loading || void 0}>
      <div
    ref={plot}
    className={styles.plot}
    style={{ height }}
    role="slider"
    tabIndex={empty ? -1 : 0}
    aria-label={`${label}, explore by ${categoryLabel.toLowerCase()}`}
    aria-orientation="horizontal"
    aria-valuemin={1}
    aria-valuemax={Math.max(1, data.length)}
    aria-valuenow={(index ?? last) + 1}
    aria-valuetext={valueText}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={(event) => {
      if (event.pointerType !== "mouse") setActive(null);
    }}
    onPointerCancel={() => setActive(null)}
    onPointerLeave={(event) => {
      if (event.pointerType === "mouse") setActive(null);
    }}
    onKeyDown={onKeyDown}
    onBlur={() => setActive(null)}
    onFocus={(event) => {
      if (event.currentTarget.matches(":focus-visible") && !empty) setActive((current) => current ?? last);
    }}
  >
        <svg className={styles.svg} width="100%" height={height} aria-hidden="true" focusable="false">
          <defs><clipPath id={`${uid}-draw`} clipPathUnits="userSpaceOnUse"><rect ref={clip} x={-8} y={-16} width={0} height={height + 32} /></clipPath></defs>
          <AnimatePresence initial={false}>{steady.ticks.slice(1).map((value) => <Gridline key={value} value={value} scale={scale} height={height} />)}</AnimatePresence>
          <line className={styles.baseline} x1={0} x2="100%" y1={height - 0.5} y2={height - 0.5} />
          <line ref={crosshair} className={styles.crosshair} y1={TOP - 4} y2={height} />
          <g className={styles.series} clipPath={`url(#${uid}-draw)`}>
            {series.map((line, at) => <g key={line.key} ref={(node) => {
    if (node) groups.current.set(line.key, node);
    else groups.current.delete(line.key);
  }} style={{ "--series": colorOf(line, at) }}>
              {(line.area ?? at === 0) && <path ref={(node) => {
    if (node) areas.current.set(line.key, node);
    else areas.current.delete(line.key);
  }} className={styles.area} />}
              <path ref={(node) => {
    if (node) lines.current.set(line.key, node);
    else lines.current.delete(line.key);
  }} className={styles.line} data-dashed={line.dashed || void 0} />
              <path ref={(node) => {
    if (node) singles.current.set(line.key, node);
    else singles.current.delete(line.key);
  }} className={styles.single} />
            </g>)}
          </g>
          {series.map((line, at) => <circle key={line.key} ref={(node) => {
    if (node) dots.current.set(line.key, node);
    else dots.current.delete(line.key);
  }} className={styles.dot} r={4} data-hidden={hidden.includes(line.key) || void 0} style={{ "--series": colorOf(line, at) }} />)}
        </svg>
        <motion.div ref={tip} className={styles.tooltip} style={{ x: tipX, y: tipY }} aria-hidden="true">
          <p className={styles.tipTitle}>{shown?.label ?? ""}</p>
          {visible.map((line) => {
    const value = shown ? valueOf(shown, line.key) : 0;
    return <p key={line.key} className={styles.tipRow} style={{ "--series": colorOf(line, series.indexOf(line)) }}>
              <span className={styles.tipSwatch} data-dashed={line.dashed || void 0} />
              <span className={styles.tipName}>{line.label}</span>
              <span className={styles.tipValue} data-empty={value === null || void 0}>{format(value, line)}</span>
            </p>;
  })}
        </motion.div>
        <AnimatePresence initial={false}>
          {(empty || allHidden) && !loading && <motion.p key={empty ? "empty" : "hidden"} className={styles.message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeFast }}>{empty ? emptyLabel : "Choose a series to show"}</motion.p>}
          {loading && empty && <motion.span key="skeleton" className={styles.skeleton} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeFast }} aria-hidden="true" />}
        </AnimatePresence>
      </div>
      <div className={styles.gutter} aria-hidden="true">
        <AnimatePresence initial={false}>{steady.ticks.map((value) => <TickLabel key={value} value={value} scale={scale} height={height} format={formatTick} />)}</AnimatePresence>
      </div>
      <div className={styles.axis} aria-hidden="true">
        <AnimatePresence initial={false}>
          {picks.map((at) => {
    const share = last > 0 ? at / last : 0.5;
    return <motion.span key={`${data[at].key}:${data[at].axisLabel}`} className={styles.axisLabel} style={{ left: `${share * 100}%`, translateX: `${-share * 100}%` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeFast }} transition={{ duration: duration.standard, ease: [...ease.standard] }}>{data[at].axisLabel}</motion.span>;
  })}
        </AnimatePresence>
      </div>
    </div>
    <p className={styles.srOnly}>{summary}</p>
    {!empty && <table className={styles.srOnly}>
      <caption>{label}</caption>
      <thead><tr><th scope="col">{categoryLabel}</th>{series.map((line) => <th key={line.key} scope="col">{line.label}</th>)}</tr></thead>
      <tbody>{data.map((item) => <tr key={item.key}><th scope="row">{item.label}</th>{series.map((line) => <td key={line.key}>{format(valueOf(item, line.key), line)}</td>)}</tr>)}</tbody>
    </table>}
    <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{loading ? "Loading" : ""}</p>
  </figure>;
}
export default LineChart;
