// Sort choices for the Codex file tree. Pure: comparators plus the stored-value helpers.
// Folders always come first and are always sorted by name; a date choice keeps them A to Z.

export const DEFAULT_SORT = "name-asc";

export const SORT_OPTIONS = [
  { id: "name-asc", label: "File name (A to Z)" },
  { id: "name-desc", label: "File name (Z to A)" },
  { id: "modified-desc", label: "Modified time (new to old)" },
  { id: "modified-asc", label: "Modified time (old to new)" },
  { id: "created-desc", label: "Created time (new to old)" },
  { id: "created-asc", label: "Created time (old to new)" },
];

const SORT_IDS = new Set(SORT_OPTIONS.map((o) => o.id));

/** Anything unknown (junk, null, an old value) becomes the default. */
export const parseSort = (value) => (typeof value === "string" && SORT_IDS.has(value.trim()) ? value.trim() : DEFAULT_SORT);

export const serializeSort = (sort) => parseSort(sort);

const SORT_KEY = "maia.codex.sort";
/** Per vault, so two vaults can be sorted differently. Web mode (no vault path) uses the bare key. */
export const sortStorageKey = (vaultPath) => (vaultPath ? `${SORT_KEY}:${vaultPath}` : SORT_KEY);

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
export const compareNames = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);

const toMs = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

// modifiedAt/birthAt are loader-only (see vaultLoad.js). Web notes only have createdAt/updatedAt.
export const modifiedTime = (note) => toMs(note.modifiedAt) ?? toMs(note.updatedAt) ?? toMs(note.createdAt) ?? 0;
// Real file birth time when the OS has one, else the frontmatter createdAt.
export const createdTime = (note) => toMs(note.birthAt) ?? toMs(note.createdAt) ?? 0;

const noteName = (note) => note.title || "Untitled";
const compareByNameThenId = (a, b) => compareNames(noteName(a), noteName(b)) || compareNames(String(a.id ?? ""), String(b.id ?? ""));

/** Comparator for folder nodes ({ name }). */
export const folderComparator = (sort) => {
  const direction = parseSort(sort) === "name-desc" ? -1 : 1;
  return (a, b) => direction * compareNames(a.name, b.name);
};

/** Comparator for notes. */
export const noteComparator = (sort) => {
  const id = parseSort(sort);
  if (id === "name-asc") return compareByNameThenId;
  if (id === "name-desc") return (a, b) => compareByNameThenId(b, a);
  const time = id.startsWith("modified") ? modifiedTime : createdTime;
  const direction = id.endsWith("desc") ? -1 : 1;
  return (a, b) => direction * (time(a) - time(b)) || compareByNameThenId(a, b);
};
