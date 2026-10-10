import { createRawNode, rawElement } from './rawNode.js';
import { lineText, matchAt } from './markdownIt.js';

const INLINE_ATTR = 'data-maia-comment-inline';
const BLOCK_ATTR = 'data-maia-comment-block';
const INLINE_COMMENT = /%%[\s\S]+?%%/y;
const FENCE = '%%';

// Opens a line, does not close on that line, and a later line closes it. Comments that close on
// their own line are inline atoms inside a paragraph.
const blockRule = (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const first = lineText(state, startLine);
  if (!first.startsWith(FENCE) || first.indexOf(FENCE, FENCE.length) !== -1) return false;

  let last = -1;
  for (let line = startLine + 1; line < endLine; line += 1) {
    if (lineText(state, line).includes(FENCE)) {
      last = line;
      break;
    }
  }
  if (last === -1) return false;
  if (silent) return true;

  const token = state.push('maia_comment_block', '', 0);
  token.content = state.getLines(startLine, last + 1, state.blkIndent, false);
  token.map = [startLine, last + 1];
  state.line = last + 1;
  return true;
};

export const commentPlugin = (md) => {
  md.inline.ruler.before('link', 'maia_comment_inline', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x25) return false; // %
    const match = matchAt(INLINE_COMMENT, state.src, state.pos);
    if (!match) return false;
    if (!silent) state.push('maia_comment_inline', '', 0).content = match[0];
    state.pos += match[0].length;
    return true;
  });
  md.block.ruler.before('paragraph', 'maia_comment_block', blockRule);
  md.renderer.rules.maia_comment_inline = (tokens, idx) =>
    rawElement(md, 'span', INLINE_ATTR, tokens[idx].content);
  md.renderer.rules.maia_comment_block = (tokens, idx) =>
    rawElement(md, 'div', BLOCK_ATTR, tokens[idx].content);
};

/** `%%hidden%%` inside a paragraph, kept as typed (wikilinks inside are not parsed). */
export const CommentInline = createRawNode({
  name: 'commentInline', dataAttr: INLINE_ATTR, isInline: true, plugin: commentPlugin, kind: 'comment',
});

/** `%%` on its own line to the closing `%%`, any number of lines, kept as typed. */
export const CommentBlock = createRawNode({
  name: 'commentBlock', dataAttr: BLOCK_ATTR, isInline: false, plugin: commentPlugin, kind: 'comment-block',
});
