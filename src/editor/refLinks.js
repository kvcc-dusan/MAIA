import { createRawNode, rawElement } from './rawNode.js';
import { lineText } from './markdownIt.js';

const DEF_ATTR = 'data-maia-ref-definition';
const LINK_ATTR = 'data-maia-ref-link';
const REFS_KEY = 'maiaRefs';
const BANG = 0x21;
const OPEN = 0x5b;
// `[id]: url`, optionally `<url>` and a "title", all on one line. Footnote ids (`[^x]`) are not links.
const DEFINITION = /^ {0,3}\[(?!\^)((?:[^\]\\]|\\.)+)\]:[ \t]*(?:<[^>\n]*>|[^\s<]\S*)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*$/;

// Labels match case-insensitively with inner whitespace collapsed, as CommonMark says.
const normalize = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();

const knownRefs = (env) => {
  env[REFS_KEY] ??= new Set();
  return env[REFS_KEY];
};

// Consecutive definition lines become one block so they stay together. markdown-it's own rule
// would inline the urls into the links and drop the definitions.
const definitionRule = (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4 || !DEFINITION.test(lineText(state, startLine))) return false;
  if (silent) return true;
  let last = startLine;
  while (last + 1 < endLine && DEFINITION.test(lineText(state, last + 1))) last += 1;
  for (let line = startLine; line <= last; line += 1) {
    knownRefs(state.env).add(normalize(DEFINITION.exec(lineText(state, line))[1]));
  }
  const token = state.push('maia_ref_definition', '', 0);
  token.content = state.getLines(startLine, last + 1, state.blkIndent, false).replace(/\n+$/, '');
  token.map = [startLine, last + 1];
  state.line = last + 1;
  return true;
};

// End offset of the `]` that closes the `[` at `start`, skipping escapes and nested pairs.
const closingBracket = (src, start) => {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '\\') i += 1;
    else if (src[i] === '[') depth += 1;
    else if (src[i] === ']' && --depth === 0) return i;
  }
  return -1;
};

// `[text][id]`, `[text][]` and `[id]` (and the image forms) when `id` has a definition.
const referenceEnd = (src, pos, refs) => {
  const start = src.charCodeAt(pos) === BANG ? pos + 1 : pos;
  if (src.charCodeAt(start) !== OPEN) return -1;
  const textEnd = closingBracket(src, start);
  if (textEnd === -1) return -1;
  const text = src.slice(start + 1, textEnd);
  if (src.charCodeAt(textEnd + 1) === OPEN) {
    const idEnd = closingBracket(src, textEnd + 1);
    if (idEnd === -1) return -1;
    const id = src.slice(textEnd + 2, idEnd);
    return refs.has(normalize(id || text)) ? idEnd + 1 : -1;
  }
  // a following "(" makes it an ordinary inline link, which markdown-it handles
  return src[textEnd + 1] !== '(' && refs.has(normalize(text)) ? textEnd + 1 : -1;
};

export const refLinkPlugin = (md) => {
  md.block.ruler.before('reference', 'maia_ref_definition', definitionRule);
  md.inline.ruler.before('link', 'maia_ref_link', (state, silent) => {
    const refs = state.env[REFS_KEY];
    if (!refs?.size) return false;
    const end = referenceEnd(state.src, state.pos, refs);
    if (end === -1) return false;
    if (!silent) state.push('maia_ref_link', '', 0).content = state.src.slice(state.pos, end);
    state.pos = end;
    return true;
  });
  md.renderer.rules.maia_ref_definition = (tokens, idx) => rawElement(md, 'div', DEF_ATTR, tokens[idx].content);
  md.renderer.rules.maia_ref_link = (tokens, idx) => rawElement(md, 'span', LINK_ATTR, tokens[idx].content);
};

/** `[id]: https://url "title"` lines, kept as typed. */
export const RefDefinition = createRawNode({
  name: 'refDefinition', dataAttr: DEF_ATTR, isInline: false, plugin: refLinkPlugin, kind: 'ref-definition',
});

/** `[text][id]`, `[text][]` or `[id]`, kept as typed. */
export const RefLink = createRawNode({
  name: 'refLink', dataAttr: LINK_ATTR, isInline: true, plugin: refLinkPlugin, kind: 'ref-link',
});
