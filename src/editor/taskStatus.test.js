// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor, typeInto } from './testHelpers.js';
import { statusChar } from './taskStatus.js';

const LOSSLESS = [
  '- [ ] todo\n- [x] done',
  '- [X] upper case stays\n- [ ] b',
  '- [/] partial\n- [-] cancelled\n- [>] deferred\n- [?] question\n- [!] important',
  '- [ ] a\n  - [x] b\n  - [/] c',
  '1. [ ] a\n2. [x] b',
  '3. [ ] a\n4. [/] b',
  '- [ ] a\n\n- [ ] b',
  '- [ ] a\n- plain bullet\n- [x] b',
  '- [x] done with **bold** and [[Link]]',
  '- [ ] task\n\n  second paragraph\n\n- [ ] next',
  '* [ ] a'.replace('*', '-'),
  'before\n\n- [/] task\n\nafter',
  '- [é] accented\n- [😀] emoji',
];

describe('task statuses', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps tight lists tight and loose lists loose', () => {
    expect(roundTrip('- [ ] a\n- [ ] b')).toBe('- [ ] a\n- [ ] b');
    expect(roundTrip('- [ ] a\n\n- [ ] b')).toBe('- [ ] a\n\n- [ ] b');
  });

  it('checks only x and X', () => {
    const editor = makeEditor('- [x] a\n- [X] b\n- [/] c\n- [-] d\n- [ ] e');
    const items = [];
    editor.state.doc.descendants((n) => { if (n.type.name === 'taskItem') items.push([n.attrs.checked, n.attrs.status]); });
    expect(items).toEqual([[true, 'x'], [true, 'X'], [false, '/'], [false, '-'], [false, ' ']]);
    editor.destroy();
  });

  it('puts a task inside a numbered list into an ordered task list', () => {
    expect(nodeTypes('1. [ ] a\n2. [x] b').has('taskItem')).toBe(true);
    expect(nodeTypes('1. [ ] a\n2. [x] b').has('orderedList')).toBe(false);
  });

  it('renumbers an ordered task list from its start (normalization)', () => {
    expect(roundTrip('1. [ ] a\n1. [ ] b')).toBe('1. [ ] a\n2. [ ] b');
  });

  it('leaves text that only looks like a status alone', () => {
    expect(nodeTypes('- [ab] not a task').has('taskItem')).toBe(false);
    expect(roundTrip('[x] not in a list')).toBe('\\[x\\] not in a list');
  });

  it('renders the status on the list item and the glyph in the checkbox label', () => {
    const editor = makeEditor('- [/] partial\n- [x] done\n- [ ] open');
    const items = [...editor.view.dom.querySelectorAll('li')];
    expect(items.map((li) => li.dataset.status ?? '')).toEqual(['/', '', '']);
    expect(items[0].querySelector('.maia-task-glyph').textContent).toBe('/');
    expect(items.map((li) => li.querySelector('input').checked)).toEqual([false, true, false]);
    editor.destroy();
  });

  it('hides the checkbox of a plain item inside a task list', () => {
    const editor = makeEditor('- [ ] a\n- plain');
    const labels = [...editor.view.dom.querySelectorAll('li > label')];
    expect(labels.map((l) => l.hidden)).toEqual([false, true]);
    editor.destroy();
  });

  it('writes x when a command checks a custom status, and a space when it unchecks one', () => {
    expect(statusChar({ checked: true, status: '/' })).toBe('x');
    expect(statusChar({ checked: false, status: 'x' })).toBe(' ');
    expect(statusChar({ checked: false, status: '/' })).toBe('/');
    expect(statusChar({ checked: true, status: 'X' })).toBe('X');
  });

  it('ticking a custom status through the checkbox writes x, unticking writes a space', () => {
    const editor = makeEditor('- [/] a');
    const input = editor.view.dom.querySelector('input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.storage.markdown.getMarkdown()).toBe('- [x] a');
    const again = editor.view.dom.querySelector('input');
    again.checked = false;
    again.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.storage.markdown.getMarkdown()).toBe('- [ ] a');
    editor.destroy();
  });

  describe('live typing', () => {
    const typed = (text) => {
      const editor = makeEditor('');
      editor.commands.focus();
      typeInto(editor, text);
      const md = editor.storage.markdown.getMarkdown();
      editor.destroy();
      return md;
    };

    it.each([
      ['- [x] x', '- [x] x'],
      ['- [ ] x', '- [ ] x'],
      ['[x] x', '- [x] x'],
      ['[ ] x', '- [ ] x'],
      ['- [/] x', '- [/] x'],
    ])('typing %j gives %j', (input, expected) => {
      expect(typed(input)).toBe(expected);
    });
  });

  it('undo restores the previous checkbox state', () => {
    const editor = makeEditor('- [ ] a');
    const input = editor.view.dom.querySelector('input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.storage.markdown.getMarkdown()).toBe('- [x] a');
    editor.commands.undo();
    expect(editor.storage.markdown.getMarkdown()).toBe('- [ ] a');
    editor.destroy();
  });
});
