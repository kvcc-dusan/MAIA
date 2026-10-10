import { useCallback, useEffect, useRef, useState } from "react";

// Bigger images show an icon instead of being read into memory for a thumbnail.
const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;

const keyOf = (asset) => `${asset.name}|${asset.size}|${asset.mtimeMs}`;
const isPreviewable = (asset) => asset.type?.startsWith("image/") && asset.size <= MAX_PREVIEW_BYTES;

/**
 * Blob URLs for image assets, read through the fs plugin. The asset protocol
 * has an empty scope in this app, so file URLs would not load.
 * `readBytes(asset)` resolves to the file's bytes.
 */
export const useAssetPreviews = (assets, readBytes, enabled) => {
  const [urls, setUrls] = useState(() => new Map());
  const urlsRef = useRef(new Map());
  const requestedRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) return;
    const live = new Set(assets.filter(isPreviewable).map(keyOf));
    for (const [key, url] of urlsRef.current) {
      if (!live.has(key)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }
    }
    requestedRef.current = new Set([...requestedRef.current].filter((key) => live.has(key)));
    assets.filter(isPreviewable).forEach((asset) => {
      const key = keyOf(asset);
      if (requestedRef.current.has(key)) return;
      requestedRef.current.add(key);
      readBytes(asset)
        .then((bytes) => {
          if (!requestedRef.current.has(key)) return;
          urlsRef.current.set(key, URL.createObjectURL(new Blob([bytes], { type: asset.type })));
          setUrls(new Map(urlsRef.current));
        })
        .catch((e) => console.warn(`[MAIA] No preview for "${asset.name}"`, e));
    });
    setUrls(new Map(urlsRef.current));
  }, [assets, readBytes, enabled]);

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = new Map();
  }, []);

  return useCallback((asset) => urls.get(keyOf(asset)) ?? null, [urls]);
};
