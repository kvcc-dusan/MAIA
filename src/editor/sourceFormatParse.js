import { installOnce } from './markdownIt.js';

// Top-level blocks (and list items) remember their exact source lines, and top-level blocks the
// blank lines before them, so a note that is not edited (or a block that is not edited) is
// written back byte for byte. Lists, rules and fences also remember the marker they were written
// with, for the blocks that do get edited. The serializer (sourceFormatSerialize.js) only trusts
// the remembered text while the node still means the same.
export const SRC_ATTR = 'data-src';
export const GAP_ATTR = 'data-gap';
export const PREV_ATTR = 'data-prev';
export const MARKUP_ATTR = 'data-markup';

const MAX_SRC = 200000;
const LIST_PARTS = new Set(['bullet_list_open', 'ordered_list_open', 'list_item_open']);
const MARKUP_TOKENS = new Set(['bullet_list_open', 'ordered_list_open', 'hr', 'fence']);

/** Short fingerprint of a block's source, to tell whether the block before is still the original one. */
export const hashSource = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}.${h.toString(36)}`;
};

const isBlank = (line) => line.trim() === '';

// A list or quote may report its trailing blank line; that line belongs to what follows.
const trimmedEnd = (lines, start, mapEnd, keepBlank) => {
  let end = Math.min(mapEnd, lines.length);
  while (!keepBlank && end > start + 1 && isBlank(lines[end - 1])) end -= 1;
  return end;
};

/** token.meta.sourceFormat = { src, gap, prev, markup } for what the serializer can reuse. */
const annotate = (state) => {
  const lines = state.src.split('\n');
  // Open containers; lists also remember where their last item ended, for the gap before the next
  const open = [];
  let prevEnd = null;
  let prevSrc = null;
  for (const token of state.tokens) {
    if (token.nesting === -1) { open.pop(); continue; }
    const info = {};
    if (MARKUP_TOKENS.has(token.type) && token.markup) info.markup = token.markup;
    if (token.map && token.level === 0) {
      const [start, mapEnd] = token.map;
      const end = trimmedEnd(lines, start, mapEnd, token.type === 'fence');
      const src = lines.slice(start, end).join('\n');
      if (src.length <= MAX_SRC) {
        info.src = src;
        if (prevEnd !== null && start >= prevEnd) {
          info.gap = lines.slice(prevEnd, start).map((l) => `${l}\n`).join('');
          if (prevSrc !== null) info.prev = hashSource(prevSrc);
        }
        prevSrc = src;
      } else {
        prevSrc = null;
      }
      prevEnd = end;
    } else if (token.type === 'list_item_open' && token.map && open.every((c) => LIST_PARTS.has(c.type))) {
      const list = open[open.length - 1];
      const start = token.map[0];
      const end = trimmedEnd(lines, start, token.map[1], false);
      const src = lines.slice(start, end).join('\n');
      if (src.length <= MAX_SRC) {
        info.src = src;
        if (list.end !== null && start >= list.end) {
          info.gap = lines.slice(list.end, start).map((l) => `${l}\n`).join('');
          if (list.src !== null) info.prev = hashSource(list.src);
        }
        list.src = src;
      } else {
        list.src = null;
      }
      list.end = end;
    }
    if (Object.keys(info).length > 0) token.meta = { ...token.meta, sourceFormat: info };
    if (token.nesting === 1) open.push({ type: token.type, end: null, src: null });
  }
};

/** The attributes for the first tag a token renders, whatever rule rendered it. */
const attrsFor = (md, { src, gap, prev, markup }) => {
  const attr = (name, value) => (value === undefined ? '' : ` ${name}="${md.utils.escapeHtml(value)}"`);
  return attr(SRC_ATTR, src) + attr(GAP_ATTR, gap) + attr(PREV_ATTR, prev) + attr(MARKUP_ATTR, markup);
};

const installRenderer = (md) => {
  md.renderer.render = function render(tokens, options, env) {
    let result = '';
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      let chunk;
      if (token.type === 'inline') chunk = this.renderInline(token.children, options, env);
      else if (typeof this.rules[token.type] !== 'undefined') chunk = this.rules[token.type](tokens, i, options, env, this);
      else chunk = this.renderToken(tokens, i, options, env);
      const info = token.meta?.sourceFormat;
      result += info ? chunk.replace(/^(\s*<[A-Za-z][\w-]*)/, (_, head) => head + attrsFor(md, info)) : chunk;
    }
    return result;
  };
};

export const sourceFormatPlugin = (md) => installOnce(md, 'source-format', (instance) => {
  // Last core rule: custom rules (callouts, task lists) have already reshaped the tokens
  instance.core.ruler.push('maia_source_format', annotate);
  installRenderer(instance);
});
