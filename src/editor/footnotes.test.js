// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor, typeInto } from './testHelpers.js';

const LOSSLESS = [
  'Text[^1] here.\n\n[^1]: The note.',
  'Text[^note] here.\n\n[^note]: Named.',
  'Text^[inline note] here.',
  'Text^[inline with [brackets] inside] here.',
  'A[^1] and B[^2].\n\n[^1]: First.\n[^2]: Second.',
  'Text[^1].\n\n[^1]: First line.\n    Second line, indented.\n\n    A second paragraph.\n\nAfter.',
  '- item[^1]\n\n[^1]: in a list',
  'wow![^1]\n\n[^1]: x',
];

describe('footnotes', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('no longer turns a named footnote into a link or escapes the brackets', () => {
    const out = roundTrip('Text[^note] here.\n\n[^note]: Named.');
    expect(out).not.toContain('](');
    expect(out).not.toContain('\\[');
  });

  it('parses refs, definitions and inline footnotes as atoms', () => {
    const types = nodeTypes('A[^1] and B^[inline]\n\n[^1]: def');
    expect(types.has('footnoteRef')).toBe(true);
    expect(types.has('inlineFootnote')).toBe(true);
    expect(types.has('footnoteDefinition')).toBe(true);
  });

  it('keeps a definition together with its indented continuation only', () => {
    const editor = makeEditor('[^1]: one\n    two\n\nplain paragraph');
    const names = [];
    editor.state.doc.forEach((node) => names.push(node.type.name));
    expect(names).toEqual(['footnoteDefinition', 'paragraph']);
    editor.destroy();
  });

  it('turns a typed [^1] into a footnote', () => {
    const editor = makeEditor('');
    editor.commands.focus();
    typeInto(editor, 'a[^1] ');
    expect(editor.storage.markdown.getMarkdown()).toBe('a[^1] ');
    editor.destroy();
  });
});
