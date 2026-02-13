import { useState, useEffect, useRef } from "react";

/**
 * Hook to persist state to localStorage with debounced writes.
 *
 * @param {string} key - The localStorage key.
 * @param {*} initial - The initial value (or function returning it).
 * @returns {[*, Function]} - State and setter tuple.
 */
export function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(`[MAIA] Failed to parse localStorage key "${key}" — data may be corrupted`, e);
    }
    return typeof initial === "function" ? initial() : initial;
  });

  // Debounced write to avoid blocking the main thread during rapid updates
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any pending write so only the latest state is persisted
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.error(`[MAIA] Failed to write localStorage key "${key}"`, e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          console.warn('[MAIA] Storage quota exceeded! Data may not be saved.');
        }
      }
    }, 1000); // 1-second debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, state]);

  return [state, setState];
}
