// @maia:assetStore — project asset files on disk (Tauri only; web keeps base64 in localStorage)
// All Tauri imports are dynamic so the web/PWA bundle never touches them.
import { getVaultPath } from "./vault.js";

const ASSETS_SUBDIR = ".maia-assets";

export const assetsDir = (vaultPath) => `${vaultPath.replace(/\/+$/, "")}/${ASSETS_SUBDIR}`;

const joinPath = (dir, name) => `${dir.replace(/\/+$/, "")}/${name}`;

/**
 * Writes `arrayBuffer` to `<vault>/.maia-assets/<projectId>/<assetId>-<filename>`,
 * creating the project's asset folder if needed. Returns the full path written —
 * callers persist this instead of a base64 dataUrl.
 */
export const saveAssetFile = async (vaultPath, projectId, assetId, filename, arrayBuffer) => {
  const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
  const dir = joinPath(assetsDir(vaultPath), projectId);
  await mkdir(dir, { recursive: true });
  const path = joinPath(dir, `${assetId}-${filename}`);
  await writeFile(path, new Uint8Array(arrayBuffer));
  return path;
};

/**
 * Removes a saved asset file. No-ops (doesn't throw) if it's already gone —
 * mirrors vault.js's deleteNoteFile defensive pattern.
 */
export const deleteAssetFile = async (path) => {
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (await exists(path)) {
    await remove(path);
  }
};

/** Reads a saved asset's raw bytes back off disk. */
export const readAssetFile = async (path) => {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return readFile(path);
};

/** Convenience: the vault-rooted assets dir for the currently configured vault, or null. */
export const currentAssetsDir = () => {
  const vaultPath = getVaultPath();
  return vaultPath ? assetsDir(vaultPath) : null;
};
