import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./toast.module.css";
const subscribeHydration = () => () => {
};
const exitFast = { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] };
const enter = { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] };
const textIn = { opacity: 0, y: "0.3em", filter: `blur(${motionTokens.blur.soft}px)` };
const textOut = { opacity: 0, y: "-0.3em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: exitFast };
const textShown = { opacity: 1, y: "0em", filter: "blur(0px)" };
const fadeOut = { opacity: 0, transition: { duration: motionTokens.duration.instant } };
const swipe = { distance: 80, velocity: 480 };
function Swap(props) {
  const present = useIsPresent();
  return <motion.span {...props} aria-hidden={present ? props["aria-hidden"] : true} />;
}
function HeightFrame({ reduce, morphKey, children }) {
  const frame = useRef(null);
  const content = useRef(null);
  const height = useMotionValue("auto");
  const changedAt = useRef(0);
  useLayoutEffect(() => {
    changedAt.current = performance.now();
  }, [morphKey]);
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
  return <motion.div ref={frame} className={styles.frame} style={{ height }}>
    <div ref={content} className={styles.copy}>{children}</div>
  </motion.div>;
}
export default function Toast({ title, description, open = true, onOpenChange, duration = 4500 }) {
  const reduce = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [enterOnMount] = useState(hydrated);
  const [dismissed, setDismissed] = useState(false);
  const [throwX, setThrowX] = useState(0);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDismissed(false);
      setThrowX(0);
    }
  }
  const visible = open && !dismissed;
  const surface = useRef(null);
  const x = useMotionValue(0);
  const releaseVelocity = useRef(0);
  function dismiss(to) {
    setThrowX(to);
    setDismissed(true);
    onOpenChange?.(false);
  }
  useEffect(() => {
    if (!visible || !onOpenChange || duration <= 0) return;
    const timer = window.setTimeout(() => {
      setThrowX(0);
      setDismissed(true);
      onOpenChange(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [visible, onOpenChange, duration]);
  function handleDragEnd(_, info) {
    const direction = Math.sign(info.offset.x || info.velocity.x);
    if (Math.abs(info.offset.x) < swipe.distance && Math.abs(info.velocity.x) < swipe.velocity) {
      animate(x, 0, { ...motionTokens.spring.snappy, velocity: info.velocity.x });
      return;
    }
    releaseVelocity.current = info.velocity.x;
    dismiss(direction * ((surface.current?.offsetWidth ?? 320) + 48));
  }
  const variants = reduce ? {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { duration: motionTokens.duration.instant } },
    exit: fadeOut
  } : {
    // x resets here because the drag value outlives a thrown toast; the next one must rise from the center.
    hidden: { opacity: 0, x: 0, y: 16, scale: 0.96 },
    // x returns to center too, in case the toast is raised again while a throw is still leaving.
    shown: { opacity: 1, x: 0, y: 0, scale: 1, transition: { ...motionTokens.spring.morph, opacity: enter } },
    // A thrown toast keeps its release velocity; a closed one sinks back toward the edge it came from.
    // The throw settles loosely: it is invisible once the fade ends, so no long unseen tail keeps it mounted.
    exit: (to) => to ? { x: to, opacity: 0, transition: { x: { type: "spring", visualDuration: 0.3, bounce: 0, velocity: releaseVelocity.current, restDelta: 2, restSpeed: 40 }, opacity: { duration: motionTokens.duration.exit } } } : { opacity: 0, y: 8, scale: 0.97, transition: { duration: motionTokens.duration.exit, ease: [...motionTokens.ease.standard] } }
  };
  const swap = { initial: reduce ? { opacity: 0 } : textIn, animate: textShown, exit: reduce ? fadeOut : textOut, transition: reduce ? { duration: motionTokens.duration.instant } : enter };
  return <AnimatePresence initial={enterOnMount} custom={throwX}>
      {visible && <motion.div
    key="toast"
    ref={surface}
    className={styles.toast}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    custom={throwX}
    variants={variants}
    initial="hidden"
    animate="shown"
    exit="exit"
    style={{ x }}
    drag={reduce && hydrated ? false : "x"}
    dragMomentum={false}
    onDragEnd={handleDragEnd}
  >
        <span className={styles.icon} aria-hidden="true">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M4 12.5l5 5L20 6.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter], delay: 0.12 }} />
          </svg>
        </span>
        {
    /* The copy column follows its content height, so a longer message grows the toast instead of snapping it. */
  }
        <HeightFrame reduce={reduce} morphKey={`${title}
${description ?? ""}`}>
          <strong className={styles.title}><AnimatePresence mode="popLayout" initial={false}><Swap key={title} className={styles.line} {...swap}>{title}</Swap></AnimatePresence></strong>
          <AnimatePresence mode="popLayout" initial={false}>{description ? <Swap key={description} className={styles.description} {...swap}>{description}</Swap> : null}</AnimatePresence>
        </HeightFrame>
        <button
    className={styles.close}
    type="button"
    aria-label="Dismiss notification"
    onClick={() => dismiss(0)}
  >
          <X width={16} height={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </motion.div>}
    </AnimatePresence>;
}
