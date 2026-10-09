import { useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./skeleton.module.css";
function HeightFrame({ className, busy, reduce, children }) {
  const frame = useRef(null);
  const content = useRef(null);
  const height = useMotionValue("auto");
  const changedAt = useRef(0);
  useLayoutEffect(() => {
    changedAt.current = performance.now();
  }, [busy]);
  useEffect(() => {
    const node = content.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let last;
    let controls;
    const settle = () => {
      height.jump("auto");
      if (frame.current) Object.assign(frame.current.style, { overflow: "", height: "auto" });
    };
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight;
      const current = height.get();
      const from = typeof current === "number" ? current : last;
      last = next;
      controls?.stop();
      if (reduce || from === void 0 || from === next || performance.now() - changedAt.current > 120) return settle();
      if (frame.current) Object.assign(frame.current.style, { overflow: "hidden", height: `${from}px` });
      controls = animate(height, [from, next], { ...motionTokens.spring.smooth, onComplete: settle });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
    };
  }, [height, reduce]);
  return <motion.div ref={frame} className={className} aria-busy={busy} style={{ height }}>
    <div ref={content} className={styles.frame}>{children}</div>
  </motion.div>;
}
export function Skeleton({ label = "Loading content", lines = 3, avatar = false, className, children, loading = true }) {
  const reduce = useReducedMotion();
  const count = Math.min(Math.max(Math.floor(lines), 1), 6);
  const placeholder = (extra) => <div className={[styles.root, extra].filter(Boolean).join(" ")} role="status" aria-label={label} aria-busy="true">
    {avatar && <span className={styles.avatar} aria-hidden="true" />}
    <span className={styles.lines} aria-hidden="true">{Array.from({ length: count }, (_, index) => <span className={styles.line} style={{ "--index": index + (avatar ? 1 : 0) }} key={index} />)}</span>
  </div>;
  if (children === void 0) return placeholder(className);
  return <HeightFrame className={className} busy={loading} reduce={reduce}>
    <AnimatePresence mode="popLayout" initial={false}>
      {loading ? <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? motionTokens.duration.instant : motionTokens.duration.fast, ease: [...motionTokens.ease.standard] }} exit={{ opacity: 0, transition: { duration: reduce ? motionTokens.duration.instant : motionTokens.duration.fast } }}>{placeholder()}</motion.div> : <motion.div key="content" initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: reduce ? motionTokens.duration.instant : motionTokens.duration.fast } }} transition={{ duration: reduce ? motionTokens.duration.instant : motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}>{children}</motion.div>}
    </AnimatePresence>
  </HeightFrame>;
}
export default Skeleton;
