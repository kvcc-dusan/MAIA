// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor, typeInto } from './testHelpers.js';

const LOSSLESS = [
  '[ref]: https://example.com\n\n[text][ref]',
  'See [the docs][docs] and [other][Other Ref].\n\n[docs]: https://example.com/docs\n[other ref]: https://example.com/other "Title"',
  '[Collapsed][] link.\n\n[collapsed]: https://example.com',
  'A [shortcut] link.\n\n[shortcut]: <https://example.com/a b>',
  '![alt][img]\n\n[img]: https://example.com/a.png',
  '- item [a][r]\n\n[r]: https://example.com',
  'Plain [inline](https://example.com) next to [ref][r].\n\n[r]: https://example.com',
  '[a]: https://example.com\n[b]: https://example.com/b\n\ntext [x][a]',
  'Footnote[^1] stays.\n\n[^1]: The note.\n\n[r]: https://example.com',
];

describe('reference links', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('does not turn the link into an inline link or drop the definition', () => {
    const out = roundTrip('[ref]: https://example.com\n\n[text][ref]');
    expect(out).not.toContain('](');
    expect(out).toContain('[ref]: https://example.com');
  });

  it('keeps definitions and links as atoms', () => {
    const types = nodeTypes('[t][r]\n\n[r]: https://example.com');
    expect(types.has('refLink')).toBe(true);
    expect(types.has('refDefinition')).toBe(true);
  });

  it('leaves brackets alone when there is no definition for them', () => {
    expect(nodeTypes('[text][missing]').has('refLink')).toBe(false);
    expect(nodeTypes('array[0] and [x]').has('refLink')).toBe(false);
  });

  it('keeps consecutive definitions in one block', () => {
    const editor = makeEditor('[a]: https://a.com\n[b]: https://b.com');
    expect(editor.state.doc.childCount).toBe(1);
    editor.destroy();
  });

  it('does not touch footnote definitions', () => {
    expect(nodeTypes('x[^1]\n\n[^1]: note').has('refDefinition')).toBe(false);
  });

  it('typing text next to a reference link keeps it', () => {
    const editor = makeEditor('[t][r]\n\n[r]: https://example.com');
    editor.commands.focus('end');
    typeInto(editor, ' more');
    expect(editor.storage.markdown.getMarkdown()).toContain('[t][r]');
    editor.destroy();
  });
});
