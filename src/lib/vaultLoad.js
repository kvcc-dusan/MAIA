// @maia:vault — read side of the vault loader: folder walk plus an mtime+size file cache.
// No Tauri imports here (fs functions are passed in) so it stays unit-testable.
//
// Why a cache: the real vault sits on a cloud drive, where reading a file is far slower
// than stat-ing it. A reload stats every note and only reads the ones that changed.
//
// Known limit: a file rewritten with the same size inside the same mtime tick is not seen
// by a reload. It is never a data-loss path, because saveNote always compares the real
// disk text against its baseline before writing. The TRUST window below shrinks the gap:
// a file modified moments before a read is not trusted on the next reload.
import { markdownToNote } from "./noteFile.js";
import { stableId } from "./stableId.js";
import { isSkippedDir, isNoteFile, joinRel, relDir, relBase, normalizeFolderList, mapLimit } from "./vaultFolders.js";

export const READ_CONCURRENCY = 8;
const STAT_CONCURRENCY = 16;
// An mtime this close to the read could still be shared with a later write.
const TRUST_AGE_MS = 2000;
const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

export const joinPath = (dir, name) => `${dir.replace(/\/+$/, "")}/${name}`;

// Vault is on a cloud drive: list folders level by level, a few at a time.
export const walkVault = async (vaultPath, readDir) => {
  const files = [];
  const folders = [];
  let level = [""];
  while (level.length > 0) {
    const listings = await mapLimit(level, READ_CONCURRENCY, async (dir) => {
      try {
        return { dir, entries: await readDir(dir ? joinPath(vaultPath, dir) : vaultPath) };
      } catch (e) {
        if (dir === "") throw e; // the vault itself unreadable = a failed load, not an empty vault
        console.error(`[MAIA] Failed to list vault folder "${dir}"`, e);
        return { dir, entries: [] };
      }
    });
    level = [];
    for (const { dir, entries } of listings) {
      for (const entry of entries) {
        const rel = joinRel(dir, entry.name);
        if (entry.isDirectory) {
          if (isSkippedDir(entry.name, dir === "")) continue;
          folders.push(rel);
          level.push(rel);
        } else if (entry.isFile && isNoteFile(entry.name)) {
          files.push(rel);
        }
      }
    }
  }
  return { files: files.sort(), folders };
};

const toMs = (value) => {
  if (value == null) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const safeStat = async (stat, path) => {
  try {
    const info = await stat(path);
    return { mtimeMs: toMs(info?.mtime), birthMs: toMs(info?.birthtime), size: typeof info?.size === "number" ? info.size : null };
  } catch {
    return null; // unknown state: the caller must read for real
  }
};

// The cached text is only reusable when stat succeeded and both mtime and size are
// exactly what they were at the last read. A backwards mtime (cloud drives do this)
// or a different size is a change like any other.
const isFresh = (entry, stat) =>
  !!entry && entry.trusted && stat !== null && stat.mtimeMs !== null && stat.size !== null &&
  entry.mtimeMs === stat.mtimeMs && entry.size === stat.size;

// Obsidian notes usually have no createdAt; the file time keeps their order
// stable instead of stamping "now" on every load.
const fileCreatedAtOf = (stat, text) => {
  if (/^createdAt:/m.test(text.slice(0, 4000))) return undefined;
  const ms = stat?.mtimeMs ?? stat?.birthMs;
  return ms == null ? EPOCH_ISO : new Date(ms).toISOString();
};

/**
 * Stats every file, reads only the stale ones. `cache` is rel -> entry from the
 * previous load and is never mutated; the returned `nextCache` holds exactly the
 * files that exist now (deleted ones are dropped). Entries: { mtimeMs, size, trusted,
 * text, fileCreatedAt, note, final }, where note/final are filled in by the caller.
 * Results keep input order; `error: true` marks a file that could not be read.
 */
export const readFiles = async ({ vaultPath, files, cache, stat, readTextFile, now = Date.now() }) => {
  const stats = await mapLimit(files, STAT_CONCURRENCY, (rel) => safeStat(stat, joinPath(vaultPath, rel)));
  const fresh = files.map((rel, i) => isFresh(cache.get(rel), stats[i]));
  const stale = files.map((_, i) => i).filter((i) => !fresh[i]);

  const reads = new Map();
  await mapLimit(stale, READ_CONCURRENCY, async (i) => {
    const rel = files[i];
    try {
      const text = await readTextFile(joinPath(vaultPath, rel));
      const st = stats[i];
      // stat ran before the read: if the file changed in between, the cached stat is
      // older than the text, so the next reload reads again (the safe direction).
      reads.set(rel, {
        mtimeMs: st?.mtimeMs ?? null,
        birthMs: st?.birthMs ?? null,
        size: st?.size ?? null,
        trusted: st !== null && st.mtimeMs !== null && st.size !== null && now - st.mtimeMs > TRUST_AGE_MS,
        text,
        fileCreatedAt: fileCreatedAtOf(st, text),
        note: null,
        final: null,
      });
    } catch (e) {
      console.error(`[MAIA] Failed to read vault file "${rel}"`, e);
      reads.set(rel, null);
    }
  });

  const nextCache = new Map();
  const results = files.map((rel) => {
    const entry = reads.has(rel) ? reads.get(rel) : cache.get(rel);
    if (!entry) return { rel, error: true };
    nextCache.set(rel, entry);
    return { rel, entry };
  });
  return { results, nextCache, reads: stale.length };
};

// Parsing is cached per file entry; the final note object is reused while its id is
// unchanged, so an untouched note keeps its identity across reloads (no needless re-render).
const baseNote = (rel, entry) => {
  if (!entry.note) {
    entry.note = markdownToNote(entry.text, {
      fallbackId: stableId(rel),
      fallbackTitle: relBase(rel).replace(/\.md$/i, ""),
      fallbackCreatedAt: entry.fileCreatedAt,
    });
  }
  return entry.note;
};

const timeOr = (ms, fallbackIso) => {
  if (ms != null) return ms;
  const parsed = new Date(fallbackIso).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

// modifiedAt / birthAt are for sorting only. They are read from the file system on every
// load and are not frontmatter keys, so noteToMarkdown never writes them.
const noteFor = (rel, entry, id) => {
  if (entry.final && entry.final.id === id) return entry.final;
  const base = baseNote(rel, entry);
  entry.final = {
    ...base,
    id,
    folder: relDir(rel),
    modifiedAt: timeOr(entry.mtimeMs, base.createdAt),
    birthAt: timeOr(entry.birthMs, base.createdAt),
  };
  return entry.final;
};

export const snapshotVault = async (vaultPath, fs, fileCache) => {
  const { files, folders } = await walkVault(vaultPath, fs.readDir);
  const { results, nextCache, reads } = await readFiles({ vaultPath, files, cache: fileCache, stat: fs.stat, readTextFile: fs.readTextFile });

  const notes = [];
  const nextMap = new Map();
  const nextContentMap = new Map();
  const nextUnreadable = new Set();

  for (const { rel, entry, error } of results) {
    if (error) {
      nextUnreadable.add(rel);
      nextCache.delete(rel);
      continue;
    }
    try {
      let id = baseNote(rel, entry).id;
      if (nextMap.has(id)) {
        // Don't just drop the loser — a silently vanished note is a data-loss
        // bug in its own right. Give it a fresh id so both survive as
        // separate notes; the user can tell them apart and delete the dupe.
        // Derived from the path so it is the same on every load.
        console.warn(`[MAIA] Duplicate note id "${id}" in vault ("${rel}") — reassigning a new id so both are kept`);
        id = stableId(`${rel}#dup`);
      }
      const note = noteFor(rel, entry, id);
      nextMap.set(note.id, rel);
      nextContentMap.set(note.id, entry.text);
      notes.push(note);
    } catch (e) {
      console.error(`[MAIA] Failed to parse vault file "${rel}"`, e);
      nextUnreadable.add(rel);
      nextCache.delete(rel);
    }
  }
  notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
  return {
    notes, nextMap, nextContentMap, nextUnreadable, nextCache,
    folders: normalizeFolderList([...folders, ...notes.map((n) => n.folder)]),
    stats: { files: files.length, reads, reused: files.length - reads },
  };
};

