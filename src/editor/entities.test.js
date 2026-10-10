// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor, typeInto } from './testHelpers.js';

const LOSSLESS = [
  '&copy; and &amp;',
  'A &amp; B &lt; C &gt; D',
  '&nbsp;&nbsp;indent',
  'Price &#8364;5 and &#x20AC;6',
  '- list &amp; item',
  '# Heading &amp; more',
  '**bold &amp;** and *it &copy;*',
  '| a | b |\n| --- | --- |\n| &amp; | &copy; |',
  '> [!note] &amp; title\n> body &copy;',
  'AT&T and A & B stay as they are',
  'unknown &notanentity; stays',
];

describe('html entities', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('shows the character an entity stands for', () => {
    const editor = makeEditor('&copy; &amp;');
    const shown = [...editor.view.dom.querySelectorAll('.maia-entity')].map((el) => el.textContent);
    expect(shown).toEqual(['©', '&']);
    expect(editor.getText()).toContain('©');
    editor.destroy();
  });

  it('only real entities become atoms', () => {
    expect(nodeTypes('&copy;').has('htmlEntity')).toBe(true);
    expect(nodeTypes('&notanentity;').has('htmlEntity')).toBe(false);
  });

  it('typing an entity keeps it as typed', () => {
    const editor = makeEditor('');
    editor.commands.focus();
    typeInto(editor, 'a &amp; b &copy;');
    expect(editor.storage.markdown.getMarkdown()).toBe('a &amp; b &copy;');
    editor.destroy();
  });
});
