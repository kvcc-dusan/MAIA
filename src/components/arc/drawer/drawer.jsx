import * as DialogPrimitive from "@radix-ui/react-dialog";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { X } from "@/components/icons";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./drawer.module.css";
function useDrawerItem(item) {
  const [last, setLast] = useState(item);
  if (item != null && item !== last) setLast(item);
  return item ?? last;
}
const DrawerContext = createContext(null);
function Drawer({ open: openProp, defaultOpen = false, onOpenChange, ...props }) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const [flung, setFlung] = useState(false);
  const openedAt = useRef(0);
  const open = openProp ?? uncontrolled;
  const setOpen = useCallback((next) => {
    setFlung(false);
    if (next) openedAt.current = performance.now();
    if (openProp === void 0) setUncontrolled(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);
  const fling = useCallback(() => {
    setOpen(false);
    setFlung(true);
  }, [setOpen]);
  const value = useMemo(() => ({ open, flung, setOpen, fling, openedAt }), [open, flung, setOpen, fling]);
  return <DrawerContext.Provider value={value}><DialogPrimitive.Root {...props} open={open} onOpenChange={setOpen} /></DrawerContext.Provider>;
}
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;
const fade = { duration: motionTokens.duration.instant };
const shadowOut = { duration: motionTokens.duration.standard, times: [0, 0.65, 1], ease: "linear" };
const leave = { default: { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.standard] }, opacity: shadowOut };
const flingOut = { default: { ...motionTokens.spring.smooth, visualDuration: motionTokens.duration.standard }, opacity: shadowOut };
function SwapText({ text }) {
  const reduced = useReducedMotion();
  return <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
    key={text}
    className={styles.swap}
    initial={reduced ? false : { opacity: 0, y: "0.3em", filter: `blur(${motionTokens.blur.soft}px)` }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: "-0.3em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] } }}
    transition={{ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}
  >
        {text}
      </motion.span>
    </AnimatePresence>;
}
function DrawerContent({
  title,
  description,
  children,
  side = "right",
  container,
  className,
  onInteractOutside,
  ...props
}) {
  const drawer = useContext(DrawerContext);
  const reduced = useReducedMotion();
  const panelRef = useRef(null);
  const offset = useMotionValue(0);
  const pan = useRef(null);
  const axis = side === "left" || side === "right" ? "x" : "y";
  const sign = side === "right" || side === "bottom" ? 1 : -1;
  const offscreen = { [axis]: `${sign * 100}%` };
  const classes = [styles.content, className].filter(Boolean).join(" ");
  const draggable = drawer !== null && !reduced;
  const panelSize = () => (axis === "x" ? panelRef.current?.offsetWidth : panelRef.current?.offsetHeight) ?? 480;
  function panStart(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!draggable || target?.closest("button, a, input, select, textarea, [role='button']")) return;
    const value = offset.get();
    pan.current = typeof value === "number" ? value : parseFloat(value) / 100 * panelSize();
    offset.stop();
  }
  function panMove(_, info) {
    if (pan.current === null) return;
    const toward = (pan.current + info.offset[axis]) * sign;
    offset.set(sign * (toward >= 0 ? toward : -Math.sqrt(-toward)));
  }
  function panEnd(_, info) {
    if (pan.current === null) return;
    pan.current = null;
    const toward = Number(offset.get()) * sign;
    if (toward > panelSize() / 3 || toward > 0 && info.velocity[axis] * sign > 500) drawer?.fling();
    else animate(offset, 0, motionTokens.spring.snappy);
  }
  const inner = <>
    <motion.div className={[styles.header, draggable ? styles.handle : ""].filter(Boolean).join(" ")} onPanStart={panStart} onPan={panMove} onPanEnd={panEnd}>
      <div>
        <DialogPrimitive.Title className={styles.title}><SwapText text={title} /></DialogPrimitive.Title>
        {description ? <DialogPrimitive.Description className={styles.description}>
            <SwapText text={description} />
          </DialogPrimitive.Description> : null}
      </div>
      <DialogPrimitive.Close className={styles.close} aria-label="Close drawer">
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </DialogPrimitive.Close>
    </motion.div>
    <div className={styles.body}>{children}</div>
  </>;
  if (drawer === null) {
    return <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay className={`${styles.overlay} ${styles.keyframes}`} data-contained={container ? "" : void 0} />
        <DialogPrimitive.Content {...props} onInteractOutside={onInteractOutside} data-side={side} data-contained={container ? "" : void 0} className={`${classes} ${styles.keyframes}`}>{inner}</DialogPrimitive.Content>
      </DialogPrimitive.Portal>;
  }
  return <AnimatePresence custom={drawer.flung}>
      {drawer.open && <DialogPrimitive.Portal key="drawer" forceMount container={container}>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
    className={styles.overlay}
    data-contained={container ? "" : void 0}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: reduced ? fade : { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] } }}
    transition={reduced ? fade : { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}
  />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content
    {...props}
    asChild
    forceMount
    onInteractOutside={(event) => {
      onInteractOutside?.(event);
      if (event.detail.originalEvent.timeStamp < drawer.openedAt.current) event.preventDefault();
    }}
  >
            <motion.div
    ref={panelRef}
    className={classes}
    data-side={side}
    data-contained={container ? "" : void 0}
    style={{ [axis]: offset }}
    variants={{ exit: (flung) => reduced ? { opacity: 0, transition: fade } : { ...offscreen, opacity: [1, 1, 0], transition: flung ? flingOut : leave } }}
    initial={reduced ? { opacity: 0 } : { ...offscreen, opacity: 1 }}
    animate={reduced ? { opacity: 1 } : { [axis]: 0, opacity: 1 }}
    exit="exit"
    transition={reduced ? fade : motionTokens.spring.smooth}
  >
              {inner}
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>}
    </AnimatePresence>;
}
var stdin_default = Drawer;
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
  stdin_default as default,
  useDrawerItem
};
