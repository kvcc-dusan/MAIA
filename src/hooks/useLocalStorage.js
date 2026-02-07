import { useState, useEffect } from "react";
import { logger } from "../lib/logger";

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
    } catch (e) {
      logger.error(`Failed to parse localStorage key "${key}"`, e);
    }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      logger.error(`Failed to write to localStorage key "${key}"`, e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         window.dispatchEvent(new CustomEvent('maia:storage-error'));
      }
    }
  }, [key, state]);

  return [state, setState];
}
