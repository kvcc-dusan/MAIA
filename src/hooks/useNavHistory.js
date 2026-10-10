import { useCallback, useEffect, useReducer } from "react";

const MAX_ENTRIES = 50;

const sameLocation = (a, b) =>
  !!a && !!b && a.page === b.page && (a.projectId ?? null) === (b.projectId ?? null) && (a.noteId ?? null) === (b.noteId ?? null);

export const initialHistory = { entries: [], index: -1 };

/**
 * Browser-style history over app locations ({ page, projectId, noteId }).
 * `visit` ignores a location equal to the current entry, which is what makes
 * back and forward safe: restoring an entry changes the app's location to that
 * very entry, so the visit that follows is a no-op instead of a new push.
 */
export const historyReducer = (state, action) => {
  switch (action.type) {
    case "visit": {
      if (sameLocation(state.entries[state.index], action.location)) return state;
      const kept = state.entries.slice(0, state.index + 1);
      const entries = [...kept, action.location].slice(-MAX_ENTRIES);
      return { entries, index: entries.length - 1 };
    }
    case "back":
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case "forward":
      return state.index < state.entries.length - 1 ? { ...state, index: state.index + 1 } : state;
    default:
      return state;
  }
};

/**
 * @param {{ page: string, projectId?: string|null, noteId?: string|null }|null} location where the app is now;
 *   null means "still resolving" (for example Opus before its first project is selected) and is not recorded
 * @param {(location: object) => void} restore moves the app to a location from history
 */
export const useNavHistory = (location, restore) => {
  const [state, dispatch] = useReducer(historyReducer, initialHistory);
  const page = location?.page ?? null;
  const projectId = location?.projectId ?? null;
  const noteId = location?.noteId ?? null;

  useEffect(() => {
    if (page === null) return;
    dispatch({ type: "visit", location: { page, projectId, noteId } });
  }, [page, projectId, noteId]);

  const canBack = state.index > 0;
  const canForward = state.index < state.entries.length - 1;

  const back = useCallback(() => {
    if (!canBack) return;
    dispatch({ type: "back" });
    restore(state.entries[state.index - 1]);
  }, [canBack, restore, state]);

  const forward = useCallback(() => {
    if (!canForward) return;
    dispatch({ type: "forward" });
    restore(state.entries[state.index + 1]);
  }, [canForward, restore, state]);

  return { canBack, canForward, back, forward };
};
