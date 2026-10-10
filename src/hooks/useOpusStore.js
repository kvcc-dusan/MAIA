import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { useOpusFiles } from "./opus/useOpusFiles.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { isTauri, getVaultPath } from "../lib/vault.js";

const IS_TAURI = isTauri();

const readVaultPath = () => {
  if (!IS_TAURI) return null;
  try {
    return getVaultPath() || null;
  } catch {
    return null;
  }
};

const noopAsync = async () => {};
const never = () => false;

/**
 * Projects and tasks storage seam, same shape in both modes:
 *   [{ projects, tasks }, { setProjects, setTasks }, meta]
 * - browser (web, or Tauri without a vault): localStorage, exactly as before.
 * - files (Tauri with a vault): Markdown files under <vault>/Opus/.
 *
 * Both localStorage hooks always run so hook order never changes when the vault
 * appears. In files mode they only hold the untouched legacy copy.
 * meta: { mode: 'files' | 'browser', status, error, warnings, reload, flush, hasPending }
 */
export function useOpusStore() {
  const [localProjects, setLocalProjects] = useLocalStorage(STORAGE_KEYS.PROJECTS, []);
  const [localTasks, setLocalTasks] = useLocalStorage(STORAGE_KEYS.TASKS, []);
  const vaultPath = readVaultPath();
  const files = useOpusFiles(vaultPath);
  const isFiles = Boolean(vaultPath);

  const { status, error, warnings, reload, flush, hasPending } = files;
  const meta = useMemo(() => (
    isFiles
      ? { mode: "files", status, error, warnings, reload, flush, hasPending }
      : { mode: "browser", status: "ready", error: null, warnings: [], reload: noopAsync, flush: noopAsync, hasPending: never }
  ), [isFiles, status, error, warnings, reload, flush, hasPending]);

  const state = useMemo(
    () => (isFiles ? files.data : { projects: localProjects, tasks: localTasks }),
    [isFiles, files.data, localProjects, localTasks],
  );
  const setters = useMemo(
    () => (isFiles
      ? { setProjects: files.setProjects, setTasks: files.setTasks }
      : { setProjects: setLocalProjects, setTasks: setLocalTasks }),
    [isFiles, files.setProjects, files.setTasks, setLocalProjects, setLocalTasks],
  );
  return [state, setters, meta];
}
