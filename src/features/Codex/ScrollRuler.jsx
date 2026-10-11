import React, { useEffect, useState } from "react";
import { rulerState } from "./rulerState.js";
import styles from "./ScrollRuler.module.css";

// Longest at the active tick, easing off over its neighbours like a dock.
const lengthFor = (distance) => (distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.55 : 0.4);

/** Thin tick marks on the right edge showing where you are in a long note. Decorative; the scroll area stays the real control. */
const ScrollRuler = ({ scrollRef }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let frame = 0;
    const read = () => {
      frame = 0;
      const next = rulerState(el);
      setState((prev) => (prev?.count === next?.count && prev?.active === next?.active ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    el.addEventListener("scroll", schedule, { passive: true });
    // The content grows while typing, so watch it as well as the viewport.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollRef]);

  if (!state) return null;
  return (
    <div className={styles.ruler} aria-hidden="true">
      {Array.from({ length: state.count }, (_, i) => {
        const distance = Math.abs(i - state.active);
        return (
          <span
            key={i}
            className={styles.tick}
            data-active={distance === 0 ? "" : undefined}
            style={{ transform: `scaleX(${lengthFor(distance)})` }}
          />
        );
      })}
    </div>
  );
};

export default ScrollRuler;
