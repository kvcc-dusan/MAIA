import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./slider.module.css";
const { spring, duration, blur } = motionTokens;
const enterEase = [...motionTokens.ease.enter];
const exitEase = [...motionTokens.ease.standard];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const physical = ({ visualDuration, bounce }) => {
  const root = 2 * Math.PI / (visualDuration * 1.2);
  return { type: "spring", stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta: 2e-3, restSpeed: 0.02 };
};
const thumbSpring = physical(spring.snappy);
const kickSpring = physical(spring.morph);
const STRETCH = 9, BUMP_PX = 150, SNAP_PX = 12;
const rubber = (distance, limit = STRETCH) => Math.sign(distance) * (1 - 1 / (Math.abs(distance) * 0.55 / limit + 1)) * limit;
const project = (velocity) => velocity * 0.099;
const decimalsOf = (value) => (String(value).split(".")[1] ?? "").length;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const isDigit = (char) => char >= "0" && char <= "9";
function partsOf(text) {
  const chars = [...text];
  const first = chars.findIndex(isDigit);
  const last = chars.length - 1 - [...chars].reverse().findIndex(isDigit);
  let place = chars.filter(isDigit).length;
  return chars.map((char, index) => {
    if (first < 0 || index < first) return { key: `p${index}${char}`, text: char };
    if (index > last) return { key: `s${chars.length - index}${char}`, text: char };
    if (isDigit(char)) return { key: `d${--place}`, digit: Number(char) };
    return { key: `g${place}${char}`, text: char };
  });
}
const slot = {
  enter: (direction) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * 0.3}em`, filter: `blur(${blur.soft}px)` }),
  center: { width: "auto", scale: 1, opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" }, transition: { width: spring.morph, scale: spring.morph, opacity: spring.morph, y: spring.snappy, filter: { duration: duration.standard, ease: enterEase } } },
  exit: (direction) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * -0.3}em`, filter: `blur(${blur.subtle}px)`, transition: { width: spring.smooth, scale: spring.smooth, y: { duration: duration.fast, ease: exitEase }, opacity: { duration: duration.instant }, filter: { duration: duration.instant } } })
};
const still = { enter: { width: "auto", scale: 1, opacity: 0, y: 0, filter: "none" }, center: { width: "auto", scale: 1, opacity: 1, y: 0, filter: "none", transition: { duration: duration.instant } }, exit: { width: 0, opacity: 0, transition: { duration: 0 } } };
function Glyph({ position, digit }) {
  const offset = (current) => ((digit - current) % 10 + 15) % 10 - 5;
  const y = useTransform(position, (current) => `${offset(current) * 1.05}em`);
  const opacity = useTransform(position, (current) => Math.max(0, 1 - Math.abs(offset(current)) ** 1.5 * 1.1));
  const visibility = useTransform(position, (current) => Math.abs(offset(current)) >= 1 ? "hidden" : "visible");
  const filter = useTransform(position, (current) => {
    const distance = Math.abs(offset(current));
    return distance < 0.02 || distance >= 1 ? "none" : `blur(${(distance * blur.soft * 0.75).toFixed(2)}px)`;
  });
  return <motion.span className={styles.glyph} style={{ y, opacity, filter, visibility }}>{digit}</motion.span>;
}
function Wheel({ digit, direction }) {
  const reduced = useReducedMotion();
  const position = useMotionValue(digit);
  const wheel = useRef({ digit, target: digit });
  useLayoutEffect(() => {
    const state = wheel.current;
    if (state.digit === digit) return;
    state.target += direction > 0 ? (digit - state.digit + 10) % 10 : -((state.digit - digit + 10) % 10);
    state.digit = digit;
    if (reduced) position.jump(state.target);
    else animate(position, state.target, thumbSpring);
  }, [digit, direction, position, reduced]);
  return <><span className={styles.sizer}>0</span>{DIGITS.map((item) => <Glyph key={item} position={position} digit={item} />)}</>;
}
function RollingNumber({ value, text }) {
  const reduced = useReducedMotion();
  const [trail, setTrail] = useState({ value, direction: 1 });
  if (trail.value !== value) setTrail({ value, direction: value > trail.value ? 1 : -1 });
  const direction = trail.value === value ? trail.direction : value > trail.value ? 1 : -1;
  return <span className={styles.number}><AnimatePresence initial={false} custom={direction}>{partsOf(text).map((part) => <motion.span key={part.key} className={"digit" in part ? styles.column : styles.symbol} custom={direction} variants={reduced ? still : slot} initial="enter" animate="center" exit="exit">
    {"digit" in part ? <Wheel digit={part.digit} direction={direction} /> : part.text}
  </motion.span>)}</AnimatePresence></span>;
}
const bubbleIn = { opacity: 0, scale: 0.6, y: 6, filter: `blur(${blur.subtle}px)` };
const bubbleRest = { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } };
const bubbleOut = { opacity: 0, scale: 0.8, y: 4, filter: `blur(${blur.subtle}px)`, transition: { duration: duration.instant, ease: exitEase } };
const bubbleEnter = { ...spring.snappy, opacity: { duration: duration.fast, ease: enterEase }, filter: { duration: duration.fast, ease: enterEase } };
function Thumb({ quiet, index, shown, value, text, low, high, ariaLabel, labelledBy, active, lifted, bubble, disabled, onKeyDown, onFocus, onBlur }) {
  const reduced = useReducedMotion();
  const x = useTransform(shown, (current) => `${current - 100}%`);
  return <motion.div className={styles.thumbLayer} style={{ x, zIndex: active ? 2 : 1 }}>
    <motion.div
    role="slider"
    data-thumb=""
    data-index={index}
    data-active={lifted || void 0}
    data-quiet={quiet || void 0}
    className={styles.thumb}
    tabIndex={disabled ? -1 : 0}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabel ? void 0 : labelledBy}
    aria-valuemin={low}
    aria-valuemax={high}
    aria-valuenow={value}
    aria-valuetext={text}
    aria-orientation="horizontal"
    aria-disabled={disabled || void 0}
    initial={false}
    animate={{ scale: lifted ? 1.16 : 1 }}
    transition={reduced ? { duration: 0 } : spring.snappy}
    onKeyDown={onKeyDown}
    onFocus={onFocus}
    onBlur={onBlur}
  />
    <motion.span className={styles.bubbleAnchor} style={{ "--at": shown }}>
      <AnimatePresence>{bubble && <motion.span key="bubble" className={styles.bubble} aria-hidden="true" initial={reduced ? { opacity: 0 } : bubbleIn} animate={bubbleRest} exit={reduced ? { opacity: 0, transition: { duration: duration.instant } } : bubbleOut} transition={reduced ? { duration: duration.instant } : bubbleEnter}>
        <RollingNumber value={value} text={text} />
      </motion.span>}</AnimatePresence>
    </motion.span>
  </motion.div>;
}
export function Slider({ label, value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step: stepProp = 1, largeStep, marks, minStepsBetweenThumbs = 0, format, showValue = true, thumbLabels, start, end, name, disabled, className }) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const step = stepProp > 0 ? stepProp : 1;
  const span = max - min || 1;
  const isRange = Array.isArray(value ?? defaultValue);
  const toArray = (input) => input === void 0 ? [min, max].slice(0, isRange ? 2 : 1) : Array.isArray(input) ? [input[0], input[1]] : [input];
  const [internal, setInternal] = useState(() => toArray(defaultValue));
  const values = value === void 0 ? internal : toArray(value);
  const decimals = Math.max(decimalsOf(step), decimalsOf(min));
  const formatValue = format ?? ((input) => input.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  const gap = isRange ? minStepsBetweenThumbs * step : 0;
  const pct = (input) => (input - min) / span * 100;
  const valueAt = (percent) => min + percent / 100 * span;
  const snap = (input) => Number((min + Math.round((input - min) / step) * step).toFixed(decimals));
  const lowOf = (index, current) => index === 1 ? current[0] + gap : min;
  const highOf = (index, current) => index === 0 && isRange ? current[1] - gap : max;
  const settle = (index, input, current) => clamp(snap(clamp(input, min, max)), lowOf(index, current), highOf(index, current));
  const trackRef = useRef(null);
  const thumbsRef = useRef(null);
  const latest = useRef(values);
  const goal = useRef(values.map(pct));
  const drag = useRef(null);
  const pointerFocus = useRef(false);
  const lingerTimer = useRef(void 0);
  const [dragging, setDragging] = useState(null);
  const [keyFocus, setKeyFocus] = useState(null);
  const [linger, setLinger] = useState(null);
  const [lastActive, setLastActive] = useState(isRange ? 1 : 0);
  const [quiet, setQuiet] = useState(null);
  const pos0 = useMotionValue(pct(values[0])), pos1 = useMotionValue(pct(values[1] ?? values[0]));
  const lag0 = useMotionValue(0), lag1 = useMotionValue(0);
  const shown0 = useTransform(() => pos0.get() + lag0.get());
  const shown1 = useTransform(() => pos1.get() + lag1.get());
  const clipPath = useTransform(() => {
    const from = isRange ? clamp(shown0.get(), 0, 100) : 0;
    const to = clamp((isRange ? shown1 : shown0).get(), 0, 100);
    return `inset(0 ${(100 - to).toFixed(3)}% 0 ${from.toFixed(3)}% round 999px)`;
  });
  const thumbs = [{ pos: pos0, lag: lag0, shown: shown0 }, { pos: pos1, lag: lag1, shown: shown1 }];
  const emit = (next) => isRange ? [next[0], next[1]] : next[0];
  function commit(index, next) {
    const current = latest.current;
    if (current[index] === next) return;
    const updated = current.map((item, at) => at === index ? next : item);
    latest.current = updated;
    if (value === void 0) setInternal(updated);
    onValueChange?.(emit(updated));
  }
  useLayoutEffect(() => {
    latest.current = values;
    values.forEach((item, index) => {
      const target = pct(item), thumb = thumbs[index];
      if (drag.current?.index === index || goal.current[index] === target) return;
      goal.current[index] = target;
      const from = thumb.pos.get() + thumb.lag.get();
      thumb.lag.jump(0);
      thumb.pos.jump(from);
      if (reduced) thumb.pos.jump(target);
      else animate(thumb.pos, target, thumbSpring);
    });
  });
  useEffect(() => () => window.clearTimeout(lingerTimer.current), []);
  const thumbNode = (index) => thumbsRef.current?.querySelector(`[data-index="${index}"]`);
  function focusFromPointer(index) {
    const node = thumbNode(index);
    if (!node || document.activeElement === node) return;
    setQuiet(index);
    pointerFocus.current = true;
    node.focus({ preventScroll: true });
    pointerFocus.current = false;
  }
  const trackWidth = () => trackRef.current?.getBoundingClientRect().width || 1;
  function nearest(at, current) {
    if (!isRange) return 0;
    const low = Math.abs(at - pct(current[0])), high = Math.abs(at - pct(current[1]));
    return low === high ? at < pct(current[0]) ? 0 : 1 : low < high ? 0 : 1;
  }
  function holdBubble(index) {
    window.clearTimeout(lingerTimer.current);
    setLinger(index);
    lingerTimer.current = window.setTimeout(() => setLinger(null), 700);
  }
  function begin(state, index, at, press) {
    const thumb = thumbs[index];
    const from = thumb.pos.get() + thumb.lag.get();
    state.index = index;
    state.grab = press ? 0 : at - from;
    thumb.lag.jump(0);
    thumb.pos.jump(from);
    setDragging(index);
    setLastActive(index);
    window.clearTimeout(lingerTimer.current);
    setLinger(null);
    focusFromPointer(index);
    if (press) follow(state, at, 0, true);
  }
  function follow(state, at, time, press = false) {
    const index = state.index;
    if (index === null) return;
    const thumb = thumbs[index], current = latest.current, width = trackWidth();
    const raw = at - state.grab;
    const low = pct(lowOf(index, current)), high = pct(highOf(index, current));
    const edge = clamp(raw, low, high);
    const placed = reduced ? edge : edge + rubber((raw - edge) / 100 * width) / width * 100;
    if (press && !reduced) {
      const from = thumb.pos.get();
      thumb.pos.jump(placed);
      thumb.lag.jump(from - placed);
      animate(thumb.lag, 0, thumbSpring);
    } else thumb.pos.set(placed);
    state.raw = raw;
    state.samples.push({ t: time, p: placed });
    if (state.samples.length > 6) state.samples.shift();
    commit(index, settle(index, valueAt(raw), current));
  }
  function onPointerDown(event) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const at = (event.clientX - rect.left) / (rect.width || 1) * 100;
    const grabbed = event.target.closest("[data-thumb]");
    const current = latest.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    const state = { pointer: event.pointerId, index: null, grab: 0, x: event.clientX, raw: at, samples: [] };
    drag.current = state;
    if (grabbed && isRange && current[0] === current[1]) {
      focusFromPointer(Number(grabbed.dataset.index));
      return;
    }
    begin(state, grabbed ? Number(grabbed.dataset.index) : nearest(at, current), at, !grabbed);
    state.samples = [{ t: event.timeStamp, p: thumbs[state.index ?? 0].pos.get() }];
  }
  function onPointerMove(event) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const at = (event.clientX - rect.left) / (rect.width || 1) * 100;
    if (state.index === null) {
      const dx = event.clientX - state.x;
      if (Math.abs(dx) < 2) return;
      begin(state, dx < 0 ? 0 : 1, at - dx / (rect.width || 1) * 100, false);
    }
    follow(state, at, event.timeStamp);
  }
  function onPointerEnd(event) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    const index = state.index;
    if (index === null) return;
    const thumb = thumbs[index], current = latest.current, width = trackWidth();
    const samples = state.samples, first = samples[0], last = samples[samples.length - 1];
    const elapsed = last && first ? (last.t - first.t) / 1e3 : 0;
    const velocity = (last && first && elapsed > 8e-3 && event.timeStamp - last.t < 60 ? (last.p - first.p) / elapsed : 0) + thumb.lag.getVelocity();
    const stepPct = step / span * 100;
    const carry = event.type === "pointerup" && stepPct / 100 * width >= SNAP_PX ? clamp(project(velocity), -stepPct, stepPct) : 0;
    const next = settle(index, valueAt(state.raw + carry), current);
    const from = thumb.pos.get() + thumb.lag.get(), target = pct(next);
    thumb.lag.jump(0);
    thumb.pos.jump(from);
    goal.current[index] = target;
    if (reduced) thumb.pos.jump(target);
    else animate(thumb.pos, target, { ...thumbSpring, velocity });
    commit(index, next);
    setDragging(null);
    holdBubble(index);
    onValueCommit?.(emit(latest.current));
  }
  function onKeyDown(index, event) {
    if (disabled) return;
    const current = latest.current, now = current[index];
    const large = largeStep ?? Math.max(step, snap(min + span / 10) - min);
    const moves = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: large, PageDown: -large };
    let wanted;
    if (event.key === "Home") wanted = lowOf(index, current);
    else if (event.key === "End") wanted = highOf(index, current);
    else if (event.key in moves) wanted = now + (event.shiftKey && /^Arrow/.test(event.key) ? Math.sign(moves[event.key]) * large : moves[event.key]);
    else return;
    event.preventDefault();
    setKeyFocus(index);
    setQuiet(null);
    setLastActive(index);
    const next = settle(index, wanted, current);
    if (next === now) {
      const toward = Math.sign(wanted - now);
      if (toward && !reduced) animate(thumbs[index].pos, goal.current[index], { ...kickSpring, velocity: toward * BUMP_PX / trackWidth() * 100 });
      return;
    }
    commit(index, next);
    onValueCommit?.(emit(latest.current));
  }
  function jumpTo(target) {
    if (disabled) return;
    const current = latest.current, index = nearest(pct(target), current);
    const next = settle(index, target, current);
    setLastActive(index);
    focusFromPointer(index);
    if (next === current[index]) return;
    commit(index, next);
    onValueCommit?.(emit(latest.current));
  }
  const markList = (marks ?? []).map((mark) => typeof mark === "number" ? { value: mark } : mark).filter((mark) => mark.value >= min && mark.value <= max);
  const ticks = markList.filter((mark) => mark.value > min && mark.value < max);
  const labelled = markList.filter((mark) => mark.label);
  const inRange = (mark) => isRange ? mark >= values[0] && mark <= values[1] : mark <= values[0];
  const names = thumbLabels ?? [`${label}, minimum`, `${label}, maximum`];
  return <div className={[styles.root, className].filter(Boolean).join(" ")} data-disabled={disabled || void 0} data-dragging={dragging !== null || void 0} data-marks={labelled.length > 0 || void 0}>
    <div className={styles.header}>
      <span id={labelId} className={styles.label}>{label}</span>
      {showValue && <span className={styles.readout} aria-hidden="true">
        <RollingNumber value={values[0]} text={formatValue(values[0])} />
        {isRange && <><span className={styles.dash}>–</span><RollingNumber value={values[1]} text={formatValue(values[1])} /></>}
      </span>}
    </div>
    <div className={styles.body}>
      {start && <div className={styles.start}>{start}</div>}
      <div className={styles.control} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd} onMouseDown={(event) => event.preventDefault()}>
        <div ref={trackRef} className={styles.track}>
          {ticks.map((mark) => <span key={mark.value} className={styles.tick} style={{ left: `${pct(mark.value)}%` }} />)}
          <motion.div className={styles.fill} style={{ clipPath }}>{ticks.map((mark) => <span key={mark.value} className={styles.tick} style={{ left: `${pct(mark.value)}%` }} />)}</motion.div>
        </div>
        <div ref={thumbsRef} className={styles.thumbs}>
          {values.map((item, index) => <Thumb
    key={index}
    quiet={quiet === index}
    index={index}
    shown={thumbs[index].shown}
    value={item}
    text={formatValue(item)}
    low={lowOf(index, values)}
    high={highOf(index, values)}
    ariaLabel={isRange ? names[index] : void 0}
    labelledBy={labelId}
    active={lastActive === index}
    lifted={dragging === index}
    bubble={dragging === index || keyFocus === index || linger === index}
    disabled={disabled}
    onKeyDown={(event) => onKeyDown(index, event)}
    onFocus={(event) => {
      if (!pointerFocus.current && event.currentTarget.matches(":focus-visible")) setKeyFocus(index);
    }}
    onBlur={() => {
      setKeyFocus((current) => current === index ? null : current);
      setQuiet((current) => current === index ? null : current);
    }}
  />)}
        </div>
      </div>
      {end && <div className={styles.end}>{end}</div>}
      {labelled.length > 0 && <div className={styles.marks} aria-hidden="true">
        {labelled.map((mark) => <span key={mark.value} className={styles.markLabel} data-on={inRange(mark.value) || void 0} data-edge={mark.value === min ? "start" : mark.value === max ? "end" : void 0} style={{ left: `${pct(mark.value)}%` }} onClick={() => jumpTo(mark.value)}>{mark.label}</span>)}
      </div>}
    </div>
    {name && values.map((item, index) => <input key={index} type="hidden" name={name} value={item} disabled={disabled} />)}
  </div>;
}
export default Slider;
