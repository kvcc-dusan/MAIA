// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, makeEditor, typeInto } from './testHelpers.js';

const press = (editor, key) => editor.view.someProp(
  'handleKeyDown',
  (f) => f(editor.view, new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
);

const typed = (text, { enter = false } = {}) => {
  const editor = makeEditor('');
  editor.commands.focus();
  typeInto(editor, text);
  if (enter) press(editor, 'Enter');
  return editor;
};

describe('inline shortcuts', () => {
  it('bold italic round-trips as typed', () => {
    expect(roundTrip('a ***bi*** b')).toBe('a ***bi*** b');
    expect(roundTrip('***whole line***')).toBe('***whole line***');
  });

  it('typing ***x*** makes bold italic text', () => {
    const editor = typed('***x***');
    expect(editor.storage.markdown.getMarkdown()).toBe('***x***');
    const marks = editor.state.doc.firstChild.firstChild.marks.map((m) => m.type.name).sort();
    expect(marks).toEqual(['bold', 'italic']);
    editor.destroy();
  });

  it('typing inside a sentence works and what follows is plain', () => {
    const editor = typed('see ***this*** now');
    expect(editor.storage.markdown.getMarkdown()).toBe('see ***this*** now');
    editor.destroy();
  });

  it('does not touch a lone ** or *', () => {
    expect(typed('**b** and *i* ').storage.markdown.getMarkdown()).toBe('**b** and *i* ');
  });

  it.each(['***', '___', '---'])('%s then Enter makes a horizontal rule', (rule) => {
    const editor = typed(rule, { enter: true });
    const names = [];
    editor.state.doc.forEach((n) => names.push(n.type.name));
    expect(names[0]).toBe('horizontalRule');
    editor.destroy();
  });

  it('Enter after ordinary text splits the paragraph as usual', () => {
    const editor = typed('text', { enter: true });
    const names = [];
    editor.state.doc.forEach((n) => names.push(n.type.name));
    expect(names).toEqual(['paragraph', 'paragraph']);
    editor.destroy();
  });
});
