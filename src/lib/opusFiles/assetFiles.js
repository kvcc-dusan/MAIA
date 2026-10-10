// @maia:opusFiles - project assets are plain files in <vault>/Opus/<Project>/assets/.
// The folder is the source of truth: no metadata record, so a file dropped in
// by Finder, Obsidian or Claude shows up and a removed one disappears.
import { cleanName, uniqueName } from "./names.js";
import { ASSETS_DIR, joinPath, opusRoot, loadFs, listDir, stableId, state } from "./opusFs.js";

const MIME_BY_EXT = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", heic: "image/heic",
  pdf: "application/pdf", zip: "application/zip", json: "application/json", txt: "text/plain",
  md: "text/markdown", csv: "text/csv", html: "text/html", mp4: "video/mp4", mov: "video/quicktime",
  mp3: "audio/mpeg", wav: "audio/wav",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  fig: "application/octet-stream",
};
const FALLBACK_MIME = "application/octet-stream";
const MAX_EXT_LENGTH = 12;

export const mimeFor = (name) => {
  const dot = String(name).lastIndexOf(".");
  return (dot > 0 && MIME_BY_EXT[name.slice(dot + 1).toLowerCase()]) || FALLBACK_MIME;
};

const assetsDirOf = (vaultPath, projectId) => {
  const folder = state.projectDirs.get(projectId);
  if (!folder) throw new Error(`Project "${projectId}" has no folder yet: wait for MAIA to save it`);
  return joinPath(opusRoot(vaultPath), folder, ASSETS_DIR);
};

// Names come from the UI or the listing, but a path separator here would escape the folder.
const assertPlainName = (name) => {
  if (typeof name !== "string" || name === "" || name.startsWith(".") || /[\\/]/.test(name)) {
    throw new Error(`"${name}" is not a file name inside the assets folder`);
  }
};

// Keeps the extension readable: only the base goes through cleanName.
const splitName = (raw) => {
  const text = String(raw ?? "").split(/[\\/]/).pop() ?? "";
  const dot = text.lastIndexOf(".");
  const hasExt = dot > 0 && dot < text.length - 1;
  const base = cleanName(hasExt ? text.slice(0, dot) : text) || "File";
  const cleanExt = hasExt ? text.slice(dot + 1).replace(/[^A-Za-z0-9_-]/g, "").slice(0, MAX_EXT_LENGTH) : "";
  return { base, ext: cleanExt ? `.${cleanExt}` : "" };
};

const toEntry = (path, name, info) => ({
  id: stableId(name),
  name,
  size: info?.size ?? 0,
  mtimeMs: info?.mtime ? new Date(info.mtime).getTime() : 0,
  type: mimeFor(name),
  path,
});

const statEntry = async (fs, dir, name) => {
  const path = joinPath(dir, name);
  try {
    return toEntry(path, name, await fs.stat(path));
  } catch {
    return null; // vanished between listing and stat
  }
};

/** Files directly inside the project's assets/ folder, newest first. Throws when the project has no folder yet. */
export const listAssets = async (vaultPath, projectId) => {
  const dir = assetsDirOf(vaultPath, projectId);
  const fs = await loadFs();
  const files = (await listDir(fs, dir)).filter((e) => e.isFile !== false && !e.isDirectory);
  const entries = (await Promise.all(files.map((e) => statEntry(fs, dir, e.name)))).filter(Boolean);
  return entries.sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
};

/** Writes `bytes` (Uint8Array) as a new file. Never overwrites: a taken name gets " 2", " 3"... */
export const saveAsset = async (vaultPath, projectId, { name, bytes }) => {
  const dir = assetsDirOf(vaultPath, projectId);
  const fs = await loadFs();
  await fs.mkdir(dir, { recursive: true });
  const { base, ext } = splitName(name);
  const fileName = uniqueName(base, (await listDir(fs, dir)).map((e) => e.name), ext);
  const path = joinPath(dir, fileName);
  if (await fs.exists(path)) throw new Error(`Refusing to overwrite existing file "${path}"`);
  // createNew makes the OS refuse an overwrite even if the file appeared since the check.
  await fs.writeFile(path, bytes, { createNew: true });
  return statEntry(fs, dir, fileName);
};

/** Removes one file. Resolves false when it is already gone. */
export const deleteAsset = async (vaultPath, projectId, name) => {
  assertPlainName(name);
  const fs = await loadFs();
  const path = joinPath(assetsDirOf(vaultPath, projectId), name);
  if (!(await fs.exists(path))) return false;
  await fs.remove(path);
  return true;
};

export const readAsset = async (vaultPath, projectId, name) => {
  assertPlainName(name);
  const fs = await loadFs();
  return fs.readFile(joinPath(assetsDirOf(vaultPath, projectId), name));
};
