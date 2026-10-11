import { installOnce } from './markdownIt.js';
import { MARKUP_ATTR } from './sourceFormatParse.js';

// Inline syntax written one way or another: `_x_` or `*x*`, `__x__` or `**x**`, a bare URL or
// `<url>`, a hard break made of two spaces or of a backslash. The reader remembers which on the
// mark or node; the writer uses it again, unless that would no longer read back the same.

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;
// A URL may only be written bare when plain text around it cannot run into it
const URL_EDGE_BEFORE = /[\s([{"'<>]|^$/;
const URL_EDGE_AFTER = /[\s)\]}"'<>.,;:!?]|^$/;

// ---- reading -------------------------------------------------------------------------------

// The hard break rules push their token last; mark it with how it was written
const markHardBreaks = (md) => {
  const markWith = (name, markup) => {
    const rule = md.inline.ruler.__rules__.find((r) => r.name === name);
    if (!rule) return;
    const base = rule.fn;
    md.inline.ruler.at(name, (state, silent) => {
      const ok = base(state, silent);
      const last = state.tokens[state.tokens.length - 1];
      if (ok && !silent && last?.type === 'hardbreak') last.markup = markup;
      return ok;
    });
  };
  markWith('newline', '  ');
  markWith('escape', '\\');
  // Replaces tiptap-markdown's rule (same output: the line break after <br> is dropped)
  md.renderer.rules.hardbreak = (tokens, idx) => {
    const markup = tokens[idx].markup;
    return markup ? `<br ${MARKUP_ATTR}="${md.utils.escapeHtml(markup)}">` : '<br>';
  };
};

const MARKED = { em_open: true, strong_open: true };

export const inlineMarkupPlugin = (md) => installOnce(md, 'source-format-inline', (instance) => {
  markHardBreaks(instance);
  instance.core.ruler.push('maia_inline_markup', (state) => {
    state.tokens.forEach((block) => {
      (block.children ?? []).forEach((token) => {
        if (MARKED[token.type] || (token.type === 'link_open' && token.markup === 'linkify')) token.attrSet(MARKUP_ATTR, token.markup);
      });
    });
  });
});

// ---- writing -------------------------------------------------------------------------------

const edgeChar = (node, atEnd) => {
  if (!node?.isText || !node.text) return '';
  return atEnd ? node.text.slice(-1) : node.text[0];
};

const runEnd = (parent, index, mark) => {
  let end = index;
  while (end < parent.childCount && mark.isInSet(parent.child(end).marks)) end += 1;
  return end;
};

const charsAround = (parent, index, mark) => {
  const end = runEnd(parent, index, mark);
  return {
    before: index > 0 ? edgeChar(parent.child(index - 1), true) : '',
    after: end < parent.childCount ? edgeChar(parent.child(end), false) : '',
  };
};

// `_x_` only emphasises when no word character touches it, `snake_case_` never does
const underscoreFits = (parent, index, mark) => {
  const { before, after } = charsAround(parent, index, mark);
  return !WORD.test(before) && !WORD.test(after);
};

const isBareUrl = (mark, parent, index) => {
  const node = parent.child(index);
  if (mark.attrs.markup !== 'linkify' || mark.attrs.title || !/^\w+:/.test(mark.attrs.href)) return false;
  if (!node.isText || node.text !== mark.attrs.href || node.marks[node.marks.length - 1] !== mark) return false;
  const { before, after } = charsAround(parent, index, mark);
  return index === parent.childCount - 1 || !mark.isInSet(parent.child(index + 1).marks)
    ? URL_EDGE_BEFORE.test(before) && URL_EDGE_AFTER.test(after)
    : false;
};

// What stands for `**` or `*` for one mark: the one it was written with, when that still works
const delimiterFor = (state, mark, open, parent, index, spec) => {
  const stack = (state.keptDelims ??= {})[mark.type.name] ??= [];
  if (!open) return stack.pop() ?? spec.close;
  const written = mark.attrs.markup;
  const wanted = written === '_' || written === '__' ? written : spec.open;
  const delimiter = wanted !== spec.open && !underscoreFits(parent, index, mark) ? spec.open : wanted;
  stack.push(delimiter);
  return delimiter;
};

const linkSpec = (spec) => ({
  ...spec,
  open(state, mark, parent, index) {
    if (isBareUrl(mark, parent, index)) {
      state.inAutolink = true;
      state.bareUrl = true;
      return '';
    }
    return spec.open.call(this, state, mark, parent, index);
  },
  close(state, mark, parent, index) {
    if (state.bareUrl) {
      state.bareUrl = false;
      state.inAutolink = undefined;
      return '';
    }
    return spec.close.call(this, state, mark, parent, index);
  },
});

// Characters that need no backslash because nothing can read them as syntax
const escapeText = (str, startOfLine) => {
  let out = str.replace(/[`*\\~[\]_]+/g, (run, at) => {
    const next = str[at + run.length];
    const lone = /^[*_]+$/.test(run) && (at === 0 ? startOfLine && run[0] === '_' : SPACE.test(str[at - 1])) && next !== undefined && SPACE.test(next);
    // A text that is only such marks could be a rule (`***`, `___`), so it keeps its backslashes
    const inert = lone && /[^\s*_]/.test(str);
    return [...run].map((ch, i) => {
      if (inert) return ch;
      if (ch === '~' && run[i - 1] !== '~' && run[i + 1] !== '~') return ch;
      // Inside a word an underscore is just a character
      if (ch === '_' && run.length === 1 && at > 0 && next !== undefined && /\w/.test(str[at - 1]) && /\w/.test(next)) return ch;
      return `\\${ch}`;
    }).join('');
  });
  if (startOfLine) out = out.replace(/^(\+[ ]|-(?=[ \t-]|$)|>)/, '\\$&').replace(/^(\s*)(#{1,6})(\s|$)/, '$1\\$2$3').replace(/^(\s*\d+)\.\s/, '$1\\. ');
  return out;
};

/** Gives one serializer state the above. Idempotent per state. */
export const patchInline = (state) => {
  if (state.keepInline) return;
  state.keepInline = true;
  const baseMarkString = state.markString.bind(state);
  const originals = state.marks;
  state.marks = { ...originals, ...(originals.link ? { link: linkSpec(originals.link) } : {}) };
  state.markString = (mark, open, parent, index) => {
    const name = mark.type.name;
    if (name !== 'italic' && name !== 'bold') return baseMarkString(mark, open, parent, index);
    const spec = originals[name];
    const delimiter = delimiterFor(state, mark, open, parent, index, spec);
    const current = state.marks;
    state.marks = { ...current, [name]: { ...current[name], open: delimiter, close: delimiter } };
    try {
      return baseMarkString(mark, open, parent, index);
    } finally {
      state.marks = current;
    }
  };
  state.esc = (str, startOfLine = false) => escapeText(str, startOfLine);
};

/** A hard break written as two spaces stays that; anything else is the editor's backslash. */
export const hardBreakWriter = (stock) => (state, node, parent, index) => {
  const markup = node.attrs.markup;
  if (state.inTable || typeof markup !== 'string' || !/^ {2,}$/.test(markup)) return stock(state, node, parent, index);
  for (let i = index + 1; i < parent.childCount; i += 1) {
    if (parent.child(i).type !== node.type) {
      state.write(`${markup}\n`);
      return undefined;
    }
  }
  return undefined;
};
