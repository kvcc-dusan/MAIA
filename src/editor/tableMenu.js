import { Plugin, PluginKey } from '@tiptap/pm/state';
import { tableContext } from './tableCommands.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Line widths of the three alignment glyphs: [left, center, right] as x ranges in a 16px box
const ALIGN_GLYPHS = {
  left: [[2, 14], [2, 9], [2, 12]],
  center: [[2, 14], [4.5, 11.5], [3, 13]],
  right: [[2, 14], [7, 14], [4, 14]],
};

const alignIcon = (align) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  ['width', 'height'].forEach((name) => svg.setAttribute(name, '16'));
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  ALIGN_GLYPHS[align].forEach(([x1, x2], i) => {
    const line = document.createElementNS(SVG_NS, 'line');
    const y = 4 + i * 4;
    Object.entries({ x1, x2, y1: y, y2: y, stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' })
      .forEach(([name, value]) => line.setAttribute(name, String(value)));
    svg.append(line);
  });
  return svg;
};

const RUN = (name, ...args) => (editor) => editor.chain().focus()[name](...args).run();

// `needsBody`: header rows can be neither removed nor given a row above, so those buttons turn off there.
const ACTIONS = [
  { id: 'row-above', label: 'Row above', title: 'Add row above (Cmd+Alt+Up)', run: RUN('addRowBefore'), needsBody: true },
  { id: 'row-below', label: 'Row below', title: 'Add row below (Cmd+Alt+Down)', run: RUN('addRowAfter') },
  { id: 'row-delete', label: 'Delete row', title: 'Delete row (Cmd+Alt+Backspace)', run: RUN('deleteRow'), needsBody: true },
  { id: 'col-left', label: 'Column left', title: 'Add column left (Cmd+Alt+Left)', run: RUN('addColumnBefore') },
  { id: 'col-right', label: 'Column right', title: 'Add column right (Cmd+Alt+Right)', run: RUN('addColumnAfter') },
  { id: 'col-delete', label: 'Delete column', title: 'Delete column (Cmd+Alt+Shift+Backspace)', run: RUN('deleteColumn') },
  { id: 'table-delete', label: 'Delete table', title: 'Delete table', run: RUN('deleteTable') },
];
const ALIGNS = [
  { align: 'left', label: 'Align column left' },
  { align: 'center', label: 'Align column center' },
  { align: 'right', label: 'Align column right' },
];

const makeButton = (editor, { label, title, content, onRun }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maia-table-button';
  button.title = title ?? label;
  button.setAttribute('aria-label', label);
  if (content) button.append(content); else button.textContent = label;
  // keep the caret in the cell: a mousedown would move focus to the button
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => { if (editor.isEditable) onRun(editor); });
  return button;
};

const buildToolbar = (editor) => {
  const bar = document.createElement('div');
  bar.className = 'maia-table-tools';
  bar.contentEditable = 'false';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Table tools');
  const buttons = new Map();
  ACTIONS.forEach((action) => {
    const button = makeButton(editor, { label: action.label, title: action.title, onRun: action.run });
    buttons.set(action.id, { button, action });
    bar.append(button);
  });
  ALIGNS.forEach(({ align, label }) => {
    const button = makeButton(editor, {
      label,
      content: alignIcon(align),
      onRun: (ed) => ed.chain().focus().toggleColumnAlign(align).run(),
    });
    button.dataset.align = align;
    buttons.set(`align-${align}`, { button, align });
    bar.append(button);
  });
  return { bar, buttons };
};

// Lets the selection plugin find each table's toolbar without querying the whole document again.
const toolsByDom = new WeakMap();

/** Node view: a horizontal scroll container around the table, plus the tool bar above it. */
export const createTableView = (node, editor) => {
  const dom = document.createElement('div');
  const scroll = document.createElement('div');
  const table = document.createElement('table');
  const body = document.createElement('tbody');
  const { bar, buttons } = buildToolbar(editor);
  dom.className = 'maia-table';
  scroll.className = 'maia-table-scroll';
  table.append(body);
  scroll.append(table);
  dom.append(bar, scroll);

  // `state` is null when the cursor is elsewhere
  toolsByDom.set(dom, {
    sync: (state) => {
      dom.dataset.active = String(!!state);
      if (!state) return;
      buttons.forEach(({ button, action, align }) => {
        if (action?.needsBody) button.disabled = state.isHeaderRow;
        if (align) button.setAttribute('aria-pressed', String(state.align === align));
      });
    },
  });

  return {
    dom,
    contentDOM: body,
    update: (updated) => updated.type === node.type,
    stopEvent: (event) => event.target instanceof Node && bar.contains(event.target),
    ignoreMutation: (mutation) => mutation.type !== 'selection' && !body.contains(mutation.target),
  };
};

const activeTable = (state, isEditable) => {
  const context = isEditable ? tableContext(state.selection.$from) : null;
  if (!context) return null;
  return {
    pos: context.tablePos,
    isHeaderRow: context.row === 0,
    align: context.table.firstChild.maybeChild(context.column)?.attrs.align ?? null,
  };
};

/** Shows the tool bar of the table the cursor is in, and hides the rest. */
export const tableToolsPlugin = () => new Plugin({
  key: new PluginKey('maiaTableTools'),
  view: () => ({
    update: (view) => {
      const active = activeTable(view.state, view.editable);
      const activeDom = active ? view.nodeDOM(active.pos) : null;
      view.dom.querySelectorAll('.maia-table').forEach((dom) => {
        toolsByDom.get(dom)?.sync(dom === activeDom ? active : null);
      });
    },
  }),
});
