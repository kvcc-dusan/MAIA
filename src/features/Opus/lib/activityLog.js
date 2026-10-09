// Append-only activity log with a hard cap. Pure: DataContext owns the state,
// this owns the rules (compact entry shape, collapse, cap).

export const ACTIVITY_CAP = 3000;
export const COLLAPSE_WINDOW_MS = 60_000;
export const MAX_TITLE_LENGTH = 80;

/** kind: created | updated | status | deleted */
export const makeActivityEntry = ({ kind, collection, itemId, projectId, title, from, to }, at) => ({
  at,
  kind,
  collection,
  itemId,
  projectId: projectId ?? null,
  title: String(title ?? "").slice(0, MAX_TITLE_LENGTH),
  from: from ?? null,
  to: to ?? null,
});

// Typing in a title field fires an update per keystroke; collapsing repeats of
// the same item inside a minute keeps the log (and the heatmap) meaningful.
// Only a previous 'updated' entry is replaced, so a 'created' marker survives.
const dropCollapsible = (log, entry) => {
  const cutoff = Date.parse(entry.at) - COLLAPSE_WINDOW_MS;
  for (let i = log.length - 1; i >= 0; i--) {
    if (Date.parse(log[i].at) < cutoff) break;
    if (log[i].itemId !== entry.itemId) continue;
    return log[i].kind === "updated" ? [...log.slice(0, i), ...log.slice(i + 1)] : log;
  }
  return log;
};

export const appendActivity = (log, entry) => {
  const list = Array.isArray(log) ? log : [];
  const base = entry.kind === "updated" ? dropCollapsible(list, entry) : list;
  const next = [...base, entry];
  return next.length > ACTIVITY_CAP ? next.slice(next.length - ACTIVITY_CAP) : next;
};
