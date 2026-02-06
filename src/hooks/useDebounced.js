// @maia:useDebounced
import { useEffect } from "react";

/**
 * Hook to run a function with a debounce delay.
 * Useful for autosaving or delaying expensive operations.
 *
 * @param {Function} fn - The function to execute.
 * @param {Array} deps - Dependency array to trigger the debounce.
 * @param {number} [delay=300] - Delay in milliseconds.
 */
export function useDebounced(fn, deps, delay = 300) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
