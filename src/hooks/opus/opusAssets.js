// Project assets are not stored in the Opus files (base64 does not belong in
// YAML, see opusFiles/projectFile.js). In file mode they live in localStorage
// under one key, { [projectId]: assets[] }, and are merged into loaded projects.
import { deepEqual } from "./opusDiff.js";

export const PROJECT_ASSETS_KEY = "maia.projectAssets";

const NO_ASSETS = [];
const asList = (v) => (Array.isArray(v) ? v : NO_ASSETS);

export const readAssetMap = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECT_ASSETS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeAssetMap = (map) => localStorage.setItem(PROJECT_ASSETS_KEY, JSON.stringify(map));

export const attachAssets = (projects, map = readAssetMap()) =>
  projects.map((p) => ({ ...p, assets: asList(map[p.id]) }));

/** Writes the assets of projects that changed (or dropped them with the project). Throws on a full or blocked storage. */
export const persistAssetChanges = (prev, next) => {
  const before = new Map(prev.projects.map((p) => [p.id, p]));
  const after = new Map(next.projects.map((p) => [p.id, p]));
  const changed = next.projects.filter((p) => !deepEqual(asList(before.get(p.id)?.assets), asList(p.assets)));
  const removed = prev.projects.filter((p) => !after.has(p.id));
  if (changed.length === 0 && removed.length === 0) return false;

  const map = { ...readAssetMap() };
  changed.forEach((p) => {
    if (asList(p.assets).length === 0) delete map[p.id];
    else map[p.id] = p.assets;
  });
  removed.forEach((p) => delete map[p.id]);
  writeAssetMap(map);
  return true;
};

/** Migration: keep each project's existing assets reachable in file mode. Never overwrites a key. */
export const seedAssets = (projects) => {
  const map = { ...readAssetMap() };
  let added = false;
  projects.forEach((p) => {
    if (asList(p.assets).length > 0 && !(p.id in map)) {
      map[p.id] = p.assets;
      added = true;
    }
  });
  if (added) writeAssetMap(map);
};
