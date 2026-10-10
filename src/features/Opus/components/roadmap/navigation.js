// Arrow-key movement between Gantt items. Left and right walk one lane in time
// order; up and down move to the nearest item on the previous or next visual
// row (a lane's sub rows count as rows), so stacked bars stay reachable.

const byMid = (a, b) => a.mid - b.mid || String(a.id).localeCompare(String(b.id));

const visualRows = (lanes) =>
  lanes.flatMap((lane, laneIndex) => {
    const rows = new Map();
    lane.forEach((item) => rows.set(item.row ?? 0, [...(rows.get(item.row ?? 0) ?? []), item]));
    return [...rows.keys()]
      .sort((a, b) => a - b)
      .map((row) => ({ laneIndex, row, items: rows.get(row) }));
  });

const nearest = (items, mid) =>
  items.reduce((best, item) => (best === null || Math.abs(item.mid - mid) < Math.abs(best.mid - mid) ? item : best), null);

/**
 * `lanes`: one array per lane of `{ id, row, mid }`. Returns the id to focus,
 * or null when the key doesn't move (an end of the lane, an unknown key).
 */
export const nextFocusId = (lanes, currentId, key) => {
  const laneIndex = lanes.findIndex((lane) => lane.some((item) => item.id === currentId));
  if (laneIndex < 0) return null;
  const lane = [...lanes[laneIndex]].sort(byMid);
  const index = lane.findIndex((item) => item.id === currentId);
  const current = lane[index];

  if (key === "ArrowRight") return lane[index + 1]?.id ?? null;
  if (key === "ArrowLeft") return lane[index - 1]?.id ?? null;
  if (key === "Home") return lane[0].id === currentId ? null : lane[0].id;
  if (key === "End") return lane[lane.length - 1].id === currentId ? null : lane[lane.length - 1].id;

  if (key !== "ArrowDown" && key !== "ArrowUp") return null;
  const rows = visualRows(lanes);
  const at = rows.findIndex((r) => r.laneIndex === laneIndex && r.row === (current.row ?? 0));
  const target = rows[at + (key === "ArrowDown" ? 1 : -1)];
  return target ? nearest(target.items, current.mid).id : null;
};

/** Which item holds the tab stop: the remembered one if it still exists, else the first. */
export const resolveActiveId = (lanes, activeId) => {
  const all = lanes.flat();
  if (all.some((item) => item.id === activeId)) return activeId;
  const firstLane = lanes.find((lane) => lane.length > 0);
  return firstLane ? [...firstLane].sort(byMid)[0].id : null;
};
