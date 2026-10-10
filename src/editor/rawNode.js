import { InputRule, Node } from '@tiptap/core';
import { installOnce } from './markdownIt.js';

/**
 * Writes source text back exactly as it was read. state.text() would escape it, and
 * its "\!" fix-up for a "[" after "!" would alter footnotes and wikilinks.
 */
export const writeRaw = (state, raw) => {
  const lines = raw.split('\n');
  lines.forEach((line, i) => {
    // write() adds the list/quote indent; an empty line only needs its newline
    if (i === 0 || line !== '') state.write();
    state.out += line;
    if (i < lines.length - 1) state.out += '\n';
  });
};

/**
 * An atom that keeps a piece of markdown verbatim. Used for syntax the editor does not
 * understand yet, so saving can never rewrite it. `plugin` is the markdown-it plugin that
 * emits `<tag dataAttr="raw">` for it; the same attribute is read back by parseHTML.
 * `typedPattern` (ending in `$`) turns text typed live into the atom.
 */
export const createRawNode = ({ name, dataAttr, isInline, plugin, kind = name, typedPattern }) => {
  const tag = isInline ? 'span' : 'div';
  return Node.create({
    name,
    group: isInline ? 'inline' : 'block',
    inline: isInline,
    atom: true,
    selectable: true,

    addAttributes() {
      return { raw: { default: '', rendered: false, parseHTML: (el) => el.getAttribute(dataAttr) ?? '' } };
    },

    parseHTML() {
      return [{ tag: `${tag}[${dataAttr}]` }];
    },

    renderHTML({ node }) {
      return [tag, { [dataAttr]: node.attrs.raw, class: `maia-raw maia-raw-${kind}` }, node.attrs.raw];
    },

    // Keeps tag/link extraction (which reads editor.getText()) seeing the original text.
    renderText: ({ node }) => node.attrs.raw,

    addInputRules() {
      if (!typedPattern) return [];
      return [new InputRule({
        find: typedPattern,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ raw: match[0] }));
        },
      })];
    },

    addStorage() {
      return {
        markdown: {
          serialize(state, node) {
            writeRaw(state, node.attrs.raw);
            if (!isInline) state.closeBlock(node);
          },
          parse: { setup: (md) => installOnce(md, name, plugin) },
        },
      };
    },
  });
};

/** Renders a markdown-it token as the element createRawNode parses back. */
export const rawElement = (md, tag, dataAttr, raw) =>
  `<${tag} ${dataAttr}="${md.utils.escapeHtml(raw)}"></${tag}>`;
