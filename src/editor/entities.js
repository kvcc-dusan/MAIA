import { Node, InputRule } from '@tiptap/core';
import { installOnce, matchAt } from './markdownIt.js';

const DATA_ATTR = 'data-maia-entity';
const AMPERSAND = 0x26;
const ENTITY = /&(?:[A-Za-z][A-Za-z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9A-Fa-f]{1,6});/y;
const TYPED_ENTITY = /&(?:[A-Za-z][A-Za-z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9A-Fa-f]{1,6});$/;

// The character an entity stands for, or the entity itself when it names nothing.
export const decodeEntity = (raw) => {
  if (typeof document === 'undefined') return raw;
  const holder = document.createElement('textarea');
  holder.innerHTML = raw;
  return holder.value;
};

// HTML decodes legacy names without their `;` too ("&notanentity;" -> "\u00acanentity;"), so a
// real entity is one that turns into one or two characters and nothing more.
const MAX_ENTITY_CHARS = 2;
const isEntity = (raw) => {
  const decoded = decodeEntity(raw);
  return decoded !== raw && [...decoded].length <= MAX_ENTITY_CHARS;
};

export const entityPlugin = (md) => {
  md.inline.ruler.before('entity', 'maia_entity', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== AMPERSAND) return false;
    const match = matchAt(ENTITY, state.src, state.pos);
    if (!match || !isEntity(match[0])) return false;
    if (!silent) state.push('maia_entity', '', 0).content = match[0];
    state.pos += match[0].length;
    return true;
  });
  md.renderer.rules.maia_entity = (tokens, idx) =>
    `<span ${DATA_ATTR}="${md.utils.escapeHtml(tokens[idx].content)}"></span>`;
};

/**
 * `&amp;`, `&copy;` and numeric entities: shown as the character, saved as typed. Without this the
 * parser decodes them and the file loses the entity the author wrote.
 */
export const HtmlEntity = Node.create({
  name: 'htmlEntity',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { raw: { default: '', rendered: false, parseHTML: (el) => el.getAttribute(DATA_ATTR) ?? '' } };
  },

  parseHTML: () => [{ tag: `span[${DATA_ATTR}]` }],
  renderHTML: ({ node }) => ['span', { [DATA_ATTR]: node.attrs.raw, class: 'maia-entity' }, decodeEntity(node.attrs.raw)],
  renderText: ({ node }) => decodeEntity(node.attrs.raw),

  addInputRules() {
    return [new InputRule({
      find: TYPED_ENTITY,
      handler: ({ state, range, match }) => {
        if (!isEntity(match[0])) return null;
        state.tr.replaceWith(range.from, range.to, this.type.create({ raw: match[0] }));
        return undefined;
      },
    })];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          state.write(node.attrs.raw);
        },
        parse: { setup: (md) => installOnce(md, 'entity', entityPlugin) },
      },
    };
  },
});
