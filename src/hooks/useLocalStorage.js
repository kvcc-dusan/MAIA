import { useState, useEffect } from "react";

/**
 * A hook for persisting state in localStorage.
 * @param {string} key - The localStorage key.
 * @param {any} initial - Initial value or function returning initial value.
 * @returns {[any, Function]} State and setter function.
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
