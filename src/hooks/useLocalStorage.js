import { useState, useEffect } from "react";

/**
 * Hook to persist state to localStorage.
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
    } catch { /* ignore */ }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [key, state]);

  return [state, setState];
}
