import { useRef, useCallback } from "react";

/**
 * Long-press hook for touch context menus.
 * Returns { onTouchStart, onTouchMove, onTouchEnd } handlers.
 * Calls `callback(touch)` after `delay` ms if the finger hasn't moved.
 */
export function useLongPress(callback, delay = 500) {
  const timerRef = useRef(null);
  const touchRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (navigator.vibrate) navigator.vibrate(50);
      callback(touch);
    }, delay);
  }, [callback, delay]);

  const onTouchMove = useCallback((e) => {
    if (!timerRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    // Cancel if finger moved more than 10px
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clear();
  }, [clear]);

  const onTouchEnd = useCallback(() => clear(), [clear]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
