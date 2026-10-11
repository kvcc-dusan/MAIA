import { useEffect, useState } from "react";

const INITIAL = 24;
const STEP = 36;
const DELAY_MS = 16;

/**
 * How many items of a long list to render right now. It starts small so the page appears at once,
 * then grows in small batches until the whole list is in, instead of building hundreds of cards in one
 * blocking pass. `resetKey` restarts the climb (a new filter or sort should show its top first).
 */
export const useProgressiveCount = (total, resetKey = "", { initial = INITIAL, step = STEP } = {}) => {
  const [state, setState] = useState({ key: resetKey, count: initial });
  const count = state.key === resetKey ? state.count : initial;

  useEffect(() => {
    if (state.key !== resetKey) {
      setState({ key: resetKey, count: initial });
      return undefined;
    }
    if (count >= total) return undefined;
    const timer = setTimeout(() => setState({ key: resetKey, count: count + step }), DELAY_MS);
    return () => clearTimeout(timer);
  }, [count, total, resetKey, state.key, initial, step]);

  return Math.min(count, total);
};
