const PX_PER_TICK = 160;
const MIN_TICKS = 6;
const MAX_TICKS = 40;
const MIN_OVERFLOW = 1.25; // a note barely taller than the window does not need a ruler

/** Tick count and active tick for a scroll position, or null when the content fits. */
export const rulerState = ({ scrollTop, scrollHeight, clientHeight }) => {
  if (clientHeight <= 0 || scrollHeight < clientHeight * MIN_OVERFLOW) return null;
  const count = Math.min(MAX_TICKS, Math.max(MIN_TICKS, Math.round(scrollHeight / PX_PER_TICK)));
  const range = scrollHeight - clientHeight;
  const progress = Math.min(1, Math.max(0, scrollTop / range));
  return { count, active: Math.round(progress * (count - 1)) };
};
