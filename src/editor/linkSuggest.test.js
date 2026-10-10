// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeEditor, typeInto } from './testHelpers.js';

const NOTES = [
  { id: '1', title: 'Alpha', folder: '', updatedAt: '2026-01-01T00:00:00Z', content: '# Intro\n## Setup\ntext ^blk1\n' },
  { id: '2', title: 'Beta', folder: 'Projects', updatedAt: '2026-02-01T00:00:00Z', content: '' },
  { id: '3', title: 'Meeting', folder: 'Work', updatedAt: '2026-03-01T00:00:00Z', content: '' },
  { id: '4', title: 'Meeting', folder: 'Home', updatedAt: '2026-03-02T00:00:00Z', content: '' },
];
const FILES = ['img/pic.png', 'docs/spec.pdf'];

const editors = [];
const setup = (markdown = '', { files = FILES } = {}) => {
  const editor = makeEditor(markdown, {
    linkSuggest: { getNotes: () => NOTES, getFiles: async () => files },
  });
  editors.push(editor);
  editor.commands.focus('end');
  return editor;
};
afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

const popup = () => document.querySelector('.maia-link-suggest');
const options = () => [...document.querySelectorAll('.maia-link-suggest-option')];
const optionLabels = () => options().map((o) => o.querySelector('.maia-link-suggest-label').textContent);
const open = (editor, text) => {
  typeInto(editor, text);
  return vi.waitFor(() => expect(popup()).not.toBeNull());
};
const press = (editor, key, init = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  editor.view.dom.dispatchEvent(event);
  return event;
};
const markdown = (editor) => editor.storage.markdown.getMarkdown();

describe('link suggest', () => {
  it('opens on [[ with the notes, newest first, as a listbox', async () => {
    const editor = setup();
    await open(editor, '[[');
    await vi.waitFor(() => expect(options()).toHaveLength(4));
    expect(optionLabels()).toEqual(['Meeting', 'Meeting', 'Beta', 'Alpha']);
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(options()[0].textContent).toContain('Home');
  });

  it('filters live as you type', async () => {
    const editor = setup();
    await open(editor, '[[');
    typeInto(editor, 'alp');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Alpha']));
  });

  it('moves with the arrow keys and wraps', async () => {
    const editor = setup();
    await open(editor, '[[');
    await vi.waitFor(() => expect(options()).toHaveLength(4));
    press(editor, 'ArrowDown');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    press(editor, 'ArrowUp');
    press(editor, 'ArrowUp');
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    expect(editor.view.dom.getAttribute('aria-activedescendant')).toBe(options()[3].id);
    expect(editor.view.dom.getAttribute('aria-controls')).toBe(document.querySelector('[role="listbox"]').id);
  });

  it('Enter inserts a wikiLink atom that serializes to exactly [[Target]]', async () => {
    const editor = setup();
    typeInto(editor, 'hello ');
    await open(editor, '[[bet');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Beta']));
    const event = press(editor, 'Enter');
    expect(event.defaultPrevented).toBe(true);
    const types = [];
    editor.state.doc.descendants((n) => { types.push(n.type.name); });
    expect(types).toContain('wikiLink');
    expect(markdown(editor)).toBe('hello [[Beta]]');
    expect(popup()).toBeNull();
    expect(editor.view.dom.hasAttribute('aria-controls')).toBe(false);
  });

  it('Tab inserts too', async () => {
    const editor = setup();
    await open(editor, '[[alp');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Alpha']));
    press(editor, 'Tab');
    expect(markdown(editor)).toBe('[[Alpha]]');
  });

  it('uses the folder path form when the title exists twice', async () => {
    const editor = setup();
    await open(editor, '[[meet');
    await vi.waitFor(() => expect(options()).toHaveLength(2));
    press(editor, 'Enter');
    expect(markdown(editor)).toBe('[[Home/Meeting]]');
  });

  it('does not duplicate a closing ]] that is already there', async () => {
    const editor = setup('[[]]');
    editor.commands.setTextSelection(3);
    typeInto(editor, 'alp');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Alpha']));
    press(editor, 'Enter');
    expect(markdown(editor)).toBe('[[Alpha]]');
  });

  it('clicking an option inserts it', async () => {
    const editor = setup();
    await open(editor, '[[be');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    options()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(markdown(editor)).toBe('[[Beta]]');
  });

  it('undoes an insertion in one step', async () => {
    const editor = setup();
    await open(editor, '[[be');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    press(editor, 'Enter');
    editor.commands.undo();
    expect(markdown(editor)).not.toContain('[[Beta]]');
  });

  it('Escape closes the popup and stays closed while typing on', async () => {
    const editor = setup();
    await open(editor, '[[al');
    const event = press(editor, 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(popup()).toBeNull();
    typeInto(editor, 'p');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
  });

  it('shows an empty state and leaves Enter alone when nothing matches', async () => {
    const editor = setup();
    await open(editor, '[[zzzz');
    await vi.waitFor(() => expect(document.querySelector('.maia-link-suggest-empty').textContent).toBe('No matching note'));
    expect(document.querySelector('[role="status"]').textContent).toBe('No matching note');
    press(editor, 'Enter');
    expect(editor.state.doc.childCount).toBe(2); // Enter reached the editor and split the paragraph
  });

  it('announces the result count', async () => {
    const editor = setup();
    await open(editor, '[[');
    await vi.waitFor(() => expect(document.querySelector('[role="status"]').textContent).toBe('4 results'));
  });

  it('suggests headings after # and inserts [[Note#Heading]]', async () => {
    const editor = setup();
    await open(editor, '[[Alpha#');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Intro', 'Setup']));
    typeInto(editor, 'set');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Setup']));
    press(editor, 'Enter');
    expect(markdown(editor)).toBe('[[Alpha#Setup]]');
  });

  it('suggests block ids after #^', async () => {
    const editor = setup();
    await open(editor, '[[Alpha#^');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['text']));
    press(editor, 'Enter');
    expect(markdown(editor)).toBe('[[Alpha#^blk1]]');
  });

  it('suggests the current note headings after [[#', async () => {
    const editor = setup('# Mine\n\nbody ');
    await open(editor, '[[#');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['Mine']));
    press(editor, 'Enter');
    expect(markdown(editor)).toContain('[[#Mine]]');
  });

  it('shows nothing after a pipe', async () => {
    const editor = setup();
    await open(editor, '[[Alpha');
    typeInto(editor, '|');
    await vi.waitFor(() => expect(popup()).toBeNull());
    press(editor, 'Enter');
    expect(editor.state.doc.childCount).toBe(2);
  });

  it('![[ lists notes and vault files and inserts an embed atom', async () => {
    const editor = setup();
    await open(editor, '![[p');
    await vi.waitFor(() => expect(optionLabels()).toContain('pic.png'));
    expect(options().find((o) => o.textContent.includes('pic.png')).querySelector('svg')).not.toBeNull();
    typeInto(editor, 'ic');
    await vi.waitFor(() => expect(optionLabels()).toEqual(['pic.png']));
    press(editor, 'Enter');
    expect(markdown(editor)).toBe('![[pic.png]]');
  });

  it('![[ lists notes only when there is no file index', async () => {
    const editor = setup('', { files: [] });
    await open(editor, '![[');
    await vi.waitFor(() => expect(options()).toHaveLength(4));
    expect(optionLabels()).not.toContain('pic.png');
  });

  it('does not open inside inline code or a code block', async () => {
    const editor = setup('```\n\n```');
    editor.commands.setTextSelection(4);
    typeInto(editor, '[[');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();

    const inline = setup('`x`');
    inline.commands.setTextSelection(2);
    typeInto(inline, '[[');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
  });

  it('does not open inside an unclosed %% comment or math', async () => {
    const comment = setup('%% note ');
    await open(comment, '[[').then(() => { throw new Error('opened'); }, () => {});
    expect(popup()).toBeNull();
    const math = setup('$x + ');
    typeInto(math, '[[');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
    const price = setup('costs $5 and ');
    await open(price, '[[');
  });

  it('does not open in a read-only editor', async () => {
    const editor = setup();
    editor.setEditable(false);
    typeInto(editor, '[[');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
  });

  it('does not open while composing', async () => {
    const editor = setup();
    Object.defineProperty(editor.view, 'composing', { get: () => true, configurable: true });
    typeInto(editor, '[[');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
  });

  it('keeps live-typing conversion of a fully typed [[x]]', async () => {
    const editor = setup();
    typeInto(editor, '[[Beta]]');
    expect(markdown(editor)).toBe('[[Beta]]');
    const types = [];
    editor.state.doc.descendants((n) => { types.push(n.type.name); });
    expect(types).toContain('wikiLink');
    await new Promise((r) => setTimeout(r, 20));
    expect(popup()).toBeNull();
  });
});
