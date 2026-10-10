import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { parseContentMeta } from "../lib/parseContentMeta.js";
import { cn, countWords } from "@/lib/utils";
import { createExtensions } from "../editor/extensions.js";
import { isTypingElsewhere } from "../editor/isTypingElsewhere.js";
import styles from "./EditorRich.module.css";

const PLACEHOLDER_TEXT = 'Start writing…';

/** Toggle placeholder classes/attributes on the editor DOM based on content */
function updatePlaceholder(editor) {
  if (!editor?.view?.dom) return;
  const dom = editor.view.dom;
  const doc = editor.state.doc;
  // Truly empty = single empty paragraph with no text at all
  const isEmpty = doc.childCount === 1
    && doc.firstChild?.isTextblock
    && doc.firstChild?.content.size === 0;

  if (isEmpty && editor.isEditable) {
    dom.setAttribute('data-placeholder', PLACEHOLDER_TEXT);
    dom.classList.add('is-editor-empty');
  } else {
    dom.removeAttribute('data-placeholder');
    dom.classList.remove('is-editor-empty');
  }
}

export default function EditorRich({
  value = "",
  onChange,
  onMetaChange,            // { tags, links, wordCount, charCount }
  onOpenInternalLink,      // (title: string) => void — click a [[wikilink]]
  editable = true,
  autoFocus = false,        // put the caret at the start of the body on mount
  className = "",
}) {
  // Read via a ref inside the extension so [[wikilink]] clicks always call
  // the latest callback without forcing the whole TipTap editor (and its
  // ProseMirror plugins) to be recreated whenever the parent's callback
  // identity changes.
  const onOpenInternalLinkRef = useRef(onOpenInternalLink);
  useEffect(() => {
    onOpenInternalLinkRef.current = onOpenInternalLink;
  }, [onOpenInternalLink]);

  // Helper to emit meta + counts based on rendered text
  const emitMeta = useCallback((editor, onMetaChange) => {
    const raw = editor.getText();
    const meta = parseContentMeta(raw);
    const wordCount = countWords(raw);
    const charCount = raw.replace(/\n/g, "").length;
    onMetaChange?.({ ...meta, wordCount, charCount });
  }, []);

  const extensions = useMemo(() => createExtensions({
    onOpenLink: (title) => onOpenInternalLinkRef.current?.(title),
  }), []);

  const editor = useEditor({
    editable,
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "outline-hidden focus:outline-hidden focus-visible:outline-hidden ring-0 focus:ring-0",
        spellcheck: "false",
        style:
          "outline:none; -webkit-tap-highlight-color: transparent; caret-color: currentColor;",
      },
    },
    extensions,
    onCreate: ({ editor }) => {
      emitMeta(editor, onMetaChange);
      updatePlaceholder(editor);
    },
    onUpdate: ({ editor }) => {
      // markdown out (persisted upstream)
      const md = editor.storage.markdown.getMarkdown();
      onChange?.(md);

      // live meta + counts from rendered text
      emitMeta(editor, onMetaChange);
      updatePlaceholder(editor);
    },
  }, [extensions]);

  // Sync editable flag. emitUpdate=false: by default setEditable fires "update", which made
  // opening a note (and flipping read/edit) re-serialize and save it with no edit at all.
  useEffect(() => {
    if (editor) editor.setEditable(!!editable, false);
  }, [editable, editor]);

  // Runs once the editor exists: TipTap's own autofocus fires on a timer and
  // ignores whether the user is already typing somewhere else.
  useEffect(() => {
    if (!autoFocus || !editor || !editor.isEditable || isTypingElsewhere()) return;
    editor.commands.focus("start");
  }, [autoFocus, editor]);

  // Sync external markdown (switching notes)
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", false);
      // recompute meta on load (matches onUpdate)
      emitMeta(editor, onMetaChange);
    }
  }, [value, editor, onMetaChange]);

  // Click anywhere in the editor area to focus
  const handleWrapperClick = useCallback((e) => {
    if (!editor || !editor.isEditable) return;
    // Don't steal focus from the editor itself
    if (e.target.closest('.tiptap')) return;
    editor.commands.focus('end');
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn("relative min-h-full cursor-text", className)}
      onClick={handleWrapperClick}
    >
      <EditorContent
        editor={editor}
        className={cn("tiptap maia-editor", styles.editor)}
      />
    </div>
  );
}
