// Pure helpers for the Codex file tree. Paths are "/"-separated, no leading or
// trailing slash; "" is the vault root.

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const byName = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);

export const normalizeFolder = (value) =>
  typeof value === "string" ? value.split("/").map((s) => s.trim()).filter(Boolean).join("/") : "";

/** "A/B/C" -> ["A", "A/B", "A/B/C"] */
export const ancestorPaths = (path) => {
  const parts = normalizeFolder(path).split("/").filter(Boolean);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
};

export const ROOT_LABEL = "Vault root";

export const folderName = (path) => path.slice(path.lastIndexOf("/") + 1);

const noteTitle = (note) => note.title || "Untitled";

/**
 * Builds the folder tree. Folders come from `folders` (empty ones included) and
 * from every note's own `folder`, with all ancestors filled in. Each folder node
 * carries `noteCount`, the number of notes in it and below.
 * Node: { path, name, folders: Node[], notes: Note[], noteCount }
 */
export const buildTree = (notes = [], folders = []) => {
  const nodes = new Map();
  const make = (path) => ({ path, name: path ? folderName(path) : "", folders: [], notes: [], noteCount: 0 });
  const root = make("");
  nodes.set("", root);

  const ensure = (path) => {
    let node = nodes.get(path);
    if (node) return node;
    node = make(path);
    nodes.set(path, node);
    const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    ensure(parentPath).folders.push(node);
    return node;
  };

  for (const f of folders ?? []) {
    for (const p of ancestorPaths(f)) ensure(p);
  }
  for (const note of notes ?? []) {
    const path = normalizeFolder(note.folder);
    for (const p of ancestorPaths(path)) ensure(p);
    ensure(path).notes.push(note);
  }

  const finish = (node) => {
    node.folders.sort((a, b) => byName(a.name, b.name));
    node.notes.sort((a, b) => byName(noteTitle(a), noteTitle(b)));
    node.noteCount = node.notes.length + node.folders.reduce((sum, child) => sum + finish(child), 0);
    return node.noteCount;
  };
  finish(root);
  return root;
};

/** All folder paths in the tree, sorted as they appear (depth-first). */
export const listFolderPaths = (root) => {
  const out = [];
  const walk = (node) => {
    for (const child of node.folders) {
      out.push(child.path);
      walk(child);
    }
  };
  walk(root);
  return out;
};

/**
 * Flattens the tree into the rows that are visible given the expanded set.
 * Row: { key, type: "folder"|"note", depth, path, name, note?, noteCount?, isExpanded?, parentKey }
 */
export const flattenTree = (root, expanded) => {
  const rows = [];
  const walk = (node, depth, parentKey) => {
    for (const child of node.folders) {
      const isExpanded = expanded.has(child.path);
      const key = `f:${child.path}`;
      rows.push({ key, type: "folder", depth, path: child.path, name: child.name, noteCount: child.noteCount, isExpanded, parentKey });
      if (isExpanded) walk(child, depth + 1, key);
    }
    for (const note of node.notes) {
      rows.push({ key: `n:${note.id}`, type: "note", depth, path: node.path, name: noteTitle(note), note, parentKey });
    }
  };
  walk(root, 0, null);
  return rows;
};
