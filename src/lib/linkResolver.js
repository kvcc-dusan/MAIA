// Resolves a [[wikilink]] target to a note the way Obsidian does, so the graph, the clusters and the
// backlink count agree. Matching is case- and space-insensitive and ignores `|alias`, `#heading` and a
// trailing `.md`:
//   - `[[Note]]`            a note titled "Note", else a file named "Note.md"
//   - `[[cosmos/overview]]` the note whose vault path ends in `cosmos/overview` (folders + file name)
// The same name can exist in several folders, so a bare name picks the closest note to the one linking.

const norm = (value) => String(value ?? "").trim().toLowerCase();
const lastSegment = (path) => path.slice(path.lastIndexOf("/") + 1);
const segments = (path) => (path ? path.split("/") : []);

/** The lookup key of a raw link: no alias, heading, `.md` or surrounding slashes, lowercased. '' means no target. */
export const linkKey = (raw) => norm(String(raw ?? "").split("|")[0].split("#")[0])
  .replace(/\\/g, "/")
  .replace(/^\/+|\/+$/g, "")
  .replace(/\.md$/, "");

const entryFor = (note) => {
  const base = norm(note.fileName ?? note.title);
  const folder = norm(note.folder);
  return { note, base, title: norm(note.title), folder, path: folder ? `${folder}/${base}` : base };
};

const push = (map, key, entry) => {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(entry);
  else map.set(key, [entry]);
};

const sharedFolderDepth = (a, b) => {
  const left = segments(a);
  const right = segments(b);
  let depth = 0;
  while (depth < left.length && depth < right.length && left[depth] === right[depth]) depth += 1;
  return depth;
};

// Closest folder to the linking note wins, then the shallower path, then the path itself so the answer is stable.
const closest = (candidates, fromFolder) => candidates.reduce((best, entry) => {
  const depth = sharedFolderDepth(entry.folder, fromFolder);
  const bestDepth = sharedFolderDepth(best.folder, fromFolder);
  if (depth !== bestDepth) return depth > bestDepth ? entry : best;
  const length = segments(entry.path).length;
  const bestLength = segments(best.path).length;
  if (length !== bestLength) return length < bestLength ? entry : best;
  return entry.path < best.path ? entry : best;
});

/**
 * Builds a resolver over `notes`. `resolve(raw, from)` returns the target note or undefined; `from` is the
 * linking note and only decides between same-named notes. It can resolve a note to itself: callers drop that.
 * Notes need `title`; `folder` and `fileName` (read from the vault, never written) enable path links.
 */
export const createLinkResolver = (notes) => {
  const byTitle = new Map();
  const byBase = new Map();
  (notes || []).forEach((note) => {
    const entry = entryFor(note);
    push(byTitle, entry.title, entry);
    push(byBase, entry.base, entry);
  });

  return (raw, from) => {
    const key = linkKey(raw);
    if (!key) return undefined;
    const isPath = key.includes("/");
    const pathMatches = isPath
      ? (byBase.get(lastSegment(key)) ?? []).filter((e) => e.path === key || e.path.endsWith(`/${key}`))
      : [];
    // A bare name matches a title before a file name. A title may contain a slash too, so a path that
    // matches no file still tries the titles.
    const pool = pathMatches.length > 0 ? pathMatches : (byTitle.get(key) ?? (isPath ? undefined : byBase.get(key)) ?? []);
    if (pool.length === 0) return undefined;
    return (pool.length === 1 ? pool[0] : closest(pool, norm(from?.folder))).note;
  };
};
