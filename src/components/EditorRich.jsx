import React, { useEffect, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

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

/** WikiLink Highlighting: [[Title]] or [[Title|Alias]] */
const WikiLinkExtension = Extension.create({
  name: "wikiLink",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wiki-link-highlight'),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations = [];

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text;
                // Regex for [[...]]
                const regex = /\[\[([\s\S]+?)\]\]/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;

                  decorations.push(
                    Decoration.inline(from, to, {
                      style: 'color: #0044FF; font-weight: bold;',
                      class: 'maia-wikilink'
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});


/** Count words: any whitespace-separated token with at least one letter or digit. */
function countWords(text) {
  const tokens = text.split(/\s+/).filter(t => t.length > 0);
  return tokens.filter(t => /[\p{L}\p{N}]/u.test(t)).length;
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
    const raw = editor.getText();
    const meta = parseContentMeta(raw);
    const wordCount = countWords(raw);
    const charCount = raw.replace(/\n/g, "").length;
    onMetaChange?.({ ...meta, wordCount, charCount });
  }

  const editor = useEditor({
    editable,
    content: value || "",
    autofocus: 'start', // Focus at start of document
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
      WikiLinkExtension,
    ],
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
        className="tiptap maia-editor outline-none min-h-full text-zinc-200 leading-relaxed w-full font-mono text-sm"
      />
    </div>
  );
}
