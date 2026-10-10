import { InputRule, Node } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { installOnce } from './markdownIt.js';
import { createCalloutView, calloutRevealPlugin } from './calloutView.js';

// `[!type]`, an optional fold mark, then an optional title; more lines are the body.
const MARKER = /^\[!([^\]\s]+)\]([+-]?)(?:[ \t]+([^\n]*))?(?:\n([\s\S]*))?$/;
const TYPED_MARKER = /^\[!([^\]\s]+)\]([+-]?) $/;
const ATTR = 'data-maia-callout';
const TITLE_ATTR = 'data-maia-callout-title';

const closingIndex = (tokens, openIndex) => {
  const { level } = tokens[openIndex];
  return tokens.findIndex((token, i) => i > openIndex && token.type === 'blockquote_close' && token.level === level);
};

const newParagraph = (state, content, level) => {
  const open = new state.Token('paragraph_open', 'p', 1);
  const inline = new state.Token('inline', '', 0);
  const close = new state.Token('paragraph_close', 'p', -1);
  open.level = level;
  inline.level = level + 1;
  inline.content = content;
  inline.children = [];
  close.level = level;
  return [open, inline, close];
};

// Runs after block parsing and before inline parsing, so the title and the body each get
// their own inline pass. The blockquote becomes a callout; its first paragraph splits in two.
const calloutRule = (state) => {
  const { tokens } = state;
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].type !== 'blockquote_open') continue;
    const [paragraph, inline, paragraphEnd] = [tokens[i + 1], tokens[i + 2], tokens[i + 3]];
    if (paragraph?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
    const match = MARKER.exec(inline.content);
    const end = match ? closingIndex(tokens, i) : -1;
    if (end === -1) continue;

    const [, type, fold, title = '', rest = ''] = match;
    tokens[i].type = 'callout_open';
    tokens[i].meta = { type, fold };
    tokens[end].type = 'callout_close';
    paragraph.type = 'callout_title_open';
    paragraphEnd.type = 'callout_title_close';
    inline.content = title.trim();
    if (rest) tokens.splice(i + 4, 0, ...newParagraph(state, rest, paragraph.level));
  }
};

export const calloutPlugin = (md) => {
  md.core.ruler.after('block', 'maia_callout', calloutRule);
  const { escapeHtml } = md.utils;
  md.renderer.rules.callout_open = (tokens, idx) => {
    const { type, fold } = tokens[idx].meta;
    return `<div ${ATTR}="${escapeHtml(type)}" data-fold="${fold}">`;
  };
  md.renderer.rules.callout_close = () => '</div>';
  md.renderer.rules.callout_title_open = () => `<div ${TITLE_ATTR}>`;
  md.renderer.rules.callout_title_close = () => '</div>';
};

/** The first line of a callout: `[!type]± title`. Plain text with inline marks, one line. */
export const CalloutTitle = Node.create({
  name: 'calloutTitle',
  content: 'inline*',
  isolating: true,
  selectable: false,
  parseHTML: () => [{ tag: `div[${TITLE_ATTR}]` }],
  renderHTML: () => ['div', { [TITLE_ATTR]: '', class: 'maia-callout-title' }, 0],
});

const isBodyEmpty = (node) => node.childCount === 2 && node.child(1).type.name === 'paragraph' && node.child(1).content.size === 0;

// Everything after the first child: a callout's body, or the rest of a quote
const afterFirst = (node) => {
  const rest = [];
  node.forEach((child, _, i) => { if (i > 0) rest.push(child); });
  return rest;
};

// Backspace at the very start of an empty title takes the callout back to a plain quote.
const unwrapEmptyCallout = (editor) => {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!selection.empty || $from.parent.type.name !== 'calloutTitle' || $from.parentOffset !== 0) return false;
  if ($from.parent.content.size > 0) return true; // nothing before a title to join with
  return editor.commands.command(({ tr }) => {
    const depth = $from.depth - 1;
    const quote = editor.schema.nodes.blockquote.create(null, afterFirst($from.node(depth)));
    tr.replaceWith($from.before(depth), $from.after(depth), quote);
    tr.setSelection(TextSelection.near(tr.doc.resolve($from.before(depth) + 1)));
    return true;
  });
};

// Enter in the title continues in the body, like pressing Enter after a heading.
const enterBody = (editor) => {
  const { $from } = editor.state.selection;
  if ($from.parent.type.name !== 'calloutTitle') return false;
  return editor.commands.command(({ tr }) => {
    tr.setSelection(TextSelection.near(tr.doc.resolve($from.after() + 1)));
    return true;
  });
};

/** `> [!type]± title` with a body of any blocks (lists, code, tables, other callouts). */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'calloutTitle block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: (el) => el.getAttribute(ATTR) || 'note',
        renderHTML: (attrs) => ({ [ATTR]: attrs.type }),
      },
      fold: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-fold') ?? '',
        renderHTML: (attrs) => (attrs.fold ? { 'data-fold': attrs.fold } : {}),
      },
    };
  },

  parseHTML: () => [{ tag: `div[${ATTR}]` }],
  renderHTML: ({ HTMLAttributes }) => ['div', { ...HTMLAttributes, class: 'maia-callout' }, 0],
  addNodeView: () => ({ node }) => createCalloutView(node),

  addKeyboardShortcuts() {
    return {
      Enter: () => enterBody(this.editor),
      Backspace: () => unwrapEmptyCallout(this.editor),
    };
  },

  addProseMirrorPlugins: () => [calloutRevealPlugin()],

  addInputRules() {
    return [new InputRule({
      find: TYPED_MARKER,
      handler: ({ state, range, match }) => {
        const $from = state.doc.resolve(range.from);
        const depth = $from.depth - 1;
        const quote = $from.node(depth);
        // Only the first paragraph of a quote can open a callout
        if (quote?.type.name !== 'blockquote' || $from.index(depth) !== 0) return null;
        const title = this.editor.schema.nodes.calloutTitle.create(null, $from.parent.content.cut(range.to - $from.start()));
        const body = afterFirst(quote);
        const filled = body.length ? body : [this.editor.schema.nodes.paragraph.create()];
        const callout = this.type.create({ type: match[1], fold: match[2] }, [title, ...filled]);
        const start = $from.before(depth);
        state.tr.replaceWith(start, $from.after(depth), callout);
        state.tr.setSelection(TextSelection.create(state.tr.doc, start + 2));
        return undefined;
      },
    })];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const { type, fold } = node.attrs;
          const title = node.firstChild;
          // inside a tight list item the callout follows its text directly, no blank line
          if (state.inTightList) state.flushClose(1);
          state.wrapBlock('> ', null, node, () => {
            state.write(`[!${type}]${fold}`);
            if (title.content.size) {
              state.write(' ');
              state.renderInline(title, false);
            }
            if (isBodyEmpty(node)) return;
            state.ensureNewLine();
            node.forEach((child, _, i) => { if (i > 0) state.render(child, node, i - 1); });
          });
        },
        parse: { setup: (md) => installOnce(md, 'callout', calloutPlugin) },
      },
    };
  },
});
