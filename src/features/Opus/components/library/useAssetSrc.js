/** Web/PWA assets carry their bytes as a base64 data URL; file-mode previews come from useAssetPreviews. */
export const webAssetSrc = (asset) => asset.dataUrl ?? null;
