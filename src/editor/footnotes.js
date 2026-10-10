import { createRawNode, rawElement } from './rawNode.js';
import { lineText, matchAt } from './markdownIt.js';

const REF_ATTR = 'data-maia-footnote-ref';
const DEF_ATTR = 'data-maia-footnote-def';
const INLINE_ATTR = 'data-maia-inline-footnote';
const REF = /\[\^[^\]\s]+\]/y;
const TYPED_REF = /\[\^[^\]\s]+\]$/;
const DEF_START = /^\[\^[^\]\s]+\]:/;
const CARET = '^[';
const CONTINUATION_INDENT = 2;

// End offset of a `^[text]` with balanced brackets, or -1 when it never closes.
const inlineFootnoteEnd = (src, pos) => {
  if (!src.startsWith(CARET, pos)) return -1;
  let depth = 0;
  for (let i = pos + 1; i < src.length; i += 1) {
    if (src[i] === '\\') i += 1;
    else if (src[i] === '[') depth += 1;
    else if (src[i] === ']' && --depth === 0) return i + 1;
  }
  return -1;
};

// `[^1]: text`, plus indented continuation lines (blank lines allowed between them) and
// directly following definitions. Taken before markdown-it's own link-reference rule eats it.
const definitionRule = (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  if (!DEF_START.test(lineText(state, startLine))) return false;
  if (silent) return true;

  let last = startLine;
  for (let line = startLine + 1; line < endLine; line += 1) {
    if (state.isEmpty(line)) continue;
    const isContinuation = state.sCount[line] - state.blkIndent >= CONTINUATION_INDENT;
    const isNextDefinition = line === last + 1 && DEF_START.test(lineText(state, line));
    if (!isContinuation && !isNextDefinition) break;
    last = line;
  }

  const token = state.push('maia_footnote_def', '', 0);
  token.content = state.getLines(startLine, last + 1, state.blkIndent, false);
  token.map = [startLine, last + 1];
  state.line = last + 1;
  return true;
};

export const footnotePlugin = (md) => {
  md.inline.ruler.before('link', 'maia_inline_footnote', (state, silent) => {
    const end = inlineFootnoteEnd(state.src, state.pos);
    if (end === -1) return false;
    if (!silent) state.push('maia_inline_footnote', '', 0).content = state.src.slice(state.pos, end);
    state.pos = end;
    return true;
  });
  md.inline.ruler.before('link', 'maia_footnote_ref', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x5b) return false; // [
    const match = matchAt(REF, state.src, state.pos);
    if (!match) return false;
    if (!silent) state.push('maia_footnote_ref', '', 0).content = match[0];
    state.pos += match[0].length;
    return true;
  });
  md.block.ruler.before('reference', 'maia_footnote_def', definitionRule);
  md.renderer.rules.maia_footnote_ref = (tokens, idx) => rawElement(md, 'span', REF_ATTR, tokens[idx].content);
  md.renderer.rules.maia_inline_footnote = (tokens, idx) => rawElement(md, 'span', INLINE_ATTR, tokens[idx].content);
  md.renderer.rules.maia_footnote_def = (tokens, idx) => rawElement(md, 'div', DEF_ATTR, tokens[idx].content);
};

/** `[^1]` / `[^name]` */
export const FootnoteRef = createRawNode({
  name: 'footnoteRef', dataAttr: REF_ATTR, isInline: true, plugin: footnotePlugin, kind: 'footnote', typedPattern: TYPED_REF,
});

/** `^[text]` */
export const InlineFootnote = createRawNode({
  name: 'inlineFootnote', dataAttr: INLINE_ATTR, isInline: true, plugin: footnotePlugin, kind: 'footnote',
});

/** `[^1]: text`, including its continuation lines. */
export const FootnoteDefinition = createRawNode({
  name: 'footnoteDefinition', dataAttr: DEF_ATTR, isInline: false, plugin: footnotePlugin, kind: 'footnote-def',
});
