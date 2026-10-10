// Finds attachments (images, pdfs, ...) in the vault the way Obsidian does. The resolver is
// pure; only listVaultFiles / getVaultFileIndex touch the disk, and they list names only.
import { isSkippedDir, isNoteFile, joinRel, mapLimit } from './vaultFolders.js';

export const MAX_INDEXED_FILES = 50000;
const LIST_CONCURRENCY = 8;
// Files dropped in from Finder raise no watcher event (it only reports .md), so a miss
// may rebuild the index, but never more often than this.
const REBUILD_MIN_MS = 10000;

const KINDS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
  audio: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'ogv'],
};

const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
};

/** image | pdf | audio | video | note (no extension or .md) | file */
export const fileKind = (name = '') => {
  const ext = extensionOf(name);
  if (ext === '' || ext === 'md') return 'note';
  return Object.keys(KINDS).find((kind) => KINDS[kind].includes(ext)) ?? 'file';
};

const segmentCount = (path) => path.split('/').length;
// Shortest path wins, like Obsidian; the rest only keeps the choice stable between loads.
const byShortest = (a, b) => segmentCount(a) - segmentCount(b) || a.length - b.length || a.localeCompare(b);

export const buildFileIndex = (paths) => {
  const exact = new Map();
  const names = new Map();
  for (const path of paths) {
    const lower = path.toLowerCase();
    exact.set(lower, path);
    const base = lower.slice(lower.lastIndexOf('/') + 1);
    names.set(base, [...(names.get(base) ?? []), path]);
  }
  for (const list of names.values()) list.sort(byShortest);
  return { exact, names, paths: [...paths] };
};

/** Collapses . and .. segments; null when the path climbs out of the vault. */
export const normalizeRel = (path) => {
  const out = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part !== '..') out.push(part);
    else if (out.pop() === undefined) return null;
  }
  return out.join('/');
};

/**
 * Finds the vault file a link points at. A name with a folder in it is tried relative to the
 * note first, then from the vault root, then as the tail of any path. A bare name is searched
 * everywhere (shortest path wins); `preferRelative` (markdown links) tries the note's folder first.
 */
export const resolveVaultFile = (index, target, fromFolder = '', { preferRelative = false } = {}) => {
  const wanted = target.trim().replace(/^\/+/, '');
  if (!wanted) return null;
  const lower = wanted.toLowerCase();
  const hasFolder = wanted.includes('/');

  if (hasFolder || preferRelative) {
    const relative = normalizeRel(joinRel(fromFolder, wanted));
    const hit = relative && index.exact.get(relative.toLowerCase());
    if (hit) return hit;
  }
  if (hasFolder) {
    const root = normalizeRel(wanted);
    const hit = root && index.exact.get(root.toLowerCase());
    if (hit) return hit;
    const tail = `/${lower}`;
    return index.paths.filter((path) => path.toLowerCase().endsWith(tail)).sort(byShortest)[0] ?? null;
  }
  return index.names.get(lower)?.[0] ?? null;
};

/** Lists every non-note file under the vault, breadth first. Names only, never contents. */
export const listVaultFiles = async (vaultPath, readDir, { limit = MAX_INDEXED_FILES } = {}) => {
  const files = [];
  let level = [''];
  while (level.length > 0 && files.length < limit) {
    const listings = await mapLimit(level, LIST_CONCURRENCY, async (dir) => {
      try {
        return { dir, entries: await readDir(dir ? joinRel(vaultPath, dir) : vaultPath) };
      } catch (e) {
        console.error(`[MAIA] Failed to list vault folder "${dir}"`, e);
        return { dir, entries: [] };
      }
    });
    level = [];
    for (const { dir, entries } of listings) {
      for (const entry of entries) {
        const rel = joinRel(dir, entry.name);
        if (entry.isDirectory) {
          if (!isSkippedDir(entry.name, dir === '')) level.push(rel);
        } else if (entry.isFile && !entry.name.startsWith('.') && !isNoteFile(entry.name) && files.length < limit) {
          files.push(rel);
        }
      }
    }
  }
  return files.sort();
};

let cached = null; // { vaultPath, promise, builtAt }

export const invalidateVaultFileIndex = () => {
  cached = null;
};

/** One index per vault, built on first use. */
export const getVaultFileIndex = (vaultPath) => {
  if (cached?.vaultPath === vaultPath) return cached.promise;
  const promise = import('@tauri-apps/plugin-fs')
    .then(({ readDir }) => listVaultFiles(vaultPath, readDir))
    .then(buildFileIndex);
  const entry = { vaultPath, promise, builtAt: Date.now() };
  cached = entry;
  promise.catch(() => {
    if (cached === entry) cached = null; // a failed listing must not stick
  });
  return promise;
};

/** Resolves against the cached index; one retry on a miss if the index is not fresh. */
export const findVaultFile = async (vaultPath, target, fromFolder, options) => {
  const first = resolveVaultFile(await getVaultFileIndex(vaultPath), target, fromFolder, options);
  if (first || !cached || Date.now() - cached.builtAt < REBUILD_MIN_MS) return first;
  invalidateVaultFileIndex();
  return resolveVaultFile(await getVaultFileIndex(vaultPath), target, fromFolder, options);
};
