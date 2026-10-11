// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, roundTripPlain, nodeTypes, makeEditor, typeInto } from './testHelpers.js';
import { calloutKind, defaultCalloutTitle, CALLOUT_KINDS } from './calloutTypes.js';

const LOSSLESS = [
  '> [!note] Title\n> body',
  '> [!tip]- Folded\n> body',
  '> [!tip]+ Open\n> body',
  '> [!warning]\n> body',
  '> [!note]',
  '> [!info] T\n> - a\n> - b',
  '> [!info] T\n> > [!tip] inner\n> > b',
  '> [!note] T\n> first paragraph\n>\n> second paragraph',
  '> [!note] T\n> line one\n> line two',
  '> [!example] Code\n> ```js\n> x()\n> ```',
  '> [!note] **Bold** and [[Link]] title\n> body with `code`',
  '> [!NOTE] Upper case type\n> body',
  '> [!my-custom] Unknown type\n> body',
  '> [!note] T\n> body\n\nafter',
  '# T\n\n> [!note] x\n> y\n\ntext',
  '- a\n  > [!note] x\n  > y',
  '> [!note] A\n> a\n\n> [!tip] B\n> b',
  '> [!note] T\n> 1. one\n> 2. two',
  '> [!note] T\n> - [ ] task\n> - [/] partial',
  '> [!quote] Someone\n> > plain nested quote',
  '> [!note] T\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |',
];

describe('callouts', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it.each([...CALLOUT_KINDS, 'summary', 'tldr', 'hint', 'important', 'check', 'done', 'help', 'faq', 'caution',
    'attention', 'fail', 'missing', 'error', 'cite'])('round-trips the type %s', (type) => {
    const md = `> [!${type}] T\n> b`;
    expect(roundTrip(md)).toBe(md);
    expect(nodeTypes(md).has('callout')).toBe(true);
  });

  it('maps all 13 types and their aliases onto a canonical kind', () => {
    expect(CALLOUT_KINDS).toHaveLength(13);
    const expected = {
      summary: 'abstract', tldr: 'abstract', hint: 'tip', important: 'tip', check: 'success', done: 'success',
      help: 'question', faq: 'question', caution: 'warning', attention: 'warning', fail: 'failure', missing: 'failure',
      error: 'danger', cite: 'quote', NOTE: 'note', Warning: 'warning',
    };
    Object.entries(expected).forEach(([alias, kind]) => expect(calloutKind(alias)).toBe(kind));
  });

  it('styles an unknown type as a note and keeps its own text', () => {
    expect(calloutKind('my-custom')).toBe('note');
    const editor = makeEditor('> [!my-custom] T\n> b');
    const dom = editor.view.dom.querySelector('.maia-callout');
    expect(dom.dataset.calloutKind).toBe('note');
    expect(dom.dataset.callout).toBe('my-custom');
    editor.destroy();
  });

  it('shows the capitalized type when there is no title', () => {
    expect(defaultCalloutTitle('warning')).toBe('Warning');
    const editor = makeEditor('> [!warning]\n> body');
    const dom = editor.view.dom.querySelector('.maia-callout');
    expect(dom.style.getPropertyValue('--callout-default-title')).toBe('"Warning"');
    expect(editor.state.doc.firstChild.firstChild.content.size).toBe(0);
    editor.destroy();
  });

  it('a normal blockquote stays a blockquote', () => {
    expect(nodeTypes('> just a quote').has('callout')).toBe(false);
    expect(roundTrip('> just a quote')).toBe('> just a quote');
    expect(roundTripPlain('> [not a callout] x')).toBe('> \\[not a callout\\] x');
  });

  it('starts folded callouts collapsed and toggles them without touching the document', () => {
    const editor = makeEditor('> [!tip]- Folded\n> body\n\n> [!tip]+ Open\n> body\n\n> [!tip] Plain\n> body');
    const callouts = [...editor.view.dom.querySelectorAll('.maia-callout')];
    expect(callouts.map((c) => c.dataset.collapsed)).toEqual(['true', 'false', 'false']);
    expect(callouts.map((c) => !!c.querySelector('.maia-callout-fold'))).toEqual([true, true, false]);
    const before = editor.state.doc;
    callouts[0].querySelector('.maia-callout-fold').click();
    expect(callouts[0].dataset.collapsed).toBe('false');
    expect(callouts[0].querySelector('.maia-callout-fold').getAttribute('aria-expanded')).toBe('true');
    expect(editor.state.doc).toBe(before);
    expect(editor.storage.markdown.getMarkdown()).toContain('> [!tip]- Folded');
    editor.destroy();
  });

  it('opens a folded callout when the cursor moves into its body', () => {
    const editor = makeEditor('> [!tip]- Folded\n> body');
    const dom = editor.view.dom.querySelector('.maia-callout');
    expect(dom.dataset.collapsed).toBe('true');
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    expect(dom.dataset.collapsed).toBe('false');
    editor.destroy();
  });

  it('lets the title be edited with marks and writes it back', () => {
    const editor = makeEditor('> [!note] Old\n> body');
    editor.commands.setTextSelection(2);
    editor.commands.insertContent('New ');
    expect(editor.storage.markdown.getMarkdown()).toBe('> [!note] New Old\n> body');
    editor.destroy();
  });

  it('Enter in the title moves into the body', () => {
    const editor = makeEditor('> [!note] Title\n> body');
    editor.commands.setTextSelection(4);
    const handled = editor.view.someProp('handleKeyDown', (f) => f(editor.view, new KeyboardEvent('keydown', { key: 'Enter' })));
    expect(handled).toBe(true);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    editor.destroy();
  });

  it('Backspace in an empty title turns the callout back into a quote', () => {
    const editor = makeEditor('> [!note]\n> body');
    editor.commands.setTextSelection(2);
    const handled = editor.view.someProp('handleKeyDown', (f) => f(editor.view, new KeyboardEvent('keydown', { key: 'Backspace' })));
    expect(handled).toBe(true);
    expect(editor.storage.markdown.getMarkdown()).toBe('> body');
    editor.destroy();
  });

  describe('live typing', () => {
    const typed = (text) => {
      const editor = makeEditor('');
      editor.commands.focus();
      typeInto(editor, text);
      return editor;
    };

    it('typing "> [!note] " turns the quote into a callout with the cursor in the title', () => {
      const editor = typed('> [!note] ');
      expect(editor.state.doc.firstChild.type.name).toBe('callout');
      expect(editor.state.selection.$from.parent.type.name).toBe('calloutTitle');
      expect(editor.storage.markdown.getMarkdown()).toBe('> [!note]');
      editor.destroy();
    });

    it('keeps typing into the title, with fold marks', () => {
      const editor = typed('> [!tip]- My title');
      expect(editor.storage.markdown.getMarkdown()).toBe('> [!tip]- My title');
      editor.destroy();
    });

    it('does not trigger in a plain paragraph or a later quote paragraph', () => {
      expect(typed('[!note] ').state.doc.firstChild.type.name).toBe('paragraph');
    });

    it('undo brings the quote back', () => {
      const editor = typed('> [!note] ');
      editor.commands.undo();
      expect(nodeTypes(editor.storage.markdown.getMarkdown()).has('callout')).toBe(false);
      editor.destroy();
    });
  });
});
