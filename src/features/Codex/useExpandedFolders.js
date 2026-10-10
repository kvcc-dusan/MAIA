import { useCallback, useEffect, useState } from "react";

export const EXPANDED_KEY = "maia.codex.expanded";

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : []);
  } catch {
    return new Set();
  }
};

const write = (set) => {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    // Private mode or quota: the tree still works, it just won't remember.
  }
};

/** Expanded folder paths, persisted. State is replaced, never mutated. */
export const useExpandedFolders = () => {
  const [expanded, setExpanded] = useState(read);

  useEffect(() => write(expanded), [expanded]);

  const toggle = useCallback((path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const setOpen = useCallback((path, isOpen) => {
    setExpanded((prev) => {
      if (prev.has(path) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) next.add(path);
      else next.delete(path);
      return next;
    });
  }, []);

  const expandAll = useCallback((paths) => {
    setExpanded((prev) => (paths.every((p) => prev.has(p)) ? prev : new Set([...prev, ...paths])));
  }, []);

  return { expanded, toggle, setOpen, expandAll };
};
