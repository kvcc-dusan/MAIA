import { useCallback, useState } from "react";
import { COLOR_BY_KEY, VIEW_KEY, readColorBy, readViewMode, writePref } from "../lib/viewPrefs.js";

/**
 * 2D/3D choice and colour grouping. The saved choice is never overwritten by a
 * WebGL failure: the page just shows 2D until the user picks 3D again.
 */
export function useGraphView() {
  const [viewMode, setViewModeState] = useState(() => readViewMode());
  const [colorBy, setColorByState] = useState(() => readColorBy());
  const [webglFailed, setWebglFailed] = useState(false);

  const setViewMode = useCallback((mode) => {
    writePref(VIEW_KEY, mode);
    setViewModeState(mode);
    if (mode === "3d") setWebglFailed(false);
  }, []);

  const setColorBy = useCallback((value) => {
    writePref(COLOR_BY_KEY, value);
    setColorByState(value);
  }, []);

  const markWebglUnavailable = useCallback(() => setWebglFailed(true), []);

  return {
    mode: webglFailed ? "2d" : viewMode,
    viewMode,
    setViewMode,
    colorBy,
    setColorBy,
    webglFailed,
    markWebglUnavailable,
  };
}
