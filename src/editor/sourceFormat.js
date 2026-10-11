import { Extension, extensions } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { sourceFormatPlugin, SRC_ATTR, GAP_ATTR, PREV_ATTR, MARKUP_ATTR } from './sourceFormatParse.js';
import { inlineMarkupPlugin } from './sourceFormatInline.js';
import { createSourceFormat } from './sourceFormatSerialize.js';

// Every node that can stand at the top of a note.
const BLOCK_TYPES = [
  'paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'taskList', 'codeBlock',
  'horizontalRule', 'table', 'callout', 'htmlBlock', 'commentBlock', 'mathBlock',
  'footnoteDefinition', 'refDefinition',
];

const hidden = { default: null, rendered: false, keepOnSplit: false };

/** Blank lines at the start and end of the note, and its line ending: what no block owns. */
export const readEnds = (content) => {
  const text = String(content ?? '');
  const eol = text.includes('\r\n') && !/(?:^|[^\r])\n/.test(text) ? '\r\n' : '\n';
  const lf = eol === '\r\n' ? text.replace(/\r\n/g, '\n') : text;
  return {
    eol,
    lead: lf.match(/^(?:[ \t]*\n)+/)?.[0] ?? '',
    tail: lf.match(/(?:\n[ \t]*)*$/)[0],
  };
};

export const applyEnds = (markdown, { eol, lead, tail }) => {
  if (markdown.trim() === '') return markdown;
  const body = tail ? markdown.replace(/\n+$/, '') : markdown;
  const out = lead + body + tail;
  return eol === '\r\n' ? out.replace(/\n/g, '\r\n') : out;
};

/**
 * Untouched notes and untouched blocks are saved exactly as they were read: no `*` to `-`, no
 * `__x__` to `**x**`, no escapes, no padding, no lost blank lines or final newline. See
 * sourceFormatSerialize.js for when the original text is trusted.
 */
export const SourceFormat = Extension.create({
  name: 'sourceFormat',
  // After tiptap-markdown (50): its onBeforeCreate builds the storage this wraps
  priority: 40,

  addGlobalAttributes() {
    return [{
      types: BLOCK_TYPES,
      attributes: {
        src: { ...hidden, parseHTML: (el) => el.getAttribute(SRC_ATTR) },
        gap: { ...hidden, parseHTML: (el) => el.getAttribute(GAP_ATTR) },
        prev: { ...hidden, parseHTML: (el) => el.getAttribute(PREV_ATTR) },
      },
    }, {
      types: ['listItem', 'taskItem'],
      attributes: {
        src: { ...hidden, parseHTML: (el) => el.getAttribute(SRC_ATTR) },
        gap: { ...hidden, parseHTML: (el) => el.getAttribute(GAP_ATTR) },
        prev: { ...hidden, parseHTML: (el) => el.getAttribute(PREV_ATTR) },
      },
    }, {
      // How emphasis, a link or a hard break was written: `_`, `__`, bare URL, two spaces
      types: ['italic', 'bold', 'link', 'hardBreak'],
      attributes: { markup: { ...hidden, keepOnSplit: true, parseHTML: (el) => el.getAttribute(MARKUP_ATTR) } },
    }, {
      // How the list, rule or fence was written: `*`, `1)`, `***`, `~~~`
      types: ['bulletList', 'orderedList', 'taskList', 'horizontalRule', 'codeBlock'],
      attributes: { markup: { ...hidden, keepOnSplit: true, parseHTML: (el) => el.getAttribute(MARKUP_ATTR) } },
    }];
  },

  addStorage() {
    return { markdown: { parse: { setup: (md) => { sourceFormatPlugin(md); inlineMarkupPlugin(md); } } } };
  },

  // Opening a note: remember its ends and what "unchanged" is measured against. Replaces
  // tiptap-markdown's setContent (same behaviour, plus this); pasted snippets never come here.
  addCommands() {
    const core = extensions.Commands.config.addCommands();
    return {
      setContent: (content, emitUpdate, parseOptions) => (props) => {
        const { editor } = props;
        const html = editor.storage.markdown.parser.parse(content);
        const done = core.setContent(html, emitUpdate, parseOptions)(props);
        // Only when the command really replaces the document (not for editor.can())
        if (props.dispatch) {
          editor.storage.sourceFormat.ends = readEnds(typeof content === 'string' ? content : '');
          editor.storage.sourceFormat.loadedDoc = props.tr.doc;
        }
        return done;
      },
    };
  },

  addProseMirrorPlugins() {
    // The first document is the one the note was opened with
    return [new Plugin({
      key: new PluginKey('sourceFormat'),
      state: {
        init: (_, state) => { this.editor.storage.sourceFormat.loadedDoc = state.doc; return null; },
        apply: () => null,
      },
    })];
  },

  onBeforeCreate() {
    const { editor } = this;
    const markdown = editor.storage.markdown;
    // Per editor, set here and not in addStorage: the extension object is shared between editors
    const storage = {
      ends: { eol: '\n', lead: '', tail: '' },
      loadedDoc: null,
      explain: null,
      // true: serialize the editor's own way and ignore the original text (the load-time safety check)
      plain: false,
    };
    editor.storage.sourceFormat = storage;
    // tiptap-markdown already parsed the first note before this hook ran
    const { initialContent } = editor.options;
    if (typeof initialContent === 'string') storage.ends = readEnds(initialContent);

    const { wrapNodes, explain } = createSourceFormat(editor, () => storage.loadedDoc);
    storage.explain = explain;
    const serializer = markdown.serializer;
    const baseNodes = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(serializer), 'nodes').get;
    Object.defineProperty(serializer, 'nodes', { configurable: true, get: () => wrapNodes(baseNodes.call(serializer)) });

    const baseGet = markdown.getMarkdown;
    markdown.getMarkdown = () => (storage.plain ? baseGet() : applyEnds(baseGet(), storage.ends));
  },
});
