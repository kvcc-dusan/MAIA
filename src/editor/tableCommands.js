import { TextSelection } from '@tiptap/pm/state';
import { isAlign } from './tableMarkdown.js';

const CELL_TYPES = ['tableCell', 'tableHeader'];
const DELIMITER_CELL = /^:?-+:?$/;

/** Where the selection sits in a table: the table, row and column, or null outside one. */
export const tableContext = ($pos) => {
  for (let depth = $pos.depth; depth >= 2; depth -= 1) {
    if (!CELL_TYPES.includes($pos.node(depth).type.name)) continue;
    const tableDepth = depth - 2;
    return {
      table: $pos.node(tableDepth),
      tableStart: $pos.start(tableDepth),
      tablePos: $pos.before(tableDepth),
      row: $pos.index(tableDepth),
      column: $pos.index(depth - 1),
    };
  }
  return null;
};

// Start of the paragraph inside a cell: table content start, rows before, cells before, two opens.
export const cellTextPos = ({ table, tableStart }, row, column) => {
  let pos = tableStart;
  for (let i = 0; i < row; i += 1) pos += table.child(i).nodeSize;
  const rowNode = table.child(row);
  pos += 1;
  for (let j = 0; j < Math.min(column, rowNode.childCount - 1); j += 1) pos += rowNode.child(j).nodeSize;
  return pos + 2;
};

/** `align` ('left' | 'center' | 'right' | null) for every cell of the column the cursor is in. */
export const setColumnAlign = (align) => ({ state, tr, dispatch }) => {
  const context = tableContext(state.selection.$from);
  if (!context || (align !== null && !isAlign(align))) return false;
  if (dispatch) {
    let rowPos = context.tableStart;
    context.table.forEach((row) => {
      const cell = row.maybeChild(context.column);
      if (cell) {
        let cellPos = rowPos + 1;
        for (let j = 0; j < context.column; j += 1) cellPos += row.child(j).nodeSize;
        tr.setNodeMarkup(cellPos, undefined, { ...cell.attrs, align });
      }
      rowPos += row.nodeSize;
    });
  }
  return true;
};

/** Clicking the alignment a column already has takes it off again. */
export const toggleColumnAlign = (align) => (props) => {
  const context = tableContext(props.state.selection.$from);
  if (!context) return false;
  const isSet = context.table.firstChild.maybeChild(context.column)?.attrs.align === align;
  return setColumnAlign(isSet ? null : align)(props);
};

/** Enter in a cell: the same column one row down, adding a row below the last one. */
export const enterNextRow = (editor) => {
  const context = tableContext(editor.state.selection.$from);
  if (!context) return false;
  if (context.row + 1 >= context.table.childCount && !editor.commands.addRowAfter()) return false;
  const next = tableContext(editor.state.selection.$from);
  return editor.commands.command(({ tr }) => {
    const target = cellTextPos(next, next.row + 1, next.column);
    tr.setSelection(TextSelection.create(tr.doc, target));
    return true;
  });
};

// The text of a pipe-delimited line as cells of inline nodes. `\|` is a literal pipe.
const splitCells = (paragraph, schema) => {
  const cells = [[]];
  const push = (text, marks) => { if (text) cells.at(-1).push(schema.text(text, marks)); };
  paragraph.forEach((child) => {
    if (!child.isText) { cells.at(-1).push(child); return; }
    let current = '';
    const { text } = child;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === '\\' && text[i + 1] === '|') { current += '|'; i += 1; } else if (text[i] === '|') {
        push(current, child.marks);
        cells.push([]);
        current = '';
      } else current += text[i];
    }
    push(current, child.marks);
  });
  return cells;
};

const trimCell = (nodes, schema) => nodes
  .map((node, i) => {
    if (!node.isText) return node;
    let { text } = node;
    if (i === 0) text = text.replace(/^\s+/, '');
    if (i === nodes.length - 1) text = text.replace(/\s+$/, '');
    return text ? schema.text(text, node.marks) : null;
  })
  .filter(Boolean);

const headerCells = (paragraph, schema) => {
  const cells = splitCells(paragraph, schema);
  const text = paragraph.textContent.trim();
  if (text.startsWith('|')) cells.shift();
  if (text.endsWith('|') && !text.endsWith('\\|')) cells.pop();
  return cells.map((nodes) => trimCell(nodes, schema));
};

const delimiterAligns = (line) => {
  const parts = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((part) => part.trim());
  if (!parts.every((part) => DELIMITER_CELL.test(part))) return null;
  return parts.map((part) => {
    if (part.startsWith(':') && part.endsWith(':')) return 'center';
    if (part.startsWith(':')) return 'left';
    return part.endsWith(':') ? 'right' : null;
  });
};

/**
 * Enter on a `|---|---|` line right under a `| a | b |` line makes the table, like Obsidian.
 * Returns false (and does nothing) for every other Enter.
 */
export const tableFromTypedRows = (editor) => {
  const { state } = editor;
  const { $from, empty } = state.selection;
  const line = $from.parent;
  const depth = $from.depth;
  if (!empty || line.type.name !== 'paragraph' || depth < 1 || $from.parentOffset !== line.content.size) return false;
  const index = $from.index(depth - 1);
  const parent = $from.node(depth - 1);
  const header = index > 0 ? parent.child(index - 1) : null;
  if (header?.type.name !== 'paragraph' || !header.textContent.includes('|') || !line.textContent.includes('|')) return false;

  const aligns = delimiterAligns(line.textContent);
  const cells = aligns && headerCells(header, state.schema);
  const { table, tableRow, tableHeader, tableCell, paragraph } = state.schema.nodes;
  if (!cells || cells.length !== aligns.length || cells.some((nodes) => nodes.length === 0) || !parent.canReplaceWith(index - 1, index + 1, table)) return false;

  const headRow = tableRow.create(null, cells.map((nodes, i) => tableHeader.create({ align: aligns[i] }, paragraph.create(null, nodes))));
  const bodyRow = tableRow.create(null, aligns.map((align) => tableCell.create({ align }, paragraph.create())));
  const node = table.create(null, [headRow, bodyRow]);
  const from = $from.before(depth) - header.nodeSize;
  return editor.commands.command(({ tr }) => {
    tr.replaceWith(from, $from.after(depth), node);
    const context = { table: node, tableStart: from + 1 };
    tr.setSelection(TextSelection.create(tr.doc, cellTextPos(context, 1, 0)));
    return true;
  });
};
