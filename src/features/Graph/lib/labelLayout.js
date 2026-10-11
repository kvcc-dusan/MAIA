// Pure screen-space label declutter for the 3D graph. The scene projects the
// nodes, this module decides which labels get to be visible: highest priority
// first, a label is accepted only if its rectangle does not touch one that was
// already accepted. No three.js in here, so it is trivial to test.

export const LABEL_PRIORITY = { normal: 0, emphasised: 1, hovered: 2 };

const CHAR_WIDTH_RATIO = 0.55; // average glyph width relative to the font size
const LINE_HEIGHT_RATIO = 1.3;
export const LABEL_PADDING_PX = 4;

/** Rough rectangle of a one-line label at the given on-screen text height. */
export const estimateLabelSize = (text, fontPx) => ({
  width: (text || "").length * CHAR_WIDTH_RATIO * fontPx,
  height: fontPx * LINE_HEIGHT_RATIO,
});

/** Higher priority first, then higher score (default: degree), then title (and id) so the result is stable between passes. */
export const compareCandidates = (a, b) =>
  b.priority - a.priority
  || (b.score ?? b.degree) - (a.score ?? a.degree)
  || b.degree - a.degree
  || (a.title || "").localeCompare(b.title || "")
  || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const isOffscreen = (c, viewport) =>
  c.x + c.width / 2 < 0 || c.x - c.width / 2 > viewport.width || c.y + c.height / 2 < 0 || c.y - c.height / 2 > viewport.height;

const overlaps = (a, b, padding) =>
  Math.abs(a.x - b.x) * 2 < a.width + b.width + 2 * padding && Math.abs(a.y - b.y) * 2 < a.height + b.height + 2 * padding;

/**
 * @param {object} options
 * @param {{ id: string, title?: string, x: number, y: number, width: number, height: number, priority: number, degree: number }[]} options.candidates
 *   x/y is the centre of the label rectangle in screen pixels
 * @param {{ width: number, height: number }} options.viewport
 * @param {number} options.cap max accepted labels of normal priority; emphasised and hovered ones may exceed it
 * @param {number} [options.padding] minimum gap between two labels in px
 * @returns {string[]} accepted ids, best first
 */
export const layoutLabels = ({ candidates, viewport, cap, padding = LABEL_PADDING_PX }) => {
  const sorted = candidates.filter((c) => !isOffscreen(c, viewport)).sort(compareCandidates);
  const accepted = [];
  const rects = [];
  let normalCount = 0;
  for (const c of sorted) {
    const isNormal = c.priority <= LABEL_PRIORITY.normal;
    if (isNormal && normalCount >= cap) break; // sorted: only normal ones remain
    if (rects.some((r) => overlaps(c, r, padding))) continue;
    rects.push(c);
    accepted.push(c.id);
    if (isNormal) normalCount += 1;
  }
  return accepted;
};

/** Moves `current` toward `target` by at most `maxStep`. */
export const stepToward = (current, target, maxStep) => {
  if (Math.abs(target - current) <= maxStep) return target;
  return current + Math.sign(target - current) * maxStep;
};

/** True when `next` differs from `prev` by more than `tolerance` (relative). */
export const changedBeyond = (prev, next, tolerance) => !(prev > 0) || Math.abs(next / prev - 1) > tolerance;
