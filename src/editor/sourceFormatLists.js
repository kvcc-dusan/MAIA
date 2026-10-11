// List rendering that keeps what the user wrote: the bullet or number delimiter of the list, and
// every item that was not edited (so changing one item does not restyle its siblings).
// prosemirror-markdown's renderList, with those two additions.

const BULLETS = new Set(['-', '*', '+']);
const DELIMITERS = new Set(['.', ')']);

/** The item prefix (`- `, ` 1. `) with the list's own marker in place of the default one. */
export const withListMarker = (prefix, node) => {
  const markup = node.attrs.markup;
  if (DELIMITERS.has(markup)) return prefix.replace(/[.)](\s*)$/, (_, space) => markup + space);
  if (BULLETS.has(markup)) return prefix.replace(/^(\s*)[-*+]/, (_, space) => space + markup);
  return prefix;
};

const leadingSpaces = (text) => text.match(/^ */)[0].length;

// Every line starts with the indent of the first (spaces only): the item can be moved to another depth
const isPortable = (text) => {
  const indent = text.match(/^[ \t]*/)[0];
  return !indent.includes('\t') && text.split('\n').every((line) => line.trim() === '' || (line.startsWith(indent) && !/^ *\t/.test(line)));
};

/** The next block separator is these raw blank lines (each ending in a line break). Used once. */
export const withGap = (state, gap) => {
  state.flushClose = () => {
    delete state.flushClose;
    if (!state.closed) return;
    if (!state.atBlank()) state.out += '\n';
    const blank = state.delim.replace(/\s+$/, '');
    gap.split('\n').slice(0, -1).forEach((line) => { state.out += `${state.delim ? blank : line}\n`; });
    state.closed = null;
  };
};

// An item's own lines. At the left margin they are written as they were; inside another block
// they are moved left by the indent the item had, and indented to where the list is now.
const writeItem = (state, text, list) => {
  state.flushClose();
  const indent = state.delim ? leadingSpaces(text) : 0;
  text.split('\n').forEach((line, i) => {
    const body = line.slice(Math.min(indent, leadingSpaces(line)));
    if (i === 0) {
      if (state.delim && state.atBlank()) state.out += state.delim;
      state.out += body;
      return;
    }
    state.out += '\n';
    if (line.trim() === '') state.out += state.delim ? state.delim.replace(/\s+$/, '') : line;
    else state.out += state.delim + body;
  });
  state.closeBlock(list);
};

/**
 * renderList for a serializer state. `keep(item)` gives an unchanged item's text or null;
 * `gapBefore(item, previous)` the original blank lines between two items still next to each other.
 */
export const makeRenderList = (keep, gapBefore) => function renderList(node, delim, firstDelim) {
  if (this.closed && this.closed.type === node.type) this.flushClose(3);
  else if (this.inTightList) this.flushClose(1);

  const isTight = typeof node.attrs.tight !== 'undefined' ? node.attrs.tight : this.options.tightLists;
  const wasTight = this.inTightList;
  this.inTightList = isTight;
  node.forEach((child, _, i) => {
    const gap = i > 0 ? gapBefore(child, node.child(i - 1)) : null;
    if (i && isTight && gap === null) this.flushClose(1);
    if (gap !== null && this.closed) withGap(this, gap);
    const text = keep(child);
    // Items kept as written can move to another depth only if all their lines share one indent
    if (text !== null && (!this.delim || isPortable(text))) {
      writeItem(this, text, node);
    } else {
      this.wrapBlock(delim, withListMarker(firstDelim(i), node), node, () => this.render(child, node, i));
    }
    delete this.flushClose;
  });
  this.inTightList = wasTight;
};
