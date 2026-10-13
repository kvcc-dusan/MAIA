import { GROUP_PULL_DEFAULT, GROUP_PULL_MAX, GROUP_PULL_MIN } from "./graphForces.js";

// View mode and colour grouping choices, persisted in localStorage. Storage
// can be blocked (private mode, quota), so every access is guarded.

export const VIEW_KEY = "maia_graph_view";
export const GROUP_BY_FOLDER_KEY = "maia_graph_groupByFolder";
export const GROUP_PULL_KEY = "maia_graph_groupPull";

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writePref = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // choice lasts for this session only
  }
};

/** A saved number, or `fallback` when it is missing, unreadable, 0 or not a number (same rule as `parse(x) || fallback`). */
export const readNumberPref = (key, fallback, parse = parseFloat) => parse(read(key)) || fallback;

export const hasWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

/** Saved choice, else 3D when WebGL exists. */
export const readViewMode = (webgl = hasWebGL()) => {
  const saved = read(VIEW_KEY);
  if (saved === "2d" || saved === "3d") return saved;
  return webgl ? "3d" : "2d";
};

/** 3D "Group by folder": on unless the user turned it off. */
export const readGroupByFolder = () => read(GROUP_BY_FOLDER_KEY) !== "off";

export const writeGroupByFolder = (on) => writePref(GROUP_BY_FOLDER_KEY, on ? "on" : "off");

/** 3D "Group pull" slider, 0 to 100. Missing, corrupt or out-of-range values fall back to the default. */
export const readGroupPull = () => {
  const raw = read(GROUP_PULL_KEY);
  if (raw === null || raw.trim() === "") return GROUP_PULL_DEFAULT;
  const value = Number(raw);
  if (!Number.isFinite(value)) return GROUP_PULL_DEFAULT;
  return Math.min(GROUP_PULL_MAX, Math.max(GROUP_PULL_MIN, Math.round(value)));
};

export const writeGroupPull = (value) => writePref(GROUP_PULL_KEY, String(value));
