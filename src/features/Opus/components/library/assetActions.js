// Open and download for stored assets. Browser APIs only; the Tauri branch
// imports its plugins dynamically.
const BLOB_REVOKE_DELAY_MS = 60_000;

const dataUrlToBlob = (dataUrl, type) => {
  const bytes = atob(dataUrl.split(",")[1]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type });
};

/** Opens a web (base64) PDF in a new tab. Must run inside the click so popup blockers allow it. */
export const openPdf = (asset) => {
  const url = URL.createObjectURL(dataUrlToBlob(asset.dataUrl, "application/pdf"));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
};

const browserSave = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
};

/**
 * Saves a copy of the asset: native Save dialog when `readBytes` is given (a file
 * in the vault), a download in the browser for base64 assets. Resolves false if
 * the person cancels the dialog.
 */
export const downloadAsset = async (asset, readBytes) => {
  if (readBytes) {
    const bytes = await readBytes(asset);
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const target = await save({ defaultPath: asset.name });
    if (!target) return false;
    await writeFile(target, bytes);
    return true;
  }
  browserSave(dataUrlToBlob(asset.dataUrl, asset.type || "application/octet-stream"), asset.name);
  return true;
};
