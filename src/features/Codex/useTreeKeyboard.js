import { useCallback } from "react";

const rowElements = (container) => [...container.querySelectorAll('[role="treeitem"]')];

/**
 * Arrow-key navigation for the flat-rendered tree. Up/Down and Home/End move
 * focus, Right expands or steps into a folder, Left collapses or steps to the
 * parent, Enter and Space activate. Only acts when a row itself has focus.
 */
export const useTreeKeyboard = ({ rows, onActivate, onSetOpen, onFocusKey }) =>
  useCallback(
    (event) => {
      const target = event.target;
      if (target.getAttribute?.("role") !== "treeitem") return;
      const index = rows.findIndex((row) => row.key === target.dataset.key);
      if (index < 0) return;
      const row = rows[index];
      const go = (nextIndex) => {
        const next = rows[nextIndex];
        if (!next) return;
        onFocusKey(next.key);
        rowElements(event.currentTarget).find((el) => el.dataset.key === next.key)?.focus();
      };
      const isFolder = row.type === "folder";

      switch (event.key) {
        case "ArrowDown": go(index + 1); break;
        case "ArrowUp": go(index - 1); break;
        case "Home": go(0); break;
        case "End": go(rows.length - 1); break;
        case "ArrowRight":
          if (!isFolder) return;
          if (!row.isExpanded) onSetOpen(row.path, true);
          else if (rows[index + 1]?.parentKey === row.key) go(index + 1);
          break;
        case "ArrowLeft":
          if (isFolder && row.isExpanded) onSetOpen(row.path, false);
          else if (row.parentKey) go(rows.findIndex((r) => r.key === row.parentKey));
          break;
        case "Enter":
        case " ":
          onActivate(row);
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [rows, onActivate, onSetOpen, onFocusKey]
  );
