import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./gauge.module.css";
const rise = { hidden: (direction) => ({ opacity: 0, y: `${0.3 * direction}em`, filter: `blur(${motionTokens.blur.soft}px)` }), shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] } }, gone: (direction) => ({ opacity: 0, y: `${-0.3 * direction}em`, filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] } }) };
const fade = { hidden: { opacity: 0, y: 0, filter: "blur(0px)" }, shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionTokens.duration.instant } }, gone: { opacity: 0, y: 0, filter: "blur(0px)", transition: { duration: motionTokens.duration.instant } } };
const reveal = { ...motionTokens.spring.smooth, visualDuration: motionTokens.duration.considered * 1.6 };
function Swap({ text, direction = 1 }) {
  const reduceMotion = !!useReducedMotion();
  return <span className={styles.swap}><AnimatePresence mode="popLayout" initial={false} custom={direction}><motion.span key={text} className={styles.text} custom={direction} variants={reduceMotion ? fade : rise} initial="hidden" animate="shown" exit="gone">{text}</motion.span></AnimatePresence></span>;
}
const radius = 42, start = -135, span = 270;
function arcFor(sweep) {
  const end = start + span * Math.min(1, Math.max(0, sweep));
  const at = (angle) => `${(50 + radius * Math.sin(angle * Math.PI / 180)).toFixed(3)} ${(50 - radius * Math.cos(angle * Math.PI / 180)).toFixed(3)}`;
  return `M ${at(start)} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${at(end)}`;
}
const track = arcFor(1);
export function Gauge({ value, min = 0, max = 100, label, detail, tone = "accent", thresholds }) {
  const safeMax = max > min ? max : min + 1;
  const percentage = Math.min(1, Math.max(0, (value - min) / (safeMax - min)));
  const displayValue = Math.round(percentage * 100);
  const bands = [...thresholds ?? []].sort((a, b) => a.from - b.from);
  const bandAt = (at) => bands.filter((threshold) => at >= threshold.from - 1e-6).pop();
  const band = bandAt(value);
  const ref = useRef(null);
  const sizer = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = !!useReducedMotion();
  const sweep = useMotionValue(0);
  const count = useMotionValue(0);
  const digitsWidth = useMotionValue("auto");
  const [filled, setFilled] = useState(false);
  const [live, setLive] = useState(band);
  const path = useTransform(sweep, arcFor);
  const arcOpacity = useTransform(sweep, (current) => Math.min(1, Math.max(0, current / 0.02)));
  const digits = useTransform(count, (current) => String(Math.round(Math.min(100, Math.max(0, current)))));
  const [moved, setMoved] = useState({ value: displayValue, direction: 1 });
  if (moved.value !== displayValue) setMoved({ value: displayValue, direction: displayValue < moved.value ? -1 : 1 });
  useEffect(() => {
    if (reduceMotion) {
      sweep.jump(percentage);
      count.jump(percentage * 100);
      const frame = requestAnimationFrame(() => setFilled(true));
      return () => cancelAnimationFrame(frame);
    }
    if (!inView) return;
    const arc = animate(sweep, percentage, filled ? motionTokens.spring.morph : reveal);
    const number = animate(count, percentage * 100, { ...filled ? motionTokens.spring.smooth : reveal, onComplete: () => setFilled(true) });
    return () => {
      arc.stop();
      number.stop();
    };
  }, [count, filled, inView, percentage, reduceMotion, sweep]);
  useMotionValueEvent(count, "change", (current) => {
    const next = bandAt(min + current / 100 * (safeMax - min));
    const changed = next?.from !== live?.from || next?.label !== live?.label;
    if (filled) {
      if (changed) setLive(next);
    } else if (inView && Math.abs(current - percentage * 100) < 1) {
      if (changed) setLive(next);
      setFilled(true);
    }
  });
  const shown = reduceMotion || !filled ? band : live;
  const activeTone = shown?.tone ?? tone;
  useEffect(() => {
    const node = sizer.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let measured = null;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth;
      if (measured !== null && measured !== node.textContent && !reduceMotion) animate(digitsWidth, next, motionTokens.spring.smooth);
      else digitsWidth.jump(next);
      measured = node.textContent;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [digitsWidth, reduceMotion]);
  return <figure ref={ref} className={[styles.figure, styles[activeTone]].join(" ")} aria-label={`${label}: ${value} of ${safeMax}${band ? `, ${band.label}` : ""}`}>
    <div className={styles.visual} role="meter" aria-label={label} aria-valuemin={min} aria-valuemax={safeMax} aria-valuenow={Math.min(safeMax, Math.max(min, value))} aria-valuetext={`${displayValue}%${band ? `, ${band.label}` : ""}`}>
      <svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><path className={styles.track} d={track} /><motion.path className={styles.arc} d={path} style={{ opacity: arcOpacity }} /></svg>
      <div className={styles.readout} aria-hidden="true">
        <span className={styles.number}><motion.span className={styles.digits} style={{ width: digitsWidth }}>{digits}</motion.span><span className={styles.unit}>%</span><span ref={sizer} className={styles.sizer}>{displayValue}</span></span>
        {thresholds && <span className={styles.status}><Swap text={filled ? shown?.label ?? "" : ""} direction={moved.direction} /></span>}
      </div>
    </div>
    <figcaption><strong><Swap text={label} /></strong>{detail && <span className={styles.detail}><Swap text={detail} direction={moved.direction} /></span>}</figcaption>
  </figure>;
}
export default Gauge;
