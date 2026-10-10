// @maia:opusFiles - recursive watcher for the Opus/ tree, modelled on watchVault.
import { loadFs, opusRoot, state, isHidden } from "./opusFs.js";

const isRelevant = (path) => {
  const segments = path.split("/");
  const last = segments[segments.length - 1];
  if (segments.some((s) => s !== "" && isHidden(s))) return false;
  return /\.md$/i.test(last) || !last.includes(".");
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
 * under Opus/ change outside MAIA. Returns an unwatch function. If Opus/ does
 * not exist yet it resolves to a no-op: call it again after the folder exists.
 */
export const watchOpus = async (vaultPath, onChange, { debounceMs = 400 } = {}) => {
  const fs = await loadFs();
  const root = opusRoot(vaultPath);
  if (!(await fs.exists(root))) return () => {};

  let timer = null;
  let pending = new Set();
  const flush = async () => {
    const paths = [...pending].filter(isRelevant);
    pending = new Set();
    const byPath = new Map([...state.tracked.values()].map((e) => [e.path, e]));
    const changed = [];
    for (const path of paths) if (!(await isOwnEcho(fs, path, byPath))) changed.push(path);
    if (changed.length > 0) onChange({ paths: changed });
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
