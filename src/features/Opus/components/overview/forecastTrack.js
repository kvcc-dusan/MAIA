// Geometry for the Overview forecast track: where Today, Target and the forecast finish
// sit on one line. Days are "YYYY-MM-DD"; everything returned is a percentage along the track.
const DAY_MS = 86400000;
const PAD = 0.06; // breathing room so a marker at either end is not clipped

const toNum = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a, b) => Math.round(toNum(b) - toNum(a));

/**
 * @param {{ start?: string|null, today: string, target?: string|null, finish?: string|null }} input
 * @returns {{ today: number, target: number|null, finish: number|null, elapsed: number, lateDays: number|null }}
 */
export const forecastTrack = ({ start, today, target = null, finish = null }) => {
  const days = [start, today, target, finish].filter(Boolean);
  const nums = days.map(toNum);
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const span = Math.max(hi - lo, 1);
  const at = (iso) => (iso ? Math.round((PAD + ((toNum(iso) - lo) / span) * (1 - 2 * PAD)) * 1000) / 10 : null);
  return {
    today: at(today),
    target: at(target),
    finish: at(finish),
    elapsed: at(start ?? today) ?? 0,
    lateDays: target && finish ? daysBetween(target, finish) : null,
  };
};
