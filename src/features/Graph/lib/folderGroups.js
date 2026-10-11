// Folder grouping for the 3D layout and its floating labels. Pure: nodes carry `folder` ('' for the vault
// root, else 'A/B/C'), and a note belongs to its own folder and every ancestor of it.

export const MIN_LABEL_GROUP = 4;
export const MAX_FOLDER_LABELS = 24;

/** 'a/b/c' -> ['a/b/c', 'a/b', 'a']; '' -> []. */
export const folderChain = (folder) => {
  if (!folder) return [];
  const parts = folder.split("/").filter(Boolean);
  const chain = [];
  for (let i = parts.length; i > 0; i -= 1) chain.push(parts.slice(0, i).join("/"));
  return chain;
};

/** Last path segment, shown exactly as the folder is named. */
export const folderLabelName = (path) => path.slice(path.lastIndexOf("/") + 1);

/**
 * Groups that get a floating label: at least `minSize` notes (own folder plus sub-folders), largest first
 * (ties by path so the order is stable), capped. Each entry has the member node ids.
 * @returns {{ path: string, name: string, ids: string[] }[]}
 */
export const labelGroups = (nodes, { minSize = MIN_LABEL_GROUP, max = MAX_FOLDER_LABELS } = {}) => {
  const byPath = new Map();
  nodes.forEach((n) => {
    folderChain(n.folder).forEach((path) => {
      if (!byPath.has(path)) byPath.set(path, []);
      byPath.get(path).push(n.id);
    });
  });
  // A folder that holds exactly the same notes as one of its sub-folders adds no information and would draw its
  // label on top of the child's (same members, same centre): only the deepest of such a chain is labelled.
  const descendantSizes = new Map();
  byPath.forEach((ids, path) => {
    folderChain(path).slice(1).forEach((ancestor) => {
      if (!descendantSizes.has(ancestor)) descendantSizes.set(ancestor, new Set());
      descendantSizes.get(ancestor).add(ids.length);
    });
  });
  return [...byPath.entries()]
    .filter(([path, ids]) => ids.length >= minSize && !descendantSizes.get(path)?.has(ids.length))
    .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))
    .slice(0, max)
    .map(([path, ids]) => ({ path, name: folderLabelName(path), ids }));
};
