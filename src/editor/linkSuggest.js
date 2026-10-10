// `[[` and `![[` autocomplete. Picking an item inserts the same wikiLink atom the markdown parser
// makes, so saving writes exactly `[[Target]]`. Matching and ranking live in linkSuggestModel.js.
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { buildItems } from './linkSuggestModel.js';
import { createLinkPopup } from './linkSuggestPopup.js';

const OPEN_LINK = /!?\[\[[^[\]\n]*$/;
const OBJECT_CHAR = '￼'; // one character per inline atom, so string offsets equal document offsets
const CLOSING = ']]';

/**
 * Finds `[[query` or `![[query` ending at the caret. Custom because the stock matcher only knows
 * single-character triggers separated by whitespace.
 */
export const findLinkMatch = ({ $position }) => {
  const { parent, parentOffset } = $position;
  if (!parent.isTextblock) return null;
  const before = parent.textBetween(0, parentOffset, undefined, OBJECT_CHAR);
  const match = OPEN_LINK.exec(before);
  if (!match) return null;
  const from = $position.pos - (before.length - match.index);
  return { range: { from, to: $position.pos }, query: match[0], text: match[0] };
};

const isInsideCode = (state, range) => {
  const { parent } = state.doc.resolve(range.to);
  const code = state.schema.marks.code;
  return Boolean(parent.type.spec.code) || Boolean(code && state.doc.rangeHasMark(range.from, range.to, code));
};

// Text before the opener in the same block: an unclosed `%%` or `$` means we are inside a comment or
// math. A `$` followed by a digit is a price, not math.
const isInsideCommentOrMath = (state, range) => {
  const $from = state.doc.resolve(range.from);
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, OBJECT_CHAR);
  if ((before.match(/%%/g) ?? []).length % 2 === 1) return true;
  const dollars = [...before.matchAll(/(?<!\\)\$/g)];
  if (dollars.length % 2 === 0) return false;
  const last = dollars[dollars.length - 1].index;
  return !/[\s\d]/.test(before[last + 1] ?? ' ');
};

export const LinkSuggest = Extension.create({
  name: 'linkSuggest',
  // Arrow keys, Enter and Tab must reach the popup before the list and table keymaps
  priority: 1000,

  addOptions() {
    return {
      getNotes: () => [],
      // async: the vault file index is built on first use. Empty on the web.
      getFiles: async () => [],
      getCurrentContent: (editor) => editor.storage.markdown?.getMarkdown() ?? '',
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { getNotes, getFiles, getCurrentContent } = this.options;
    const pluginKey = new PluginKey('maiaLinkSuggest');
    let dismissedFrom = null;
    let popup = null;

    const insert = ({ editor: ed, range, props: item }) => {
      const { doc } = ed.state;
      // an auto-closed or typed `]]` right after the caret is consumed, never duplicated
      const tailEnd = Math.min(range.to + CLOSING.length, doc.resolve(range.to).end());
      const hasClosing = doc.textBetween(range.to, tailEnd, undefined, OBJECT_CHAR) === CLOSING;
      ed.chain().focus()
        .insertContentAt({ from: range.from, to: hasClosing ? tailEnd : range.to }, { type: 'wikiLink', attrs: { raw: item.raw } })
        .run();
    };

    return [Suggestion({
      editor,
      pluginKey,
      char: '[[',
      findSuggestionMatch: (config) => {
        const match = findLinkMatch(config);
        if (!match) dismissedFrom = null;
        return match;
      },
      allow: ({ state, range }) => {
        if (!editor.isEditable || editor.view.composing || range.from === dismissedFrom) return false;
        return !isInsideCode(state, range) && !isInsideCommentOrMath(state, range);
      },
      items: async ({ query }) => buildItems(query, {
        notes: getNotes(),
        files: /^!/.test(query) ? await getFiles() : [],
        currentContent: /#/.test(query) ? getCurrentContent(editor) : '',
      }),
      command: insert,
      render: () => {
        let latest = null;
        popup = createLinkPopup({
          editor,
          onPick: (item) => latest?.command(item),
          onDismiss: () => { dismissedFrom = latest?.range.from ?? null; },
        });
        const show = (props) => {
          // items load asynchronously: drop results for a query the caret has already left
          const current = pluginKey.getState(editor.state);
          if (!current?.active || current.query !== props.query) return;
          latest = props;
          popup.update(props);
        };
        return {
          onStart: show,
          onUpdate: show,
          onKeyDown: ({ event }) => popup.handleKey(event),
          onExit: () => {
            latest = null;
            popup.close();
          },
        };
      },
    })];
  },
});
