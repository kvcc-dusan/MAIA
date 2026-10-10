// One-time copy of assets kept by older MAIA versions (base64 in localStorage)
// into <vault>/Opus/<Project>/assets/. Never deletes the legacy data, never
// overwrites a file, and sets the flag only when every readable asset landed.
// Assets that were saved under the hidden .maia-assets folder are skipped:
// Tauri's fs scope could never read them back, so they have no bytes to copy.
import { toast } from "sonner";
import { STORAGE_KEYS } from "../../lib/constants.js";
import { readAssetMap } from "./opusAssets.js";

export const ASSETS_MIGRATED_KEY = "maia.assetsMigrated";

const asList = (v) => (Array.isArray(v) ? v : []);
const isRecord = (v) => v != null && typeof v === "object" && !Array.isArray(v);

const readFlag = () => {
  try {
    return localStorage.getItem(ASSETS_MIGRATED_KEY) === "true";
  } catch {
    return true; // storage blocked: do not copy on every launch
  }
};

const readBrowserProjects = () => {
  try {
    return asList(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) ?? "[]")).filter(isRecord);
  } catch {
    return [];
  }
};

/** Bytes of a base64 data URL, or null when it is not one. */
export const dataUrlToBytes = (dataUrl) => {
  const match = /^data:[^,]*;base64,(.*)$/s.exec(typeof dataUrl === "string" ? dataUrl : "");
  if (!match) return null;
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** { [projectId]: legacy assets with a dataUrl } from both places older versions kept them. */
export const collectLegacyAssets = () => {
  const map = readAssetMap();
  const out = {};
  readBrowserProjects().forEach((p) => {
    if (p.id != null) out[p.id] = asList(p.assets);
  });
  Object.entries(map).forEach(([id, list]) => {
    if (asList(list).length > 0) out[id] = asList(list);
  });
  return out;
};

const alreadyThere = (existing, name, size) =>
  existing.some((e) => e.name.toLowerCase() === name.toLowerCase() && e.size === size);

const copyProject = async (api, vaultPath, projectId, assets) => {
  let existing = [];
  try {
    existing = await api.listAssets(vaultPath, projectId);
  } catch { /* no folder yet: nothing to compare with */ }
  let copied = 0;
  for (const asset of assets.filter(isRecord)) {
    const bytes = dataUrlToBytes(asset.dataUrl);
    if (!bytes || typeof asset.name !== "string") continue; // disk-path assets cannot be read
    if (alreadyThere(existing, asset.name, bytes.length)) continue; // an earlier partial run copied it
    await api.saveAsset(vaultPath, projectId, { name: asset.name, bytes });
    copied += 1;
  }
  return copied;
};

/** @returns {Promise<"skipped" | "done" | "failed">} */
export const migrateLegacyAssets = async (api, vaultPath, projects) => {
  if (readFlag()) return "skipped";
  let legacy;
  try {
    legacy = collectLegacyAssets();
  } catch (e) {
    console.error("[MAIA] Could not read legacy project assets", e);
    return "failed";
  }
  const present = new Set(projects.map((p) => p.id));
  let copied = 0;
  const failures = [];
  for (const [projectId, assets] of Object.entries(legacy)) {
    if (!present.has(projectId) || assets.length === 0) continue;
    try {
      copied += await copyProject(api, vaultPath, projectId, assets);
    } catch (e) {
      console.error(`[MAIA] Could not copy assets of project ${projectId}`, e);
      failures.push(e?.message ?? String(e));
    }
  }
  if (failures.length > 0) {
    toast.error(`Couldn't copy some older project files into the vault (${failures[0]}). Your originals are untouched and MAIA will try again next time it opens.`);
    return "failed";
  }
  try {
    localStorage.setItem(ASSETS_MIGRATED_KEY, "true");
  } catch (e) {
    console.error("[MAIA] Could not mark the asset move as done", e);
  }
  if (copied > 0) toast.success(`Copied ${copied} project file${copied === 1 ? "" : "s"} into the vault's project assets folders.`);
  return "done";
};
