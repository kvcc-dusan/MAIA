import { useCallback, useRef } from "react";

const rowElements = (container) => [...container.querySelectorAll('[role="treeitem"]')];
const TYPEAHEAD_RESET_MS = 700;
const isTypeaheadKey = (event) => event.key.length === 1 && event.key !== " " && event.key !== "*" && !event.ctrlKey && !event.metaKey && !event.altKey;
const isMenuKey = (event) => event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);

/**
 * Keyboard model for the flat-rendered tree (WAI-ARIA tree pattern). Up/Down,
 * Home/End and type-ahead move focus; Right expands or steps into a folder; Left
 * collapses or steps to the parent; `*` opens every folder at this level; Enter
 * and Space activate; ContextMenu or Shift+F10 asks for the row menu. Only acts
 * when a row itself has focus.
 */
export const useTreeKeyboard = ({ rows, onActivate, onSetOpen, onFocusKey, onContextMenuKey }) => {
  const typed = useRef({ text: "", timer: 0 });

  return useCallback(
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

      if (isTypeaheadKey(event)) {
        window.clearTimeout(typed.current.timer);
        typed.current.text += event.key.toLowerCase();
        typed.current.timer = window.setTimeout(() => { typed.current.text = ""; }, TYPEAHEAD_RESET_MS);
        // A single repeated letter cycles through matches instead of requiring "aa".
        const needle = typed.current.text;
        const isRepeat = [...needle].every((ch) => ch === needle[0]);
        const prefix = isRepeat ? needle[0] : needle;
        const start = isRepeat ? index + 1 : index;
        const order = [...rows.keys()].map((i) => (start + i) % rows.length);
        const match = order.find((i) => rows[i].name.toLowerCase().startsWith(prefix));
        if (match !== undefined) go(match);
        event.preventDefault();
        return;
      }

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
        case "*":
          rows.filter((r) => r.type === "folder" && r.parentKey === row.parentKey).forEach((r) => onSetOpen(r.path, true));
          break;
        case "Enter":
        case " ":
          onActivate(row);
          break;
        default:
          if (!isMenuKey(event)) return;
          onContextMenuKey?.(row, target);
      }
      event.preventDefault();
    },
    [rows, onActivate, onSetOpen, onFocusKey, onContextMenuKey]
  );
};
