import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Which task groups are expanded. A group follows its `defaultOpen` until the
 * user toggles it. A group that newly shows up (a task lands in an empty
 * band) opens, so the new task is not hidden inside a folded section. That
 * only applies while the view itself is steady: switching grouping, or
 * filtering, changes which groups exist without anyone adding a task, and
 * must not pop folded groups open.
 */
export const useGroupOpen = (groups, { groupBy, isFiltered }) => {
  const [overrides, setOverrides] = useState({});
  const previous = useRef(null);
  const idOf = (group) => `${groupBy}:${group.key}`;
  const signature = groups.map(idOf).join("\n");

  useEffect(() => {
    const keys = signature ? signature.split("\n") : [];
    const view = `${groupBy}|${isFiltered}`;
    const before = previous.current;
    previous.current = { view, keys };
    if (!before || before.view !== view) return;
    const appeared = keys.filter((key) => !before.keys.includes(key));
    if (appeared.length === 0) return;
    setOverrides((current) => ({ ...current, ...Object.fromEntries(appeared.map((key) => [key, true])) }));
  }, [signature, groupBy, isFiltered]);

  const isOpen = (group) => overrides[idOf(group)] ?? group.defaultOpen;

  const toggle = useCallback(
    (group) => {
      const key = `${groupBy}:${group.key}`;
      setOverrides((current) => ({ ...current, [key]: !(current[key] ?? group.defaultOpen) }));
    },
    [groupBy]
  );

  return { isOpen, toggle };
};
