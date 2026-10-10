// @maia:vault — pure folder/path rules for nested vault notes (no IO, no Tauri).
// Shared by src/lib/vault.js and mcp/tools/notes.js so both agree on what is a note.

// Top-level folders that hold MAIA's own files, never notes.
export const RESERVED_ROOT_DIRS = ["Opus", "_backups"];
const SKIPPED_DIRS = ["node_modules"];
export const MAX_FOLDER_SEGMENT = 100;

const lower = (s) => s.toLowerCase();
const isReservedRoot = (name) => RESERVED_ROOT_DIRS.some((r) => lower(r) === lower(name));

/** Directory the loader must not enter. `atRoot` = the entry sits directly in the vault. */
export const isSkippedDir = (name, atRoot) =>
  name.startsWith(".") || SKIPPED_DIRS.includes(name) || (atRoot && isReservedRoot(name));

/** A note file: .md, and not a hidden file like macOS "._x.md" resource forks. */
export const isNoteFile = (name) => !name.startsWith(".") && /\.md$/i.test(name);

export const relDir = (rel) => (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "");
export const relBase = (rel) => rel.slice(rel.lastIndexOf("/") + 1);
export const joinRel = (folder, name) => (folder ? `${folder}/${name}` : name);

/** Every ancestor of a folder path, itself included: "a/b" -> ["a", "a/b"]. */
export const withAncestors = (folder) => {
  const parts = folder.split("/").filter(Boolean);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
};

/** Sorted, de-duplicated folder list that includes every ancestor of every entry. */
export const normalizeFolderList = (folders) =>
  [...new Set(folders.flatMap(withAncestors))].sort((a, b) => a.localeCompare(b));

// Illegal on macOS/Windows, plus # ^ [ ] which break Obsidian links.
// eslint-disable-next-line no-control-regex
const ILLEGAL_SEGMENT = /[\u0000-\u001f\u007f\\:*?"<>|#^[\]]/;

/**
 * Validates a folder path for creating or moving into. Returns it unchanged,
 * throws a readable Error otherwise. "" (the vault root) is only valid when
 * `allowRoot` is set.
 */
export const validateFolderPath = (path, { allowRoot = false } = {}) => {
  if (typeof path !== "string") throw new Error("Folder path must be text.");
  if (path === "" && allowRoot) return "";
  if (path.trim() === "") throw new Error("Folder name is empty.");
  const segments = path.split("/");
  segments.forEach((seg) => {
    if (seg === "") throw new Error(`"${path}" has an empty folder name, leading slash or trailing slash.`);
    if (seg === "." || seg === "..") throw new Error(`"${path}" may not contain "." or "..".`);
    if (seg.startsWith(".")) throw new Error(`Folder "${seg}" starts with a dot, which MAIA keeps hidden.`);
    if (ILLEGAL_SEGMENT.test(seg)) throw new Error(`Folder "${seg}" has characters that are not allowed.`);
    if (seg !== seg.trim() || /[. ]$/.test(seg)) throw new Error(`Folder "${seg}" can't start or end with a space or end with a dot.`);
    if (seg.length > MAX_FOLDER_SEGMENT) throw new Error(`Folder "${seg.slice(0, 20)}..." is too long.`);
  });
  if (isReservedRoot(segments[0]) || SKIPPED_DIRS.includes(segments[0])) {
    throw new Error(`"${segments[0]}" is reserved and can't hold notes.`);
  }
  return path;
};

/** Runs `fn` over `items` with at most `limit` in flight; results keep input order. */
export const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

/** Vault-relative "/" path of a watcher event path, or null when it is outside the vault. */
export const toRelPath = (vaultPath, eventPath) => {
  const root = vaultPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const p = String(eventPath).replace(/\\/g, "/");
  return p.startsWith(`${root}/`) ? p.slice(root.length + 1) : null;
};

/**
 * Could a change at this vault-relative path affect the note list? False for
 * dot folders, Opus/, node_modules and files that are not .md (cloud-drive
 * temp files). Folders (no dot in the last segment) count as relevant.
 */
export const isNotePath = (rel) => {
  const segments = rel.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments.some((s) => s.startsWith(".") || SKIPPED_DIRS.includes(s))) return false;
  if (isReservedRoot(segments[0])) return false;
  const last = segments[segments.length - 1];
  return /\.md$/i.test(last) || !last.includes(".");
};
