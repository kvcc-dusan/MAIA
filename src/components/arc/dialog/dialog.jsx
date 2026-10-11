import * as DialogPrimitive from "@radix-ui/react-dialog";
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@/components/icons";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./dialog.module.css";
const OpenContext = createContext(null);
function Dialog({ open: openProp, defaultOpen = false, onOpenChange, ...props }) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = useCallback((next) => {
    if (openProp === void 0) setUncontrolled(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);
  return <OpenContext.Provider value={open}><DialogPrimitive.Root {...props} open={open} onOpenChange={setOpen} /></OpenContext.Provider>;
}
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const fade = { duration: motionTokens.duration.instant };
const leave = { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] };
function SwapText({ text }) {
  const reduced = useReducedMotion();
  return <AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={text} className={styles.swap} initial={reduced ? false : { opacity: 0, y: "0.3em", filter: `blur(${motionTokens.blur.soft}px)` }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: "-0.3em", filter: `blur(${motionTokens.blur.subtle}px)`, transition: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] } }} transition={{ duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }}>{text}</motion.span>
  </AnimatePresence>;
}
function DialogContent({ title, description, children, className, onPointerDownOutside, ...props }) {
  const open = useContext(OpenContext);
  const reduced = useReducedMotion();
  const change = useRef({ open, at: 0 });
  useLayoutEffect(() => {
    change.current = { open, at: performance.now() };
  }, [open]);
  const pressOutside = (event) => {
    onPointerDownOutside?.(event);
    if (open !== null && (!change.current.open || event.detail.originalEvent.timeStamp < change.current.at)) event.preventDefault();
  };
  const classes = [styles.content, className].filter(Boolean).join(" ");
  const inner = <>
    <div className={styles.header}><div><DialogPrimitive.Title className={styles.title}><SwapText text={title} /></DialogPrimitive.Title>{description ? <DialogPrimitive.Description className={styles.description}><SwapText text={description} /></DialogPrimitive.Description> : null}</div><DialogPrimitive.Close className={styles.close} aria-label="Close dialog"><X size={16} strokeWidth={1.75} aria-hidden="true" /></DialogPrimitive.Close></div>
    <div className={styles.body}>{children}</div>
  </>;
  if (open === null) return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={`${styles.overlay} ${styles.keyframes}`} />
    <DialogPrimitive.Content {...props} onPointerDownOutside={pressOutside} className={`${classes} ${styles.keyframes}`}>{inner}</DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
  return <AnimatePresence>
    {open && <DialogPrimitive.Portal key="dialog" forceMount>
      <DialogPrimitive.Overlay asChild forceMount><motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: reduced ? fade : leave }} transition={reduced ? fade : { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] }} /></DialogPrimitive.Overlay>
      <DialogPrimitive.Content {...props} onPointerDownOutside={pressOutside} asChild forceMount>
        <motion.div className={classes} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? { opacity: 0, transition: fade } : { opacity: 0, y: 4, scale: 0.98, transition: leave }} transition={reduced ? fade : { default: motionTokens.spring.smooth, opacity: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.enter] } }}>{inner}</motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>}
  </AnimatePresence>;
}
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger
};
