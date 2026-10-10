// Project asset rules: size limits, the web storage budget and file typing.
// Types are not restricted: any file can be added.
// Pure, no React, so the limits are testable without a file picker.

// Per-file cap in the web build, where files become base64 in localStorage.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Per-file cap for files written into the vault (any type; read into memory once).
export const MAX_DISK_FILE_BYTES = 250 * 1024 * 1024;

// Total base64 budget per project in the web/localStorage fallback. The
// per-file cap alone doesn't stop many-small-files quota exhaustion, since all
// projects share the one `maia.projects` localStorage key.
export const MAX_WEB_ASSETS_BASE64_BYTES = 20 * 1024 * 1024;

export const isImageType = (type) => Boolean(type) && type.startsWith("image/");
export const isPdfType = (type) => type === "application/pdf";

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Length of the base64 text a file of `bytes` becomes (what the budget counts). */
export const base64Length = (bytes) => Math.ceil(bytes / 3) * 4;

/** Base64 characters the project's stored (non-disk) assets already use. */
export const webAssetsUsage = (assets) =>
  assets.reduce((sum, asset) => sum + (asset.dataUrl?.length || 0), 0);

/**
 * Checks one file before it is read. Returns null when it fits, otherwise
 * `{ code, message }` where the message names the file and says how to fix it.
 * `usage` is the web budget already spent (stored assets plus files queued in
 * the same drop); it is ignored for disk-backed storage.
 */
export const validateFile = (file, { isDisk, usage = 0 }) => {
  const limit = isDisk ? MAX_DISK_FILE_BYTES : MAX_FILE_BYTES;
  if (file.size > limit) {
    return {
      code: "too-large",
      message: `${file.name} is ${formatBytes(file.size)} and the limit is ${formatBytes(limit)} per file. Compress it or split it, then add it again.`,
    };
  }
  if (!isDisk && usage + base64Length(file.size) > MAX_WEB_ASSETS_BASE64_BYTES) {
    return {
      code: "quota",
      message: `This project's browser storage is full (${formatBytes(MAX_WEB_ASSETS_BASE64_BYTES)} of assets). Delete a file you no longer need, then add ${file.name} again.`,
    };
  }
  return null;
};

export const ASSET_ERRORS = {
  disk: (name) =>
    `Couldn't save ${name} to your vault folder. Check that the folder still exists and that MAIA can write to it, then add the file again.`,
  noFolder: (name) =>
    `Couldn't add ${name} because this project has no folder in your vault yet. Wait a moment for MAIA to save the project, then add the file again.`,
  remove: (name) =>
    `Couldn't delete ${name}. Check that the file isn't open in another app and that MAIA can write to your vault folder, then try again.`,
  read: (name) => `Couldn't read ${name}. Check that the file still exists and isn't open elsewhere, then add it again.`,
  open: (name) => `Couldn't open ${name}. Try again, or delete it and add the file again.`,
  download: (name) => `Couldn't download ${name}. Try again, or delete it and add the file again.`,
};
