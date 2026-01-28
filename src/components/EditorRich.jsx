/* eslint-disable react/prop-types */
import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Extension } from "@tiptap/core";
import { parseContentMeta } from "../lib/parseContentMeta.js";

/** Inline placeholder exactly where line 1 starts */
function InlinePlaceholder() {
  return (
    <div className="absolute top-0 left-0 pt-[2px] text-zinc-600 select-none pointer-events-none">
      Start writing…
    </div>
  );
}

/** Auto Markdown Shortcuts on SPACE at line start */
const AutoMarkdownShortcuts = Extension.create({
  name: "autoMarkdownShortcuts",
  addKeyboardShortcuts() {
    return {
      Space: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        const inParagraph = $from.parent?.type?.name === "paragraph";
        if (!inParagraph) return false;

        const beforeText = $from.parent.textBetween(0, $from.parentOffset);
        const head = beforeText.replace(/\s+$/, "").trim();

        // bullets
        if (head === "-" || head === "*" || head === "+") {
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleBulletList()
            .run();
        }

        // ordered 1.
        if (/^\d+\.$/.test(head)) {
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleOrderedList()
            .run();
        }

        // task list: [ ] or [x]
        if (/^\[(?:\s|x|X)\]$/.test(head)) {
          const checked = /\[([xX])\]/.test(head);
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleTaskList()
            .command(() => {
              const node = editor.state.selection.$from.parent;
              if (node?.type?.name === "taskItem" && checked) {
                editor.commands.updateAttributes("taskItem", { checked: true });
              }
              return true;
            })
            .run();
        }

        return false;
      },
    };
  },
});

/** Count “word” tokens robustly (letters/numbers), across spaces & newlines, no trailing space needed. */
function countWords(text) {
  // Unicode-friendly: letters + marks + numbers; keeps words like "don't" or "ime's" together.
  const matches = text.match(/\p{L}[\p{L}\p{M}\p{N}'’_-]*/gu);
  return matches ? matches.length : 0;
}

export default function EditorRich({
  value = "",
  onChange,
  onMetaChange,            // { tags, links, wordCount, charCount }
  editable = true,
  className = "",
}) {
  // Helper to emit meta + counts based on rendered text
  function emitMeta(editor, onMetaChange) {
    const raw = editor.view?.dom?.textContent ?? "";
    const meta = parseContentMeta(raw);
    const wordCount = countWords(raw);
    const charCount = raw.length; // includes newlines, which is what users expect visually
    onMetaChange?.({ ...meta, wordCount, charCount });
  }

  const editor = useEditor({
    editable,
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0",
        spellcheck: "false",
        style:
          "outline:none; -webkit-tap-highlight-color: transparent; caret-color: currentColor;",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        horizontalRule: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Link.configure({ autolink: true, openOnClick: false, linkOnPaste: true }),
      HorizontalRule,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      AutoMarkdownShortcuts,
    ],
    onCreate: ({ editor }) => {
      emitMeta(editor, onMetaChange);
    },
    onUpdate: ({ editor }) => {
      // markdown out (persisted upstream)
      const md = editor.storage.markdown.getMarkdown();
      onChange?.(md);

      // live meta + counts from rendered text
      emitMeta(editor, onMetaChange);
    },
  });

  // Sync editable flag
  useEffect(() => {
    if (editor) editor.setEditable(!!editable);
  }, [editable, editor]);

  // Sync external markdown (switching notes)
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "");
      // recompute meta on load (matches onUpdate)
      emitMeta(editor, onMetaChange);
    }
  }, [value, editor, onMetaChange]);

  if (!editor) return null;

  const showPlaceholder = editor.isEmpty && editor.isEditable;

  return (
    <div className={`relative ${className}`}>
      {showPlaceholder && <InlinePlaceholder />}
      <EditorContent
        editor={editor}
        className="tiptap maia-editor outline-none min-h-[60vh] text-zinc-100 font-mono leading-6"
      />
    </div>
  );
}
