// View mode and colour grouping choices, persisted in localStorage. Storage
// can be blocked (private mode, quota), so every access is guarded.

export const VIEW_KEY = "maia_graph_view";
export const COLOR_BY_KEY = "maia_graph_colorBy";
export const GROUP_BY_FOLDER_KEY = "maia_graph_groupByFolder";

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

export const readColorBy = () => (read(COLOR_BY_KEY) === "tag" ? "tag" : "folder");

/** 3D "Group by folder": on unless the user turned it off. */
export const readGroupByFolder = () => read(GROUP_BY_FOLDER_KEY) !== "off";

export const writeGroupByFolder = (on) => writePref(GROUP_BY_FOLDER_KEY, on ? "on" : "off");
