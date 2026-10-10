// Pure drag and drop logic. `columns` is { todo: [ids], doing: [ids], ... }.
import { STATUS_LABELS, STATUS_ORDER } from "./model.js";

export const findStatus = (columns, id) => STATUS_ORDER.find((s) => columns[s].includes(id)) ?? null;

/** Where does `activeId` land if dropped over `overId` (a card id or a column status)? */
export const resolveDrop = (columns, activeId, overId, { isBelowOver = false } = {}) => {
  const from = findStatus(columns, activeId);
  const overIsColumn = STATUS_ORDER.includes(overId);
  const to = overIsColumn ? overId : findStatus(columns, overId);
  if (!from || !to) return null;
  if (from === to) {
    return { status: to, index: overIsColumn ? columns[to].length - 1 : columns[to].indexOf(overId) };
  }
  return { status: to, index: overIsColumn ? columns[to].length : columns[to].indexOf(overId) + (isBelowOver ? 1 : 0) };
};

/** New columns with `activeId` removed and inserted at drop.index (array-move semantics). */
export const applyMove = (columns, activeId, drop) => {
  const without = Object.fromEntries(STATUS_ORDER.map((s) => [s, columns[s].filter((id) => id !== activeId)]));
  const target = [...without[drop.status]];
  target.splice(Math.max(0, Math.min(drop.index, target.length)), 0, activeId);
  return { ...without, [drop.status]: target };
};

export const sameColumns = (a, b) => STATUS_ORDER.every((s) => a[s].length === b[s].length && a[s].every((id, i) => id === b[s][i]));

export const positionOf = (columns, id) => {
  const status = findStatus(columns, id);
  if (!status) return null;
  return { status, position: columns[status].indexOf(id) + 1, total: columns[status].length };
};

export const describePosition = ({ status, position, total }) => `${STATUS_LABELS[status]}, position ${position} of ${total}`;

/** Keyboard step: what should the lifted card sit over after this arrow key? */
export const nextKeyboardTarget = (columns, activeId, key) => {
  const from = findStatus(columns, activeId);
  if (!from) return null;
  const list = columns[from];
  const idx = list.indexOf(activeId);
  if (key === "ArrowUp") return idx > 0 ? { type: "item", id: list[idx - 1] } : null;
  if (key === "ArrowDown") return idx < list.length - 1 ? { type: "item", id: list[idx + 1] } : null;
  const step = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  const status = STATUS_ORDER[STATUS_ORDER.indexOf(from) + step];
  if (!step || !status) return null;
  const target = columns[status];
  if (target.length === 0) return { type: "column", status };
  if (idx < target.length) return { type: "item", id: target[idx] };
  return { type: "end", status, lastId: target[target.length - 1] };
};

export const SCREEN_READER_INSTRUCTIONS = {
  draggable: "Press Space to pick up this task. Then use the arrow keys to move it between columns or within a column, and press Space or Enter to drop it. Press Escape to cancel. Press Enter without picking up to open the task.",
};

/**
 * dnd-kit `announcements`. `titleOf(id)`, `originOf()` (position at pickup)
 * and `destinationOf(active, over)` (position if dropped now) are supplied by
 * the board so this stays pure.
 */
export const buildAnnouncements = ({ titleOf, originOf, destinationOf }) => ({
  onDragStart: ({ active }) => {
    const origin = originOf();
    return `Picked up ${titleOf(active.id)}. ${origin ? describePosition(origin) : ""}. Arrow keys move it, Space or Enter drops it, Escape cancels.`;
  },
  onDragOver: ({ active, over }) => {
    const dest = over ? destinationOf(active, over) : null;
    return dest ? `${titleOf(active.id)} is over ${describePosition(dest)}.` : `${titleOf(active.id)} is not over a column.`;
  },
  onDragEnd: ({ active, over }) => {
    const dest = over ? destinationOf(active, over) : null;
    return dest ? `Dropped ${titleOf(active.id)} in ${describePosition(dest)}.` : `Dropped ${titleOf(active.id)} outside the board. Nothing changed.`;
  },
  onDragCancel: ({ active }) => {
    const origin = originOf();
    return `Move cancelled. ${titleOf(active.id)} is back in ${origin ? describePosition(origin) : "its column"}.`;
  },
});
