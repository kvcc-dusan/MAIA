import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "../../lib/ids.js";
import { isTauri, getVaultPath } from "../../lib/vault.js";
import { getOpusApi } from "./opusOps.js";
import { subscribeAssetsChanged } from "./assetEvents.js";
import { ASSET_ERRORS, validateFile } from "../../features/Opus/components/library/assetRules.js";

const NO_ASSETS = [];

/** The vault folder in file mode (Tauri with a vault picked), else null. */
export const readFileModeVault = () => {
  if (!isTauri()) return null;
  try {
    return getVaultPath() || null;
  } catch {
    return null;
  }
};

const sameList = (a, b) =>
  a.length === b.length && a.every((x, i) => x.name === b[i].name && x.size === b[i].size && x.mtimeMs === b[i].mtimeMs);

/**
 * A project's files from <vault>/Opus/<Project>/assets/, kept in sync with the
 * disk: re-listed after our own adds/deletes, on watcher events and after each
 * Opus reload. Idle (empty, no IO) in browser mode, which keeps using
 * project.assets through useAssetUploads.
 */
export const useProjectAssets = (projectId) => {
  const vaultPath = readFileModeVault();
  const [assets, setAssets] = useState(NO_ASSETS);
  const [pending, setPending] = useState(NO_ASSETS);
  const [errors, setErrors] = useState(NO_ASSETS);
  const requestRef = useRef(0);

  const fail = useCallback((name, message) => setErrors((prev) => [...prev, { id: uid(), name, message }]), []);

  const refresh = useCallback(async () => {
    if (!vaultPath) return;
    const request = (requestRef.current += 1);
    try {
      const api = await getOpusApi();
      const next = await api.listAssets(vaultPath, projectId);
      if (request === requestRef.current) setAssets((prev) => (sameList(prev, next) ? prev : next));
    } catch (e) {
      // A project without a folder yet (or mid-reload) simply shows what it had.
      console.warn("[MAIA] Could not list project assets", e);
    }
  }, [vaultPath, projectId]);

  useEffect(() => {
    requestRef.current += 1; // drop answers for the previous project
    setAssets(NO_ASSETS);
    if (!vaultPath) return undefined;
    refresh();
    return subscribeAssetsChanged(refresh);
  }, [vaultPath, projectId, refresh]);

  const addFiles = useCallback(async (fileList) => {
    if (!vaultPath) return;
    const accepted = [];
    Array.from(fileList).forEach((file) => {
      const problem = validateFile(file, { isDisk: true });
      if (problem) fail(file.name, problem.message);
      else accepted.push({ file, id: uid() });
    });
    setPending((prev) => [...prev, ...accepted.map(({ file, id }) => ({ id, name: file.name }))]);
    const api = await getOpusApi();
    for (const { file, id } of accepted) {
      try {
        await api.saveAsset(vaultPath, projectId, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      } catch (e) {
        console.error(`[MAIA] Failed to save asset "${file.name}"`, e);
        fail(file.name, /no folder yet/.test(e?.message ?? "") ? ASSET_ERRORS.noFolder(file.name) : ASSET_ERRORS.disk(file.name));
      }
      setPending((prev) => prev.filter((p) => p.id !== id));
      await refresh();
    }
  }, [vaultPath, projectId, fail, refresh]);

  const removeAsset = useCallback(async (asset) => {
    if (!vaultPath) return;
    try {
      await (await getOpusApi()).deleteAsset(vaultPath, projectId, asset.name);
    } catch (e) {
      console.error(`[MAIA] Failed to delete asset "${asset.name}"`, e);
      fail(asset.name, ASSET_ERRORS.remove(asset.name));
    }
    await refresh();
  }, [vaultPath, projectId, fail, refresh]);

  const readBytes = useCallback(
    async (asset) => (await getOpusApi()).readAsset(vaultPath, projectId, asset.name),
    [vaultPath, projectId],
  );

  const dismissError = useCallback((id) => setErrors((prev) => prev.filter((e) => e.id !== id)), []);

  return { isFileMode: Boolean(vaultPath), assets, pending, errors, addFiles, removeAsset, dismissError, reportError: fail, readBytes };
};
