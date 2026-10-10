// A backup import replaces projects and tasks, which in file mode deletes the
// files that are not in the backup. This writes the current data next to the
// Opus folder's contents first. The dot prefix keeps it out of the Opus
// loader and watcher (they skip hidden names).
import { buildBackup } from "./backup.js";

// Same folder name as opusFiles OPUS_DIR; not imported so App does not pull in the YAML codecs.
const OPUS_FOLDER = "Opus";

const stampOf = (date) => date.toISOString().replace(/:/g, "-").replace(/\..+$/, "");

/** @returns {Promise<string>} the path written. Throws if the file cannot be written. */
export const writeOpusSafetyBackup = async (vaultPath, data, now = new Date()) => {
  const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
  const dir = `${vaultPath.replace(/\/+$/, "")}/${OPUS_FOLDER}`;
  const path = `${dir}/.backup-${stampOf(now)}.json`;
  await mkdir(dir, { recursive: true });
  await writeTextFile(path, JSON.stringify(buildBackup(data), null, 2));
  return path;
};
