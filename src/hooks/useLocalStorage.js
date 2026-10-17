import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook to persist state to localStorage with debounced writes.
 *
 * Writes are debounced 1s to avoid blocking the main thread during rapid
 * updates, but the pending write is flushed immediately on unmount and on
 * `beforeunload` — a debounce must never be the reason an edit is lost when
 * the user navigates away or quits.
 *
 * @param {string} key - The localStorage key.
 * @param {*} initial - The initial value (or function returning it).
 * @returns {[*, Function, *]} - [state, setState, lastWriteError]
 */
export function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(`[MAIA] Failed to parse localStorage key "${key}" — data may be corrupted`, e);
      // Preserve the corrupt payload instead of silently discarding it —
      // a bad parse should never mean the underlying bytes are gone for good.
      try {
        const raw = localStorage.getItem(key);
        if (raw != null) {
          localStorage.setItem(`${key}.corrupt.${Date.now()}`, raw);
        }
      } catch {
        // best-effort backup; if this also fails there's nothing more we can do
      }
    }
    return typeof initial === "function" ? initial() : initial;
  });

  const [writeError, setWriteError] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const dirtyRef = useRef(false); // true whenever a debounced write hasn't landed yet

  const failedRef = useRef(false);

  const writeNow = useCallback(() => {
    // One toast per key, replaced on every failed write instead of stacking.
    const toastId = `storage-write-${key}`;
    try {
      localStorage.setItem(key, JSON.stringify(stateRef.current));
      dirtyRef.current = false;
      setWriteError(null);
      if (failedRef.current) {
        failedRef.current = false;
        toast.dismiss(toastId);
      }
    } catch (e) {
      console.error(`[MAIA] Failed to write localStorage key "${key}"`, e);
      const isQuota = e.name === "QuotaExceededError" || e.code === 22;
      failedRef.current = true;
      setWriteError(e);
      // Chronos, reminders and app settings live here even in the desktop app. A failed write
      // used to reach only the console, so the UI kept showing changes that were never saved.
      toast.error(
        isQuota
          ? "MAIA's local storage is full, so your latest changes weren't saved. Export a backup in Settings > Data."
          : "Couldn't save your latest changes on this device. They stay until the window closes.",
        { id: toastId, duration: Infinity },
      );
    }
  }, [key]);

  // Debounce: schedule a write, only clearing (never flushing) the previous
  // timer on cleanup — this effect's cleanup runs on every state change, not
  // just unmount, so flushing here would defeat the debounce entirely.
  useEffect(() => {
    dirtyRef.current = true;
    const timer = setTimeout(writeNow, 1000);
    return () => clearTimeout(timer);
  }, [state, writeNow]);

  // True unmount only (key is static per call site) — flush anything the
  // debounce above hasn't written yet, so closing a modal/navigating away
  // never drops the last edit.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) writeNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Native window close / quit may not run React unmount effects at all —
  // flush unconditionally before the page goes away.
  useEffect(() => {
    const onUnload = () => {
      if (dirtyRef.current) writeNow();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [writeNow]);

  return [state, setState, writeError];
}
