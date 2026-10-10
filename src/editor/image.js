import { Node } from '@tiptap/core';
import { installOnce } from './markdownIt.js';
import { writeRaw } from './rawNode.js';

const DATA_ATTR = 'data-maia-image';
const LOADABLE_SRC = /^(?:https?:|data:image\/|blob:)/i;
const ALT_SIZE = /^(.*)\|(\d+)(?:x(\d+))?$/;

/** Obsidian puts the size in the alt text: `![alt|300x200](url)`. */
export const parseImageAlt = (alt = '') => {
  const match = ALT_SIZE.exec(alt);
  if (!match) return { label: alt, width: null, height: null };
  return { label: match[1], width: Number(match[2]), height: match[3] ? Number(match[3]) : null };
};

export const isLoadableSrc = (src = '') => LOADABLE_SRC.test(src);

const fileName = (src) => {
  const last = src.split(/[\\/]/).filter(Boolean).pop() ?? src;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

/** Used only for an image that has no original text (pasted or inserted by code). */
const buildMarkdown = ({ src, alt, title }) => {
  const url = /[\s()]/.test(src) ? `<${src}>` : src;
  return `![${alt ?? ''}](${url}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`;
};

const chip = (text) => {
  const el = document.createElement('span');
  el.className = 'maia-raw maia-raw-image';
  el.textContent = text;
  return el;
};

const renderInto = (dom, { src, alt }) => {
  const { label, width, height } = parseImageAlt(alt);
  const fallback = () => dom.replaceChildren(chip(label || fileName(src)));
  if (!isLoadableSrc(src)) return fallback();
  const img = document.createElement('img');
  img.src = src;
  img.alt = label;
  if (width) img.width = width;
  if (height) img.height = height;
  img.addEventListener('error', fallback, { once: true });
  dom.replaceChildren(img);
};

export const imagePlugin = (md) => {
  // Wrap markdown-it's own rule so the original text can be kept next to the parsed parts
  const original = md.inline.ruler.__rules__.find((rule) => rule.name === 'image')?.fn;
  if (!original) return;
  md.inline.ruler.at('image', (state, silent) => {
    const start = state.pos;
    if (!original(state, silent)) return false;
    const token = state.tokens[state.tokens.length - 1];
    if (!silent && token?.type === 'image') token.meta = { raw: state.src.slice(start, state.pos) };
    return true;
  });
  md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx];
    const title = token.attrGet('title');
    const attrs = [
      `src="${md.utils.escapeHtml(token.attrGet('src') ?? '')}"`,
      `alt="${md.utils.escapeHtml(token.content)}"`,
      title ? `title="${md.utils.escapeHtml(title)}"` : '',
      `${DATA_ATTR}="${md.utils.escapeHtml(token.meta?.raw ?? '')}"`,
    ];
    return `<img ${attrs.filter(Boolean).join(' ')}>`;
  };
};

/**
 * `![alt](url)` and `![alt|300](url)` as an inline atom. The original text is kept in `raw` and
 * written back as is, so titles, `<angle>` urls and size hints are never rewritten.
 */
export const Image = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      title: { default: null },
      raw: { default: '', rendered: false, parseHTML: (el) => el.getAttribute(DATA_ATTR) ?? '' },
    };
  },

  parseHTML() {
    return [{ tag: `img[${DATA_ATTR}]` }, { tag: 'img[src]' }];
  },

  renderHTML({ node }) {
    const { src, alt, title, raw } = node.attrs;
    return ['img', { src, alt, title, [DATA_ATTR]: raw }];
  },

  renderText: ({ node }) => node.attrs.raw || node.attrs.alt || '',

  addNodeView() {
    return ({ node: initial }) => {
      const dom = document.createElement('span');
      dom.className = 'maia-image';
      renderInto(dom, initial.attrs);
      return {
        dom,
        update: (node) => {
          if (node.type !== initial.type) return false;
          renderInto(dom, node.attrs);
          return true;
        },
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          writeRaw(state, node.attrs.raw || buildMarkdown(node.attrs));
        },
        parse: { setup: (md) => installOnce(md, 'image', imagePlugin) },
      },
    };
  },
});
