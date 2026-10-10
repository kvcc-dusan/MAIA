import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "@/lib/ids";
import { isTauri, getVaultPath } from "@/lib/vault.js";
import { saveAssetFile, deleteAssetFile } from "@/lib/assetStore.js";
import { ASSET_ERRORS, base64Length, validateFile, webAssetsUsage } from "./assetRules";

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });

/**
 * Adds and removes a project's assets. In Tauri with a vault picked, files go
 * to `<vault>/.maia-assets/<projectId>/`; otherwise they stay base64 in the
 * project (web/PWA).
 *
 * Writes go through a ref holding the newest list: updateProject merges a
 * patch, so computing `[...project.assets, one]` per file from a render-time
 * closure made a multi-file drop keep only the last file.
 */
export const useAssetUploads = ({ project, updateProject }) => {
  const assetsRef = useRef(project.assets ?? []);
  useEffect(() => {
    assetsRef.current = project.assets ?? [];
  });

  const [pending, setPending] = useState([]);
  const [errors, setErrors] = useState([]);

  const write = useCallback(
    (next) => {
      assetsRef.current = next;
      updateProject(project.id, { assets: next });
    },
    [project.id, updateProject]
  );

  const fail = useCallback((name, message) => setErrors((prev) => [...prev, { id: uid(), name, message }]), []);

  const storeOne = useCallback(async (file, vaultPath, id) => {
    const base = { id, name: file.name, type: file.type, createdAt: new Date().toISOString() };
    if (vaultPath) {
      try {
        const path = await saveAssetFile(vaultPath, project.id, id, file.name, await file.arrayBuffer());
        return { ...base, path };
      } catch (e) {
        console.error(`[MAIA] Failed to save asset "${file.name}" to disk`, e);
        fail(file.name, ASSET_ERRORS.disk(file.name));
        return null;
      }
    }
    try {
      return { ...base, dataUrl: await readAsDataUrl(file) };
    } catch (e) {
      console.error(`[MAIA] Failed to read asset "${file.name}"`, e);
      fail(file.name, ASSET_ERRORS.read(file.name));
      return null;
    }
  }, [fail, project.id]);

  const addFiles = useCallback(
    async (fileList) => {
      const vaultPath = isTauri() ? getVaultPath() : null;
      let usage = webAssetsUsage(assetsRef.current);
      const accepted = [];
      Array.from(fileList).forEach((file) => {
        const problem = validateFile(file, { isDisk: Boolean(vaultPath), usage });
        if (problem) {
          fail(file.name, problem.message);
          return;
        }
        usage += base64Length(file.size);
        accepted.push({ file, id: uid() });
      });
      setPending((prev) => [...prev, ...accepted.map(({ file, id }) => ({ id, name: file.name }))]);

      for (const { file, id } of accepted) {
        const asset = await storeOne(file, vaultPath, id);
        if (asset) write([...assetsRef.current, asset]);
        setPending((prev) => prev.filter((p) => p.id !== id));
      }
    },
    [write, fail, storeOne]
  );

  const removeAsset = useCallback(
    async (asset) => {
      if (asset.path && isTauri()) await deleteAssetFile(asset.path).catch(console.error);
      write(assetsRef.current.filter((a) => a.id !== asset.id));
    },
    [write]
  );

  const dismissError = useCallback((id) => setErrors((prev) => prev.filter((e) => e.id !== id)), []);

  return { pending, errors, addFiles, removeAsset, dismissError, reportError: fail };
};
