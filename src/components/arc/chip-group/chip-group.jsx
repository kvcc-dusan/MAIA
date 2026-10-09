import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./chip-group.module.css";
const MORE = "\0more";
const standard = [...motionTokens.ease.standard];
const enterEase = [...motionTokens.ease.enter];
const fade = { duration: motionTokens.duration.fast, ease: standard };
const reducedFade = { duration: 0.15, ease: standard };
const exitFast = { duration: motionTokens.duration.fast, ease: standard };
const shown = { opacity: 1, y: "0em", scale: 1, filter: "blur(0px)" };
const textIn = { opacity: 0, y: "0.3em", filter: `blur(${motionTokens.blur.soft}px)` };
const textOut = { opacity: 0, y: "-0.3em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: exitFast };
function useWidthLag(node, key, reduce) {
  const lag = useMotionValue(0);
  const width = useRef(null);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const next = element.offsetWidth, previous = width.current;
    width.current = next;
    if (previous === null || previous === next) return;
    if (reduce) {
      lag.jump(0);
      return;
    }
    const velocity = lag.getVelocity();
    lag.jump(lag.get() + previous - next);
    animate(lag, 0, { ...motionTokens.spring.morph, velocity });
  }, [key, lag, node, reduce]);
  useEffect(() => {
    const element = node.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      width.current = element.offsetWidth;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [node]);
  return lag;
}
function HeightFrame({ morphKey, reduce, children }) {
  const frame = useRef(null);
  const content = useRef(null);
  const height = useMotionValue("auto");
  const changedAt = useRef(0);
  const last = useRef(void 0);
  const animating = useRef(false);
  useLayoutEffect(() => {
    changedAt.current = performance.now();
    const node = frame.current;
    if (reduce || !node || last.current === void 0) return;
    const current = height.get();
    const from = typeof current === "number" ? current : last.current;
    height.jump(from);
    Object.assign(node.style, { overflow: "clip", height: `${from}px`, minHeight: `${from}px` });
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (animating.current) return;
        height.jump("auto");
        if (frame.current) Object.assign(frame.current.style, { overflow: "", height: "auto", minHeight: "" });
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [morphKey, reduce, height]);
  useEffect(() => {
    const node = content.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let controls;
    const settle = () => {
      animating.current = false;
      height.jump("auto");
      if (frame.current) Object.assign(frame.current.style, { overflow: "", height: "auto", minHeight: "" });
    };
    const unfollow = height.on("change", (value) => {
      if (frame.current) frame.current.style.minHeight = typeof value === "number" ? `${value}px` : "";
    });
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight;
      const current = height.get();
      const from = typeof current === "number" ? current : last.current;
      last.current = next;
      controls?.stop();
      if (reduce || from === void 0 || Math.abs(from - next) < 0.5 || performance.now() - changedAt.current > 160) return settle();
      if (frame.current) Object.assign(frame.current.style, { overflow: "clip", height: `${from}px`, minHeight: `${from}px` });
      animating.current = true;
      controls = animate(height, [from, next], { ...motionTokens.spring.smooth, onComplete: settle });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      unfollow();
      controls?.stop();
    };
  }, [height, reduce]);
  return <motion.div ref={frame} className={styles.frame} style={{ height }}>
    <div ref={content} className={styles.content}>{children}</div>
  </motion.div>;
}
function Swap({ follow, style, ...props }) {
  const present = useIsPresent();
  const held = useMotionValue(0);
  useLayoutEffect(() => {
    if (!present && follow) held.jump(follow.get());
  }, [present, follow, held]);
  return <motion.span {...props} style={follow ? { ...style, x: present ? follow : held } : style} aria-hidden={present ? props["aria-hidden"] : true} />;
}
const SLOT = 18;
function Chip({ option, selected, tabbable, reduce, delay, onToggle, onFocusChip, ref }) {
  const present = useIsPresent();
  const body = useRef(null);
  const lag = useWidthLag(body, String(selected), reduce);
  const slot = useRef(selected ? SLOT : 0);
  const grown = useMotionValue(selected ? 1 : 0);
  const edge = useTransform(lag, (value) => -value);
  const checkScale = useTransform(grown, (value) => Math.min(value, 1.1));
  const checkOpacity = useTransform(grown, (value) => Math.min(1, value * 1.4));
  const checkBlur = useTransform(grown, (value) => value >= 1 ? "none" : `blur(${((1 - value) * motionTokens.blur.subtle).toFixed(2)}px)`);
  const checkDraw = useTransform(grown, (value) => Math.min(1, Math.max(1e-3, value)));
  useLayoutEffect(() => {
    slot.current = selected ? SLOT : 0;
    const update = () => grown.set(Math.max(0, (slot.current + lag.get()) / SLOT));
    update();
    return lag.on("change", update);
  }, [selected, lag, grown]);
  const enter = reduce ? { layout: { duration: 0 }, default: reducedFade } : { layout: motionTokens.spring.morph, default: { ...motionTokens.spring.snappy, delay }, opacity: { ...fade, delay } };
  return <motion.button
    ref={ref}
    type="button"
    className={styles.chip}
    data-chip={option.value}
    aria-pressed={selected}
    aria-hidden={present ? void 0 : true}
    tabIndex={present && tabbable ? 0 : -1}
    onClick={() => onToggle(option.value)}
    onFocus={() => onFocusChip(option.value)}
    layout="position"
    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={reduce ? { opacity: 0, transition: reducedFade } : { opacity: 0, scale: 0.9, transition: { duration: motionTokens.duration.instant, ease: standard } }}
    transition={enter}
  >
    <span ref={body} className={styles.body} data-selected={selected}>
      <motion.span className={styles.surface} style={{ right: edge }} aria-hidden="true" />
      <motion.span className={styles.check} style={{ scale: checkScale, opacity: checkOpacity, filter: checkBlur }} aria-hidden="true"><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><motion.path d="M4 12.5 9.5 18 20 6.5" style={{ pathLength: checkDraw }} /></svg></motion.span>
      <span className={styles.slot} aria-hidden="true" />
      <motion.span className={styles.label} style={{ x: lag }}>{option.label}</motion.span>
    </span>
  </motion.button>;
}
function MoreChip({ hidden, expanded, tabbable, reduce, onToggle, onFocusChip, ref }) {
  const body = useRef(null);
  const text = expanded ? "Show less" : `+${hidden} more`;
  const lag = useWidthLag(body, text, reduce);
  const edge = useTransform(lag, (value) => -value);
  const centre = useTransform(lag, (value) => value / 2);
  return <motion.button
    ref={ref}
    type="button"
    className={`${styles.chip} ${styles.more}`}
    data-more=""
    aria-expanded={expanded}
    tabIndex={tabbable ? 0 : -1}
    onClick={onToggle}
    onFocus={() => onFocusChip(MORE)}
    layout="position"
    transition={{ layout: reduce ? { duration: 0 } : motionTokens.spring.morph }}
  >
    <span ref={body} className={styles.body}>
      <motion.span className={styles.surface} style={{ right: edge }} aria-hidden="true" />
      <span className={styles.moreText}>
        <AnimatePresence mode="popLayout" initial={false}>
          <Swap key={text} follow={centre} className={styles.moreLine} initial={reduce ? { opacity: 0 } : textIn} animate={shown} exit={reduce ? { opacity: 0, transition: reducedFade } : textOut} transition={reduce ? reducedFade : { duration: motionTokens.duration.standard, ease: enterEase }}>{text}</Swap>
        </AnimatePresence>
      </span>
    </span>
  </motion.button>;
}
export function ChipGroup({ options, value, onValueChange, label, multiple = true, maxVisible = Infinity, className }) {
  const id = useId();
  const reduce = !!useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(value);
  const [active, setActive] = useState(null);
  const foldable = options.length > maxVisible;
  const visible = !foldable || expanded ? options : options.filter((option, index) => index < maxVisible || pinned.includes(option.value) || value.includes(option.value));
  const hidden = options.length - visible.length;
  const showMore = foldable && (expanded || hidden > 0);
  const keys = [...visible.map((option) => option.value), ...showMore ? [MORE] : []];
  const tabStop = active !== null && keys.includes(active) ? active : visible.find((option) => value.includes(option.value))?.value ?? keys[0];
  function toggle(next) {
    const on = value.includes(next);
    if (!multiple) return onValueChange(on ? [] : [next]);
    onValueChange(options.filter((option) => option.value === next ? !on : value.includes(option.value)).map((option) => option.value));
  }
  function toggleMore() {
    if (expanded) setPinned(value);
    setExpanded(!expanded);
  }
  function onKeyDown(event) {
    const buttons = Array.from(event.currentTarget.querySelectorAll(":is(button[data-chip], button[data-more]):not([aria-hidden='true'])"));
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    const last = buttons.length - 1;
    const moves = { ArrowRight: index === last ? 0 : index + 1, ArrowDown: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    buttons[moves[event.key]].focus();
  }
  return <LayoutGroup id={id}>
    <HeightFrame morphKey={`${expanded}|${value.join(",")}`} reduce={reduce}>
      <div className={[styles.group, className].filter(Boolean).join(" ")} role="group" aria-label={label} onKeyDown={onKeyDown}>
        <AnimatePresence mode="popLayout" initial={false}>
          {
    /* Chips revealed by the overflow grow in one after another, in reading order. */
  }
          {visible.map((option, index) => <Chip key={option.value} option={option} selected={value.includes(option.value)} tabbable={tabStop === option.value} reduce={reduce} delay={expanded ? Math.min(Math.max(0, index - maxVisible) * motionTokens.stagger.item, 0.3) : 0} onToggle={toggle} onFocusChip={setActive} />)}
          {showMore ? <MoreChip key={MORE} hidden={hidden} expanded={expanded} tabbable={tabStop === MORE} reduce={reduce} onToggle={toggleMore} onFocusChip={setActive} /> : null}
        </AnimatePresence>
      </div>
    </HeightFrame>
  </LayoutGroup>;
}
export default ChipGroup;
