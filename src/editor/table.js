import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { installOnce } from './markdownIt.js';
import { TABLE_ATTR, isAlign, tablePlugin, serializeTable } from './tableMarkdown.js';
import { setColumnAlign, toggleColumnAlign, enterNextRow, tableFromTypedRows } from './tableCommands.js';
import { createTableView, tableToolsPlugin } from './tableMenu.js';

const alignAttribute = () => ({
  align: {
    default: null,
    // markdown-it writes `style="text-align:center"` for `:---:`
    parseHTML: (el) => {
      const value = el.style?.textAlign || el.getAttribute('align');
      return isAlign(value) ? value : null;
    },
    renderHTML: (attrs) => (attrs.align ? { style: `text-align: ${attrs.align}` } : {}),
  },
});

// A markdown cell holds one line of inline content, so a cell holds exactly one paragraph.
// That also keeps lists, headings and code from being typed into a cell.
const cellConfig = {
  content: 'paragraph',
  addAttributes() {
    return { ...this.parent?.(), ...alignAttribute() };
  },
};

export const MarkdownTableHeader = TableHeader.extend(cellConfig);
export const MarkdownTableCell = TableCell.extend(cellConfig);
export { TableRow as MarkdownTableRow };

/** Pipe tables: alignment, escaped pipes, `<br>`, and untouched tables written back as they were. */
export const MarkdownTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // The table's source lines, for the "unchanged means identical" rule (tableMarkdown.js)
      raw: { default: '', rendered: false, parseHTML: (el) => el.getAttribute(TABLE_ATTR) ?? '' },
    };
  },

  addNodeView() {
    return ({ node }) => createTableView(node, this.editor);
  },

  addCommands() {
    return { ...this.parent?.(), setColumnAlign, toggleColumnAlign };
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), tableToolsPlugin()];
  },

  addKeyboardShortcuts() {
    const chain = (name) => () => this.editor.chain().focus()[name]().run();
    return {
      ...this.parent?.(),
      Enter: () => enterNextRow(this.editor) || tableFromTypedRows(this.editor),
      'Mod-Alt-ArrowUp': chain('addRowBefore'),
      'Mod-Alt-ArrowDown': chain('addRowAfter'),
      'Mod-Alt-ArrowLeft': chain('addColumnBefore'),
      'Mod-Alt-ArrowRight': chain('addColumnAfter'),
      'Mod-Alt-Backspace': chain('deleteRow'),
      'Mod-Alt-Shift-Backspace': chain('deleteColumn'),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          serializeTable(this.editor, state, node);
        },
        parse: { setup: (md) => installOnce(md, 'table', tablePlugin) },
      },
    };
  },
});
