import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "@/components/icons";
import { motionTokens } from "../lib/motion-tokens";
import { Button } from "../button/button";
import styles from "./theme-switch.module.css";
const iconSpring = { ...motionTokens.spring.snappy, opacity: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.enter] }, filter: { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.enter] } };
const iconExit = { duration: motionTokens.duration.fast, ease: [...motionTokens.ease.standard] };
const blur = `blur(${motionTokens.blur.subtle}px)`;
function useSettled() {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return settled;
}
function ThemeIcon({ theme, reduced, settled }) {
  const Icon = theme === "light" ? Sun : Moon;
  const angle = theme === "light" ? 30 : -30;
  return <AnimatePresence initial={false} mode="popLayout">
      <motion.span
    key={theme}
    className={styles.icon}
    initial={!settled ? false : reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: angle, filter: blur }}
    animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
    exit={!settled ? { opacity: 0, transition: { duration: 0 } } : reduced ? { opacity: 0, transition: { duration: motionTokens.duration.instant } } : { opacity: 0, scale: 0.7, rotate: angle, filter: blur, transition: iconExit }}
    transition={reduced ? { duration: motionTokens.duration.instant } : iconSpring}
    aria-hidden="true"
  >
        <Icon size={16} strokeWidth={1.75} />
      </motion.span>
    </AnimatePresence>;
}
export function ThemeSwitch({ theme, variant = "reveal", onThemeChange, label, iconOnly = false }) {
  const reduced = useReducedMotion() ?? false;
  const settled = useSettled();
  const next = theme === "light" ? "dark" : "light";
  const classes = [styles.themeSwitch, styles[variant], iconOnly ? styles.iconOnly : "", settled ? styles.settled : ""].join(" ");
  return <Button
    type="button"
    size="sm"
    variant="secondary"
    className={classes}
    data-theme={theme}
    aria-label={label ?? `Switch to ${next} mode`}
    aria-pressed={theme === "dark"}
    onClick={(event) => onThemeChange(next, variant, event.currentTarget)}
  >
      <span className={styles.iconWrap}><ThemeIcon theme={theme} reduced={reduced} settled={settled} /></span>
      {!iconOnly && <span className={styles.label}>Switch theme</span>}
    </Button>;
}
export default ThemeSwitch;
