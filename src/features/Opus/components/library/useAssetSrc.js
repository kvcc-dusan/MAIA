import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@/lib/vault.js";

/**
 * Resolves a displayable src for an asset: disk-backed (Tauri asset protocol)
 * or base64 (web/legacy). convertFileSrc is imported dynamically so the web
 * bundle never pulls in Tauri code; until it loads, disk assets have no src.
 */
export const useAssetSrc = () => {
  const [convert, setConvert] = useState(null);

  useEffect(() => {
    if (!isTauri()) return undefined;
    let cancelled = false;
    import("@tauri-apps/api/core").then(({ convertFileSrc }) => {
      if (!cancelled) setConvert(() => convertFileSrc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    (asset) => {
      if (!asset.path) return asset.dataUrl ?? null;
      return convert ? convert(asset.path) : null;
    },
    [convert]
  );
};
