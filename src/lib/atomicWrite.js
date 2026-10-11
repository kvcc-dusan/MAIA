// Atomic saves for the Tauri adapters. Master switch: set ATOMIC_WRITES to false and every
// caller goes back to a plain in-place writeTextFile, exactly as before.
export const ATOMIC_WRITES = true;

// No leading dot: Tauri's fs scope does not match leading-dot path components.
export const TMP_SUFFIX = ".tmp";
export const tmpPathOf = (path) => `${path}${TMP_SUFFIX}`;

const isAlreadyExists = (e) => /already exists|file exists|EEXIST|os error (17|80)/i.test(String(e?.message ?? e));

/**
 * Writes `text` to `<path>.tmp`, then renames it over `path`, so a crash leaves either the old
 * file or the new one, never half of a note. A stale .tmp from an earlier crash is simply
 * overwritten. On failure the temp file is removed (best effort) and the error is rethrown,
 * and `path` is untouched. If the platform refuses to rename over an existing file
 * ("already exists"), falls back to a direct write of `path`.
 * `fs` is the @tauri-apps/plugin-fs module.
 */
export const writeTextAtomic = async (fs, path, text, { atomic = ATOMIC_WRITES } = {}) => {
  if (!atomic) {
    await fs.writeTextFile(path, text);
    return;
  }
  const tmp = tmpPathOf(path);
  const dropTmp = async () => {
    try {
      await fs.remove(tmp);
    } catch {
      // nothing to clean up, or not removable: the next save overwrites it anyway
    }
  };
  try {
    await fs.writeTextFile(tmp, text);
    await fs.rename(tmp, path);
  } catch (e) {
    if (!isAlreadyExists(e)) {
      await dropTmp();
      throw e;
    }
    try {
      await fs.writeTextFile(path, text);
    } finally {
      await dropTmp();
    }
  }
};
