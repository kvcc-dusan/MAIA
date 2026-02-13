import { useState, useLayoutEffect, useCallback } from "react";

/**
 * Custom hook to track the size of an element.
 * Uses ResizeObserver to update dimensions.
 *
 * @returns {[Function, {w: number, h: number}, HTMLElement]} - Ref callback to attach to the element, its size, and the element itself.
 */
export function useSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [element, setElement] = useState(null);

  const ref = useCallback((node) => {
    setElement(node);
  }, []);

  useLayoutEffect(() => {
    if (!element) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: element.clientWidth, h: element.clientHeight });
    });
    ro.observe(element);
    return () => ro.disconnect();
  }, [element]);

  return [ref, size, element];
}
