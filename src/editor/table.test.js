// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor, typeInto } from './testHelpers.js';
import { cellTextPos } from './tableCommands.js';

const press = (editor, key, init = {}) => editor.view.someProp(
  'handleKeyDown',
  (f) => f(editor.view, new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })),
);

// Tables as people write them: the source is kept as long as the table is not edited.
const UNTOUCHED = [
  '| a | b |\n| - | - |\n| 1 | 2 |',
  '| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |',
  'a | b\n--- | ---\n1 | 2',
  '|a|b|\n|---|---|\n|1|2|',
  '| Name  | Qty |\n| :---- | --: |\n| Apple |   3 |\n| Fig   |  12 |',
  '| a | b |\n| - | - |\n| **x** | `y` [[Z]] |',
  '| a | b |\n| - | - |\n| _it_ | __bold__ |',
  '| a | b |\n| - | - |\n| x \\| y | 2 |',
  '| a | b |\n| - | - |\n| [[Note\\|alias]] | ==hl== |',
  '| a | b |\n| - | - |\n| x<br>y | 2 |',
  '| a | b |\n| - | - |\n| [link](https://example.com) | ~~s~~ |',
  '| a |\n| --- |\n| only |',
  '| a | b |\n| - | - |',
  '| a | b |\n| - | - |\n| 1 |',
  'before\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nafter',
  '# T\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n| c | d |\n| - | - |\n| 3 | 4 |',
  '| a | b |\n| - | - |\n|  | 2 |',
  '| Åäö | 日本 |\n| --- | --- |\n| é | 🎉 |',
];

// The written form of an edited (or nested) table. This is the allowed normalization.
const CANONICAL = [
  '| a | b |\n| --- | --- |\n| 1 | 2 |',
  '| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |',
  '| a |\n| --- |\n| only |',
  '| a | b |\n| --- | --- |\n| x<br>y | 2 |',
  '| a | b |\n| --- | --- |\n| x \\| y | `p\\|q` |',
  '| a | b |\n| --- | --- |\n| **bold** | *it* [[W\\|alias]] ==hl== |',
  '- item\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |',
  '> | a | b |\n> | --- | --- |\n> | 1 | 2 |',
];

// Puts the caret at the end of a cell's text (row 0 is the header row)
const placeCursor = (editor, row, column, atEnd = true) => {
  const table = editor.state.doc.firstChild;
  const pos = cellTextPos({ table, tableStart: 1 }, row, column);
  editor.commands.setTextSelection(atEnd ? pos + table.child(row).child(column).textContent.length : pos);
};

const editCell = (md) => {
  const editor = makeEditor(md);
  placeCursor(editor, 1, 1);
  editor.commands.insertContent('!');
  const out = editor.storage.markdown.getMarkdown();
  editor.destroy();
  return out;
};

describe('tables', () => {
  it.each(UNTOUCHED)('an untouched table is byte-identical: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it.each(CANONICAL)('the written form is stable: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('parses a table, its header row, and alignment', () => {
    const editor = makeEditor('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |');
    const cells = [];
    editor.state.doc.descendants((n) => { if (/^table(Header|Cell)$/.test(n.type.name)) cells.push([n.type.name, n.attrs.align]); });
    expect(cells).toEqual([
      ['tableHeader', 'left'], ['tableHeader', 'center'], ['tableHeader', 'right'],
      ['tableCell', 'left'], ['tableCell', 'center'], ['tableCell', 'right'],
    ]);
    expect(editor.view.dom.querySelector('th').style.textAlign).toBe('left');
    editor.destroy();
  });

  it('wraps the table in a scroll container', () => {
    const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(editor.view.dom.querySelector('.maia-table > .maia-table-scroll > table')).not.toBeNull();
    editor.destroy();
  });

  it('keeps wikilinks, marks and <br> inside cells as nodes', () => {
    const types = nodeTypes('| a | b |\n| - | - |\n| [[N]] x<br>y | **b** |');
    expect(types.has('wikiLink')).toBe(true);
    expect(types.has('htmlInline')).toBe(true);
  });

  describe('editing', () => {
    it('writes an edited table in the normalized form and keeps its alignment', () => {
      expect(editCell('|a|b|\n|:-:|--:|\n|1|2|')).toBe('| a | b |\n| :---: | ---: |\n| 1 | 2! |');
    });

    it('escapes a pipe typed into a cell', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 1, 1);
      editor.commands.insertContent('|');
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| --- | --- |\n| 1 | 2\\| |');
      editor.destroy();
    });

    it('a hard break typed into a cell is written as <br>', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 1, 1);
      editor.commands.setHardBreak();
      editor.commands.insertContent('x');
      expect(editor.storage.markdown.getMarkdown()).toContain('| 1 | 2<br>x |');
      editor.destroy();
    });

    it('returns to the source text when an edit is undone', () => {
      const md = '|a|b|\n|---|---|\n|1|2|';
      const editor = makeEditor(md);
      placeCursor(editor, 1, 1);
      editor.commands.insertContent('!');
      expect(editor.storage.markdown.getMarkdown()).not.toBe(md);
      editor.commands.undo();
      expect(editor.storage.markdown.getMarkdown()).toBe(md);
      editor.destroy();
    });

    it('Tab and Shift-Tab move between cells; Tab in the last cell adds a row', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 0, 0);
      expect(press(editor, 'Tab')).toBe(true);
      expect(editor.state.selection.$from.parent.textContent).toBe('b');
      expect(press(editor, 'Tab', { shiftKey: false })).toBe(true);
      expect(editor.state.selection.$from.parent.textContent).toBe('1');
      placeCursor(editor, 1, 1);
      expect(press(editor, 'Tab')).toBe(true);
      expect(editor.state.doc.firstChild.childCount).toBe(3);
      expect(press(editor, 'Tab', { shiftKey: true })).toBe(true);
      editor.destroy();
    });

    it('Enter moves one row down in the same column and adds a row at the end', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 0, 1);
      expect(editor.state.selection.$from.parent.textContent).toBe('b');
      expect(press(editor, 'Enter')).toBe(true);
      expect(editor.state.selection.$from.parent.textContent).toBe('2');
      expect(press(editor, 'Enter')).toBe(true);
      expect(editor.state.doc.firstChild.childCount).toBe(3);
      expect(editor.state.selection.$from.parent.textContent).toBe('');
      expect(editor.state.selection.$from.index(editor.state.selection.$from.depth - 2)).toBe(1);
      editor.destroy();
    });

    it('never leaves a table without its header row', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 0, 0);
      editor.commands.deleteRow();
      const out = editor.storage.markdown.getMarkdown();
      expect(out.split('\n')[1]).toMatch(/^\| -+ \| -+ \|$/);
      editor.destroy();
    });

    it('adds and deletes rows and columns', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 1, 1);
      editor.commands.addRowAfter();
      editor.commands.addColumnAfter();
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |  |\n| --- | --- | --- |\n| 1 | 2 |  |\n|  |  |  |');
      placeCursor(editor, 2, 2);
      editor.commands.deleteColumn();
      editor.commands.deleteRow();
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| - | - |\n| 1 | 2 |');
      editor.destroy();
    });

    it('sets and clears column alignment, header and body together', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 1, 1);
      editor.commands.toggleColumnAlign('right');
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| --- | ---: |\n| 1 | 2 |');
      editor.commands.toggleColumnAlign('right');
      // back to what the source said, so the source text is written again
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| - | - |\n| 1 | 2 |');
      editor.commands.toggleColumnAlign('center');
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| --- | :---: |\n| 1 | 2 |');
      editor.destroy();
    });

    it('shows the tool bar only while the cursor is in the table', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |\n\nafter');
      const dom = () => editor.view.dom.querySelector('.maia-table');
      placeCursor(editor, 0, 0);
      expect(dom().dataset.active).toBe('true');
      expect(dom().querySelector('[aria-label="Delete row"]').disabled).toBe(true);
      editor.commands.setTextSelection(editor.state.doc.content.size - 2);
      expect(dom().dataset.active).toBe('false');
      editor.destroy();
    });

    it('tool bar buttons run the commands', () => {
      const editor = makeEditor('| a | b |\n| - | - |\n| 1 | 2 |');
      placeCursor(editor, 1, 1);
      editor.view.dom.querySelector('[aria-label="Row below"]').click();
      expect(editor.state.doc.firstChild.childCount).toBe(3);
      editor.view.dom.querySelector('[aria-label="Align column center"]').click();
      expect(editor.storage.markdown.getMarkdown()).toContain('| --- | :---: |');
      editor.destroy();
    });
  });

  describe('live typing', () => {
    const typed = (lines) => {
      const editor = makeEditor('');
      editor.commands.focus();
      lines.forEach((line, i) => {
        if (i > 0) press(editor, 'Enter') || editor.commands.splitBlock();
        typeInto(editor, line);
      });
      press(editor, 'Enter');
      return editor;
    };

    it('a header row, a delimiter row and Enter make a table', () => {
      const editor = typed(['| a | b |', '|---|:-:|']);
      const table = editor.state.doc.firstChild;
      expect(table.type.name).toBe('table');
      expect(table.childCount).toBe(2);
      expect(editor.storage.markdown.getMarkdown()).toBe('| a | b |\n| --- | :---: |\n|  |  |');
      expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
      expect(editor.state.selection.$from.node(editor.state.selection.$from.depth - 2).childCount).toBe(2);
      editor.destroy();
    });

    it('works without outer pipes', () => {
      const editor = typed(['a | b', ':-- | --:']);
      expect(editor.state.doc.firstChild.type.name).toBe('table');
      editor.destroy();
    });

    it('does nothing when the column counts differ or there is no pipe', () => {
      expect(typed(['| a | b |', '|---|']).state.doc.firstChild.type.name).toBe('paragraph');
      expect(typed(['a b', '---']).state.doc.firstChild.type.name).not.toBe('table');
    });
  });
});
