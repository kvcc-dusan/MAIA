// @maia:opusFiles - recursive watcher for the Opus/ tree, modelled on watchVault.
import { loadFs, opusRoot, state, isHidden, ASSETS_DIR, ACTIVITY_FILE, BACKUPS_DIR, TRASH_DIR } from "./opusFs.js";

// _backups/ and _trash/ at the Opus root hold no live data; _trash keeps .md files that must not look like tasks.
const isReservedPath = (root, path) => {
  const first = path.startsWith(`${root}/`) ? path.slice(root.length + 1).split("/")[0] : "";
  return first === BACKUPS_DIR || first === TRASH_DIR;
};

const isRelevant = (path) => {
  const segments = path.split("/");
  const last = segments[segments.length - 1];
  if (segments.some((s) => s !== "" && isHidden(s))) return false;
  return /\.md$/i.test(last) || !last.includes(".");
};

// <Project>/assets/** : any file type counts, and it never means a project or task changed.
const isAssetPath = (root, path) => {
  const segments = path.startsWith(`${root}/`) ? path.slice(root.length + 1).split("/") : [];
  return segments.length >= 2 && segments[1] === ASSETS_DIR && !segments.some(isHidden);
};

// <Project>/activity.jsonl or _inbox/activity.jsonl: reported on its own, never as a project/task change.
const isActivityPath = (root, path) => {
  const segments = path.startsWith(`${root}/`) ? path.slice(root.length + 1).split("/") : [];
  return segments.length === 2 && segments[1] === ACTIVITY_FILE && !isHidden(segments[0]);
};

// Our own writes echo back as events; drop paths whose disk text equals what we remember.
const isOwnEcho = async (fs, path, byPath) => {
  const entry = byPath.get(path);
  if (!entry) return false;
  try {
    return (await fs.exists(path)) && (await fs.readTextFile(path)) === entry.text;
  } catch {
    return false;
  }
};

/**
 * Calls onChange({ paths }) (debounced, own writes filtered out) when files
 * under Opus/ change outside MAIA. Changes inside a project's assets/ go to
 * onAssetsChange({ paths }), and activity.jsonl files to onActivityChange({ paths }),
 * so neither causes a project/task write. Returns an unwatch function. If Opus/ does
 * not exist yet it resolves to a no-op: call it again after the folder exists.
 */
export const watchOpus = async (vaultPath, onChange, { debounceMs = 400, onAssetsChange, onActivityChange } = {}) => {
  const fs = await loadFs();
  const root = opusRoot(vaultPath);
  if (!(await fs.exists(root))) return () => {};

  let timer = null;
  let pending = new Set();
  const flush = async () => {
    const all = [...pending];
    pending = new Set();
    const assetPaths = all.filter((p) => isAssetPath(root, p));
    const activityAll = all.filter((p) => isActivityPath(root, p));
    const paths = all.filter((p) => !isAssetPath(root, p) && !isActivityPath(root, p) && isRelevant(p) && !isReservedPath(root, p));
    const byPath = new Map([...state.tracked.values()].map((e) => [e.path, e]));
    const changed = [];
    for (const path of paths) if (!(await isOwnEcho(fs, path, byPath))) changed.push(path);
    const activityChanged = [];
    for (const path of activityAll) if (!(await isOwnEcho(fs, path, byPath))) activityChanged.push(path);
    if (changed.length > 0) onChange({ paths: changed });
    if (activityChanged.length > 0) onActivityChange?.({ paths: activityChanged });
    if (assetPaths.length > 0) onAssetsChange?.({ paths: assetPaths });
  };
  const unwatch = await fs.watchImmediate(
    root,
    (event) => {
      (event?.paths ?? []).forEach((p) => pending.add(p));
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, debounceMs);
    },
    { recursive: true },
  );
  return () => {
    if (timer) clearTimeout(timer);
    unwatch();
  };
};
