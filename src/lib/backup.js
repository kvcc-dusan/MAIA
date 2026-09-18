// @maia:backup — export every entity to a single portable JSON file.
//
// Every entity except notes (in Tauri) lives only in localStorage today
// (see STATE_OF_MAIA.md) — there was previously no way to get your data out
// of the app at all. This is a plain, dependency-free snapshot: one file,
// human-readable, importable back in with `restoreBackup`.

export const BACKUP_VERSION = 1;

/**
 * @param {{
 *   notes: any[], projects: any[], tasks: any[],
 *   reminders: any[], sessions: any[], ledger: any[],
 * }} data
 */
export function buildBackup(data) {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "MAIA",
    data: {
      notes: data.notes ?? [],
      projects: data.projects ?? [],
      tasks: data.tasks ?? [],
      reminders: data.reminders ?? [],
      sessions: data.sessions ?? [],
      ledger: data.ledger ?? [],
    },
  };
}

export function backupFilename(date = new Date()) {
  const stamp = date.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
  return `maia-backup-${stamp}.json`;
}

/**
 * Validates a parsed backup file before it's allowed anywhere near
 * setNotes/setProjects/etc. A malformed file should fail loudly here, not
 * halfway through overwriting real data.
 */
export function parseBackup(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!json || typeof json !== "object" || !json.data || typeof json.data !== "object") {
    throw new Error("That doesn't look like a MAIA backup file.");
  }
  const shape = ["notes", "projects", "tasks", "reminders", "sessions", "ledger"];
  for (const key of shape) {
    if (json.data[key] !== undefined && !Array.isArray(json.data[key])) {
      throw new Error(`Backup field "${key}" is malformed (expected a list).`);
    }
  }
  return {
    version: json.version ?? 0,
    exportedAt: json.exportedAt ?? null,
    data: {
      notes: json.data.notes ?? [],
      projects: json.data.projects ?? [],
      tasks: json.data.tasks ?? [],
      reminders: json.data.reminders ?? [],
      sessions: json.data.sessions ?? [],
      ledger: json.data.ledger ?? [],
    },
  };
}

/**
 * Writes the backup to disk. Uses the native Save dialog under Tauri;
 * falls back to a browser download in the web build.
 * @returns {Promise<boolean>} whether a file was actually written (false = user cancelled)
 */
export async function downloadBackup(data) {
  const backup = buildBackup(data);
  const json = JSON.stringify(backup, null, 2);
  const filename = backupFilename();

  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: filename,
      filters: [{ name: "MAIA Backup", extensions: ["json"] }],
    });
    if (!path) return false;
    await writeTextFile(path, json);
    return true;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return true;
}

/**
 * Reads a backup file the user picked (native dialog under Tauri, a File
 * object from an <input type="file"> in the web build) and returns the
 * validated payload. Does not touch app state — the caller decides how to
 * merge/replace.
 */
export async function readBackupFile(fileOrPath) {
  let raw;
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__ && typeof fileOrPath === "string") {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    raw = await readTextFile(fileOrPath);
  } else {
    raw = await fileOrPath.text();
  }
  return parseBackup(raw);
}
