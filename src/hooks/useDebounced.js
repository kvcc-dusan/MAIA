// @maia:useDebounced
import { useEffect } from "react";

/**
 * A hook that executes a function after a specified delay, resetting the timer if dependencies change.
 * @param {Function} fn - The function to execute.
 * @param {Array} deps - Dependency array that triggers the effect.
 * @param {number} [delay=300] - Delay in milliseconds.
 */
export function useDebounced(fn, deps, delay = 300) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
