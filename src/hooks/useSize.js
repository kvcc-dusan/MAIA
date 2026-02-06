import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to track the size of an element.
 * Uses ResizeObserver to update dimensions.
 *
 * @returns {[React.MutableRefObject, {w: number, h: number}]} - Ref to attach to the element, and its size.
 */
export function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = ref.current;
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}
