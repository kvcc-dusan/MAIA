// Pure rules for file-backed activity: which file an entry belongs to, what is
// dirty, and how a reload merges with edits made while it ran.
import { ACTIVITY_CAP } from "../../features/Opus/lib/activityLog.js";
import { capEntries } from "../../lib/opusFiles/activityFile.js";

export const entryKey = (entry) => JSON.stringify(entry);

const byAt = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
export const sortByAt = (entries) => [...entries].sort(byAt); // stable, so equal stamps keep file order

/** Entries of a project that has a folder go to that project's file, everything else to _inbox (null). */
export const routeOf = (entry, knownProjectIds) =>
  entry.projectId != null && knownProjectIds.has(entry.projectId) ? entry.projectId : null;

/** Map<projectId|null, entries> with the per-file cap applied (newest kept). */
export const groupActivity = (entries, knownProjectIds, cap = ACTIVITY_CAP) => {
  const groups = new Map();
  for (const entry of entries) {
    const key = routeOf(entry, knownProjectIds);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return new Map([...groups].map(([key, list]) => [key, capEntries(list, cap)]));
};

export const flattenGroups = (groups) => sortByAt([...groups.values()].flat());

const sameList = (a, b) => a.length === b.length && a.every((e, i) => entryKey(e) === entryKey(b[i]));

/**
 * Files whose content differs from what was last read or written.
 * Both sides are capped so an oversized file is not rewritten just for being big.
 */
export const dirtyGroups = (local, knownProjectIds, diskGroups, cap = ACTIVITY_CAP) => {
  const wanted = groupActivity(local, knownProjectIds, cap);
  const keys = new Set([...wanted.keys(), ...diskGroups.keys()]);
  const dirty = [];
  for (const projectId of keys) {
    const entries = wanted.get(projectId) ?? [];
    if (!sameList(entries, capEntries(diskGroups.get(projectId) ?? [], cap))) dirty.push({ projectId, entries });
  }
  return dirty;
};

/**
 * Three-way merge by entry identity: disk now (D), what we last knew of disk (P),
 * what memory holds (L). Local removals and additions are applied on top of the
 * new disk content, so neither an external append nor a pending local entry is lost.
 */
export const mergeActivity = (previousDisk, local, disk) => {
  const localKeys = new Set(local.map(entryKey));
  const previousKeys = new Set(previousDisk.map(entryKey));
  const diskKeys = new Set(disk.map(entryKey));
  const removed = new Set(previousDisk.map(entryKey).filter((k) => !localKeys.has(k)));
  const kept = disk.filter((e) => !removed.has(entryKey(e)));
  const added = local.filter((e) => !previousKeys.has(entryKey(e)) && !diskKeys.has(entryKey(e)));
  return sortByAt([...kept, ...added]);
};

export const sameEntries = (a, b) => a === b || sameList(a, b);
