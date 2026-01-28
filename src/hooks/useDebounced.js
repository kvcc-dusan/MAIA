// @maia:useDebounced
import { useEffect } from "react";
export function useDebounced(fn, deps, delay = 300) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
