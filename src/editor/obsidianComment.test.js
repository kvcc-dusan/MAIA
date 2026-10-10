// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor } from './testHelpers.js';
import { parseContentMeta } from '../lib/parseContentMeta.js';

const LOSSLESS = [
  'a %%hidden%% b',
  'a %% see [[X]] and *y* %% b',
  'a\n\n%%\nhidden\nmulti\n%%\n\nb',
  '%%\n- a\n- b\n%%',
  '%% starts here\nand ends here %%\n\nafter',
  '%%\nwith a blank line\n\nstill inside\n%%',
  '- item\n\n  %%\n  nested\n  %%',
  '> %%\n> quoted\n> %%',
  '50%% off and 100%',
];

describe('obsidian comments', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps wikilinks inside a comment as text, not links', () => {
    expect(nodeTypes('a %% see [[X]] %% b').has('wikiLink')).toBe(false);
    expect(nodeTypes('%%\n[[X]]\n%%').has('wikiLink')).toBe(false);
  });

  it('uses an inline atom in a paragraph and a block atom for multi-line comments', () => {
    expect(nodeTypes('a %%x%% b').has('commentInline')).toBe(true);
    expect(nodeTypes('%%\nx\n%%').has('commentBlock')).toBe(true);
  });

  it('keeps tags and links in comments out of the note metadata', () => {
    const editor = makeEditor('real [[Kept]] #kept\n\n%%\n[[Hidden]] #hidden\n%%\n\nx %% [[Gone]] %% y');
    const meta = parseContentMeta(editor.getText());
    expect(meta.links).toEqual(['Kept']);
    expect(meta.tags).toEqual(['kept']);
    editor.destroy();
  });

  it('leaves an unclosed %% as text', () => {
    const md = 'a %% never closed';
    expect(nodeTypes(md).has('commentInline')).toBe(false);
    expect(roundTrip(md)).toBe(md);
  });
});
