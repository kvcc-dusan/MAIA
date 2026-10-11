// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, roundTripPlain, makeEditor } from './testHelpers.js';

// Appends text to the end of the n-th top-level textblock, like typing there
const typeAtEnd = (md, text, nth = 0) => {
  const editor = makeEditor(md);
  const spots = [];
  editor.state.doc.descendants((node, pos) => { if (node.isTextblock) spots.push(pos + node.nodeSize - 1); });
  editor.view.dispatch(editor.state.tr.insertText(text, spots[nth]));
  const out = editor.storage.markdown.getMarkdown();
  editor.destroy();
  return out;
};

const UNTOUCHED = [
  '* a\n* b', '+ a\n+ b', '__bold__ and _it_', '***\n\ntext\n\n___', '1) a\n2) b', 'Title\n=====\n\nSub\n-----',
  '- [ ] a\n- [x] b', '[t](https://e.com "T")', 'see https://example.com/a ok', '| a | b |\n|---|---|\n| 1 | 2 |',
  'a  \nb', '\\_x\\_ and \\*y\\*', '- a\n    - b', '~~~\ncode\n~~~', 'a\n\n\n\nb', 'a  \n\nb', 'text\n', 'text\n\n\n', '\n\ntext',
  '# H\ntext', '- a\n---', 'x\n3. not a list', '* a\n- b', 'costs $5 and $10', '- a\n\n- b\n- c', '1. a\n\n   para\n2. b',
];

describe('untouched notes come back byte for byte', () => {
  it.each(UNTOUCHED)('%j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps CRLF line endings', () => {
    expect(roundTrip('# T\r\n\r\n* a\r\n* b\r\n')).toBe('# T\r\n\r\n* a\r\n* b\r\n');
  });

  it('is idempotent', () => {
    UNTOUCHED.forEach((md) => expect(roundTrip(roundTrip(md))).toBe(roundTrip(md)));
  });
});

describe('an edit only reformats what was edited', () => {
  it('leaves the other blocks, their blank lines and the final newline alone', () => {
    const md = '# T\n\n* a\n* b\n\n\n__bold__ text\n\n***\n';
    expect(typeAtEnd(md, 'x', 3)).toBe('# T\n\n* a\n* b\n\n\n__bold__ textx\n\n***\n');
  });

  it('leaves sibling list items alone and keeps the bullet', () => {
    const md = '* a\n* b\n  * c\n* d\n';
    expect(typeAtEnd(md, 'x', 0)).toBe('* ax\n* b\n  * c\n* d\n');
    expect(typeAtEnd(md, 'x', 2)).toBe('* a\n* b\n  * cx\n* d\n');
  });

  it('keeps ordered delimiter, rule and fence style of an edited block', () => {
    expect(typeAtEnd('1) a\n2) b', 'x', 0)).toBe('1) ax\n2) b');
    expect(typeAtEnd('~~~\ncode\n~~~', 'x', 0)).toBe('~~~\ncodex\n~~~');
  });

  it('keeps _ emphasis, two-space hard breaks and bare URLs inside an edited paragraph', () => {
    expect(typeAtEnd('_it_ and __b__', ' z')).toBe('_it_ and __b z__');
    expect(typeAtEnd('a  \nb', 'x')).toBe('a  \nbx');
    expect(typeAtEnd('see https://example.com/a ok', 'x')).toBe('see https://example.com/a okx');
  });

  it('falls back to * when the underscore would touch a word', () => {
    expect(typeAtEnd('_it_ z', 'y')).toBe('_it_ zy');
    expect(typeAtEnd('_it_', 'y')).toBe('_ity_');
  });

  it('does not escape a lone tilde or a dash that starts a word', () => {
    expect(roundTripPlain('~480 kcal\n-x')).toBe('~480 kcal\n-x');
    expect(roundTripPlain('\\- x')).toBe('\\- x');
  });
});

describe('the safety net still sees what the editor can represent', () => {
  it('plain mode ignores the original text', () => {
    expect(roundTripPlain('* a\n* b\n')).toBe('* a\n* b');
  });
});
