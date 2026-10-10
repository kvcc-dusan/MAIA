import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { parseContentMeta } from "../lib/parseContentMeta.js";
import { cn, countWords } from "@/lib/utils";
import { isTypingElsewhere } from "../editor/isTypingElsewhere.js";
import styles from "./EditorRich.module.css";

const CRLF = /\r\n/;

const findScrollParent = (el) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
};

/**
 * The raw markdown body in a plain textarea. What goes in comes out byte for byte: no parsing,
 * no escaping. Saves through the same onChange as the rich editor.
 */
export default function SourceEditor({
  value = "",
  onChange,
  onMetaChange,   // { tags, links, wordCount, charCount }, same shape EditorRich emits
  editable = true,
  autoFocus = false,
  className = "",
}) {
  const ref = useRef(null);
  // Browsers hand back LF from a textarea whatever it was given. Show LF (so the controlled
  // value never fights the caret) and write the file's own line endings back.
  const usesCrlf = useRef(CRLF.test(value));
  const shown = value.replace(/\r\n/g, "\n");

  const emitMeta = useCallback((text) => {
    onMetaChange?.({
      ...parseContentMeta(text),
      wordCount: countWords(text),
      charCount: text.replace(/\n/g, "").length,
    });
  }, [onMetaChange]);

  useEffect(() => {
    emitMeta(shown);
    // once per mount, like EditorRich's onCreate; later edits go through handleChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoFocus && editable && ref.current && !isTypingElsewhere()) ref.current.focus();
  }, [autoFocus, editable]);

  // Grow with the text so the page scrolls, not the box. Collapsing the height can clamp the
  // scroll position of the container, so it is put back.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = findScrollParent(el);
    const top = scroller?.scrollTop ?? 0;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (scroller) scroller.scrollTop = top;
  }, [shown]);

  const handleChange = (e) => {
    const text = e.target.value;
    onChange?.(usesCrlf.current ? text.replace(/\n/g, "\r\n") : text);
    emitMeta(text);
  };

  return (
    <textarea
      ref={ref}
      value={shown}
      onChange={handleChange}
      readOnly={!editable}
      spellCheck={false}
      aria-label="Note markdown source"
      className={cn(styles.source, className)}
    />
  );
}
