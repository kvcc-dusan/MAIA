import { DOMParser as PmDOMParser } from '@tiptap/pm/model';
import { writeRaw } from './rawNode.js';

export const TABLE_ATTR = 'data-maia-table';
const ALIGNS = ['left', 'center', 'right'];
const DELIMITERS = { left: ':---', center: ':---:', right: '---:', none: '---' };
const CANON_CACHE_LIMIT = 60;

export const isAlign = (value) => ALIGNS.includes(value);

/**
 * markdown-it renders the table; this keeps the source lines of every top-level table next to
 * it. A table that was not edited is written back from those lines, so padding, column
 * alignment of the pipes and `|a|b|` shorthand all survive. Tables nested in quotes, lists
 * or callouts carry no source lines (their prefixes are not stripped) and are written fresh.
 */
export const tablePlugin = (md) => {
  md.core.ruler.after('block', 'maia_table_source', (state) => {
    const lines = state.src.split('\n');
    state.tokens
      .filter((token) => token.type === 'table_open' && token.level === 0 && token.map)
      .forEach((token) => {
        token.attrSet(TABLE_ATTR, lines.slice(token.map[0], token.map[1]).join('\n'));
      });
  });
};

// Runs a serializer step against an empty buffer and hands back what it wrote.
// `inlines` holds offsets into `out`, so it is swapped with it or a later trim would cut the real output.
const capture = (state, write) => {
  const saved = { out: state.out, delim: state.delim, closed: state.closed, inTable: state.inTable, inlines: state.inlines };
  Object.assign(state, { out: '', delim: '', closed: null, inTable: true, inlines: [] });
  try {
    write();
    return state.out;
  } finally {
    Object.assign(state, saved);
  }
};

// `|` ends a cell, so every literal pipe is written escaped. markdown-it removes that
// backslash when reading, which makes this the exact inverse (`[[Note\|alias]]` included).
const cellText = (state, cell) => capture(state, () => state.render(cell.firstChild, cell, 0))
  .replace(/\n/g, '<br>')
  .replace(/\|/g, '\\|')
  .trim();

const toLine = (cells) => `| ${cells.join(' | ')} |`;

/** The one fixed way a table is written: `| a | b |`, a `| --- | :---: |` row, `| 1 | 2 |`. */
export const tableLines = (state, table) => {
  const rows = [];
  table.forEach((row) => {
    const cells = [];
    row.forEach((cell) => cells.push(cell));
    rows.push(cells);
  });
  const width = Math.max(1, ...rows.map((cells) => cells.length));
  const padded = rows.map((cells) => Array.from({ length: width }, (_, i) => cells[i]));
  const aligns = padded[0].map((cell) => cell?.attrs.align ?? 'none');
  const texts = padded.map((cells) => cells.map((cell) => (cell ? cellText(state, cell) : '')));
  return [toLine(texts[0]), toLine(aligns.map((align) => DELIMITERS[align] ?? DELIMITERS.none)), ...texts.slice(1).map(toLine)];
};

const canonByRaw = new Map();

// The canonical text of what `raw` parses to, so it can be compared with the table now.
const canonOfRaw = (editor, state, raw) => {
  const cached = canonByRaw.get(raw);
  if (cached) return cached;
  const holder = document.createElement('div');
  holder.innerHTML = editor.storage.markdown.parser.parse(raw);
  const table = PmDOMParser.fromSchema(editor.schema).parse(holder).firstChild;
  const canon = table?.type.name === 'table' ? tableLines(state, table).join('\n') : null;
  if (canon !== null) {
    if (canonByRaw.size >= CANON_CACHE_LIMIT) canonByRaw.delete(canonByRaw.keys().next().value);
    canonByRaw.set(raw, canon);
  }
  return canon;
};

/** Source lines if the table still means what they say, else the canonical form. */
export const serializeTable = (editor, state, node) => {
  const canon = tableLines(state, node).join('\n');
  const { raw } = node.attrs;
  const text = raw && canonOfRaw(editor, state, raw) === canon ? raw : canon;
  // inside a tight list item the table follows its text directly, like the callout
  if (state.inTightList) state.flushClose(1);
  writeRaw(state, text);
  state.closeBlock(node);
};
