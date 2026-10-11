import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SORT, parseSort, serializeSort, sortStorageKey } from "./sortOrder.js";

const read = (key) => {
  try {
    return parseSort(localStorage.getItem(key));
  } catch {
    return DEFAULT_SORT;
  }
};

/** The tree's sort choice, remembered per vault (`vaultPath` is null on the web). */
export const useSortOrder = (vaultPath) => {
  const key = sortStorageKey(vaultPath);
  const [state, setState] = useState(() => ({ key, sort: read(key) }));

  // Another vault has its own saved choice; adopt it when the key changes.
  useEffect(() => {
    setState((prev) => (prev.key === key ? prev : { key, sort: read(key) }));
  }, [key]);

  const setSort = useCallback(
    (next) => {
      const sort = parseSort(next);
      setState({ key, sort });
      try {
        localStorage.setItem(key, serializeSort(sort));
      } catch {
        // Private mode or quota: the choice applies for this session only.
      }
    },
    [key]
  );

  // During the render where the key just changed, show the new vault's value, not the stale one.
  return [state.key === key ? state.sort : read(key), setSort];
};
