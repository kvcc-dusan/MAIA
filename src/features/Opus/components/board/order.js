// Ordering of tasks inside a board column.
//
// A column sorts by `order` (numbers first, never-ordered last), then
// createdAt, then id. A drop writes ONE number when it can: the midpoint
// between the new neighbours. Renumbering the column on every drop would
// write one task per card, and every task write is an activity entry that
// feeds the Overview heatmap and the Record timeline; a reorder is not a
// change anyone wants in their history.
// A column is only renumbered (steps of ORDER_STEP) when two numbered
// neighbours have run out of room, and never-ordered tasks are numbered only
// as far as the drop needs.

export const ORDER_STEP = 1000;
export const MIN_ORDER_GAP = 0.001;

const hasOrder = (t) => Number.isFinite(t?.order);
const created = (t) => t?.createdAt ?? "";

export const compareTasks = (a, b) => {
  const aHas = hasOrder(a);
  const bHas = hasOrder(b);
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && a.order !== b.order) return a.order - b.order;
  if (created(a) !== created(b)) return created(a) < created(b) ? -1 : 1;
  return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
};

export const sortColumn = (tasks) => [...tasks].sort(compareTasks);

/** Index in `rest` (moved task excluded) for a drop between two visible neighbours. */
export const insertIndex = (rest, { prevId = null, nextId = null } = {}) => {
  if (nextId != null) {
    const i = rest.findIndex((t) => t.id === nextId);
    if (i !== -1) return i;
  }
  if (prevId != null) {
    const i = rest.findIndex((t) => t.id === prevId);
    if (i !== -1) return i + 1;
  }
  return rest.length;
};

const movedFirst = (plan, movedId) => [...plan.filter((p) => p.id === movedId), ...plan.filter((p) => p.id !== movedId)];

const renumber = (rest, movedId, at) => {
  const seq = [...rest.slice(0, at), { id: movedId }, ...rest.slice(at)];
  const byId = new Map(rest.map((t) => [t.id, t]));
  const plan = seq
    .map((t, i) => ({ id: t.id, order: (i + 1) * ORDER_STEP }))
    .filter((p) => p.id === movedId || byId.get(p.id)?.order !== p.order);
  return movedFirst(plan, movedId);
};

// The leading tasks are numbered, the rest are not. Number from the first
// unnumbered task through the moved one; the tail keeps sorting by createdAt.
const numberPrefix = (rest, movedId, at) => {
  const firstUnnumbered = rest.findIndex((t) => !hasOrder(t));
  const base = firstUnnumbered > 0 ? rest[firstUnnumbered - 1].order : 0;
  const seq = [...rest.slice(firstUnnumbered, at), { id: movedId }];
  return movedFirst(seq.map((t, i) => ({ id: t.id, order: base + (i + 1) * ORDER_STEP })), movedId);
};

/**
 * Which orders must be written so the moved task lands at `index` of `rest`?
 * `rest` is the target column, sorted, WITHOUT the moved task. The moved
 * task's patch is always first; others appear only when they change.
 */
export const planOrder = (rest, movedId, index) => {
  const at = Math.max(0, Math.min(index, rest.length));
  const prev = rest[at - 1];
  const next = rest[at];

  if (prev && !hasOrder(prev)) return numberPrefix(rest, movedId, at);
  if (!next || !hasOrder(next)) return [{ id: movedId, order: prev ? prev.order + ORDER_STEP : ORDER_STEP }];
  if (!prev) return [{ id: movedId, order: next.order - ORDER_STEP }];
  if (next.order - prev.order > MIN_ORDER_GAP) return [{ id: movedId, order: (prev.order + next.order) / 2 }];
  return renumber(rest, movedId, at);
};
