import { createRawNode, rawElement } from './rawNode.js';
import { lineText } from './markdownIt.js';

const INLINE_ATTR = 'data-maia-math-inline';
const BLOCK_ATTR = 'data-maia-math-block';
const FENCE = '$$';

const isSpace = (ch) => ch === undefined || /\s/.test(ch);
const isDigit = (ch) => ch !== undefined && /\d/.test(ch);

// Length of the math span at `pos`, or 0. Same guards as Obsidian: "$5 and $10" is not math
// (no space after the opener or before the closer, no digit right after the closer).
export const mathLength = (src, pos) => {
  if (src[pos] !== '$') return 0;
  if (src.startsWith(FENCE, pos)) {
    const close = src.indexOf(FENCE, pos + FENCE.length);
    return close === -1 || close === pos + FENCE.length ? 0 : close + FENCE.length - pos;
  }
  if (isSpace(src[pos + 1])) return 0;
  for (let i = pos + 1; i < src.length; i += 1) {
    if (src[i] === '\\') i += 1;
    else if (src[i] === '$') {
      return isSpace(src[i - 1]) || isDigit(src[i + 1]) ? 0 : i + 1 - pos;
    }
  }
  return 0;
};

// `$$` opens the line. It closes on the same line (nothing after it) or on a later line.
const blockRule = (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const first = lineText(state, startLine);
  if (!first.startsWith(FENCE)) return false;

  const sameLineClose = first.indexOf(FENCE, FENCE.length);
  let last = -1;
  if (sameLineClose !== -1) {
    if (first.slice(sameLineClose + FENCE.length).trim() !== '') return false; // inline math in a paragraph
    last = startLine;
  } else {
    for (let line = startLine + 1; line < endLine; line += 1) {
      if (lineText(state, line).includes(FENCE)) {
        last = line;
        break;
      }
    }
  }
  if (last === -1) return false;
  if (silent) return true;

  const token = state.push('maia_math_block', '', 0);
  token.content = state.getLines(startLine, last + 1, state.blkIndent, false);
  token.map = [startLine, last + 1];
  state.line = last + 1;
  return true;
};

export const mathPlugin = (md) => {
  md.inline.ruler.before('link', 'maia_math_inline', (state, silent) => {
    const length = mathLength(state.src, state.pos);
    if (!length) return false;
    if (!silent) state.push('maia_math_inline', '', 0).content = state.src.slice(state.pos, state.pos + length);
    state.pos += length;
    return true;
  });
  md.block.ruler.before('paragraph', 'maia_math_block', blockRule);
  md.renderer.rules.maia_math_inline = (tokens, idx) => rawElement(md, 'span', INLINE_ATTR, tokens[idx].content);
  md.renderer.rules.maia_math_block = (tokens, idx) => rawElement(md, 'div', BLOCK_ATTR, tokens[idx].content);
};

// Not rendered yet: shown as raw source so nothing is lost. KaTeX replaces these later.

/** `$x$` and `$$x$$` inside a paragraph. */
export const MathInline = createRawNode({
  name: 'mathInline', dataAttr: INLINE_ATTR, isInline: true, plugin: mathPlugin, kind: 'math',
});

/** `$$` ... `$$` on their own lines. */
export const MathBlock = createRawNode({
  name: 'mathBlock', dataAttr: BLOCK_ATTR, isInline: false, plugin: mathPlugin, kind: 'math-block',
});
