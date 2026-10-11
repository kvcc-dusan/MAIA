import { hashSource } from './sourceFormatParse.js';
import { patchInline, hardBreakWriter } from './sourceFormatInline.js';
import { makeRenderList, withGap } from './sourceFormatLists.js';

// Writes top-level blocks back as the user wrote them while they are unchanged, and keeps the
// blank lines between blocks. A block counts as unchanged when it is the node the note was opened
// with, or when the editor's own normal serialization of it equals that of the opened node with
// the same source text: then the text and the node mean exactly the same, so writing the text is safe.

const ITEMS = new Set(['listItem', 'taskItem']);
const LISTS = new Set(['bulletList', 'orderedList', 'taskList']);
// Blocks that end on their own line, so anything may follow without a blank line.
const SELF_ENDING = new Set(['heading', 'horizontalRule', 'codeBlock']);
// Blocks that interrupt a paragraph, so they may follow one without a blank line.
const INTERRUPTS = new Set(['heading', 'bulletList', 'taskList', 'orderedList', 'blockquote', 'callout', 'codeBlock']);

const isZeroGapSafe = (prev, node) => {
  if (SELF_ENDING.has(prev.type.name)) return true;
  // `***` and `___` rules interrupt a paragraph; `---` under text would make it a heading
  if (node.type.name === 'horizontalRule') return !/^\s*-/.test(node.attrs.src ?? '-');
  if (!INTERRUPTS.has(node.type.name)) return false;
  // Only a list that starts at 1 may interrupt a paragraph
  return node.type.name !== 'orderedList' || (node.attrs.start ?? 1) === 1;
};

/** The raw blank lines to put between prev and node, or null for the editor's default. */
// `bothOriginal`: the two blocks are written as they were, next to each other as they were, so
// the file reads back exactly as it did (whatever the blank lines between them were).
export const gapBetween = (prev, node, bothOriginal = false) => {
  const gap = node.attrs.gap;
  if (typeof gap !== 'string') return null;
  if (bothOriginal) return gap;
  if (prev.type === node.type && LISTS.has(node.type.name)) return null;
  if (gap === '') return isZeroGapSafe(prev, node) ? gap : null;
  return gap;
};

// ``` or ~~~ as the note had it, and always longer than any run of the same character in the code
const fenceFor = (node) => {
  const markup = node.attrs.markup;
  const base = typeof markup === 'string' && /^(`{3,}|~{3,})$/.test(markup) ? markup : '```';
  const longest = Math.max(0, ...(node.textContent.match(new RegExp(`${base[0]}+`, 'g')) ?? []).map((run) => run.length));
  return base[0].repeat(Math.max(base.length, longest + 1));
};

const writeCodeBlock = (state, node) => {
  const fence = fenceFor(node);
  state.write(`${fence}${node.attrs.language || ''}\n`);
  state.text(node.textContent, false);
  state.ensureNewLine();
  state.write(fence);
  state.closeBlock(node);
};

export const createSourceFormat = (editor, getLoadedDoc) => {
  let scratch = 0;
  let loaded = { doc: null, nodes: new Set(), bySrc: new Map(), items: new Set(), itemsBySrc: new Map() };
  const meanings = new WeakMap();
  const decided = new WeakMap();

  const normalOf = (node) => {
    const bare = node.type.create({ ...node.attrs, src: null, gap: null, prev: null }, node.content, node.marks);
    scratch += 1;
    try {
      return editor.storage.markdown.serializer.serialize(editor.schema.topNodeType.create(null, [bare]));
    } finally {
      scratch -= 1;
    }
  };

  const meaningOf = (node) => {
    if (!meanings.has(node)) meanings.set(node, normalOf(node));
    return meanings.get(node);
  };

  // The blocks of the document the note was opened with, by identity and by source text
  const loadedIndex = () => {
    const doc = getLoadedDoc();
    if (loaded.doc !== doc) {
      const nodes = new Set();
      const bySrc = new Map();
      const items = new Set();
      const itemsBySrc = new Map();
      doc?.forEach((child) => {
        nodes.add(child);
        const key = child.attrs.src;
        if (typeof key === 'string') bySrc.set(key, [...(bySrc.get(key) ?? []), child]);
      });
      doc?.descendants((child) => {
        if (!ITEMS.has(child.type.name)) return;
        items.add(child);
        const key = child.attrs.src;
        if (typeof key === 'string') itemsBySrc.set(key, [...(itemsBySrc.get(key) ?? []), child]);
      });
      loaded = { doc, nodes, bySrc, items, itemsBySrc };
    }
    return loaded;
  };

  // The one meaning of a source text, or null when it read as different things in different
  // places (it depends on its surroundings, so it cannot be trusted alone)
  const canonOf = (src) => {
    const candidates = loadedIndex().bySrc.get(src);
    if (!candidates) return null;
    const first = meaningOf(candidates[0]);
    return candidates.every((c) => meaningOf(c) === first) ? first : null;
  };

  const verbatimOf = (node) => {
    const src = node.attrs.src;
    if (typeof src !== 'string' || src === '') return null;
    if (loadedIndex().nodes.has(node)) return src;
    if (decided.has(node)) return decided.get(node);
    const meaning = canonOf(src);
    const text = meaning !== null && meaning === normalOf(node) ? src : null;
    decided.set(node, text);
    return text;
  };

  // An unchanged item (the one the note was opened with, or equal to it): its own text
  const keepItem = (node) => {
    const src = node.attrs.src;
    if (scratch > 0 || editor.storage.sourceFormat.plain || typeof src !== 'string' || src === '') return null;
    const { items, itemsBySrc } = loadedIndex();
    return items.has(node) || itemsBySrc.get(src)?.some((candidate) => candidate.eq(node)) ? src : null;
  };

  // The blank lines the note had before this item, while the item before it is still its neighbour
  const gapBefore = (node, previous) => {
    if (scratch > 0 || editor.storage.sourceFormat.plain) return null;
    const { gap, prev } = node.attrs;
    const before = previous.attrs.src;
    return typeof gap === 'string' && typeof before === 'string' && prev === hashSource(before) ? gap : null;
  };
  const renderList = makeRenderList(keepItem, gapBefore);

  const wrap = (serialize) => (state, node, parent, index) => {
    state.renderList = renderList;
    patchInline(state);
    if (scratch > 0 || editor.storage.sourceFormat.plain || parent?.type?.name !== 'doc') return serialize(state, node, parent, index);
    const text = verbatimOf(node);
    let gap = null;
    if (index > 0) {
      const before = parent.child(index - 1);
      const bothOriginal = text !== null && verbatimOf(before) !== null && node.attrs.prev === hashSource(before.attrs.src);
      gap = gapBetween(before, node, bothOriginal);
    }
    if (gap !== null && state.closed) withGap(state, gap);
    if (text !== null) {
      state.write(text);
      state.closeBlock(node);
    } else {
      serialize(state, node, parent, index);
    }
    delete state.flushClose;
    return undefined;
  };

  // Why a block is or is not written verbatim (tests and the vault harness)
  const explain = (node) => {
    const src = node.attrs.src;
    if (typeof src !== 'string' || src === '') return 'no-src';
    const meaning = canonOf(src);
    if (meaning === null) return 'no-canon';
    return meaning === normalOf(node) ? 'ok' : 'mismatch';
  };

  const pick = (name, fn) => {
    if (name === 'codeBlock') return writeCodeBlock;
    return name === 'hardBreak' ? hardBreakWriter(fn) : fn;
  };

  return {
    explain,
    wrapNodes: (nodes) => Object.fromEntries(Object.entries(nodes).map(([name, fn]) => [name, wrap(pick(name, fn))])),
  };
};
