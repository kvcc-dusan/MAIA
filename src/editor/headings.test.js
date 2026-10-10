// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, makeEditor, typeInto } from './testHelpers.js';

describe('headings 1 to 6', () => {
  it.each([1, 2, 3, 4, 5, 6])('keeps the hashes of a level %i heading', (level) => {
    const md = `${'#'.repeat(level)} Heading ${level}`;
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps all six in one note', () => {
    const md = '# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F';
    expect(roundTrip(md)).toBe(md);
  });

  it('turns typed ##### into a level 5 heading', () => {
    const editor = makeEditor('');
    editor.commands.focus();
    typeInto(editor, '##### x');
    expect(editor.storage.markdown.getMarkdown()).toBe('##### x');
    editor.destroy();
  });
});

describe('plain text', () => {
  it('does not entity-escape angle brackets or ampersands', () => {
    const md = 'if a < b && c > d then a & b';
    expect(roundTrip(md)).toBe(md);
  });

  it('still escapes markdown syntax that is only text', () => {
    expect(roundTrip('2 * 3 * 4')).toBe('2 \\* 3 \\* 4');
  });

  it('keeps an escaped dollar pair from becoming math', () => {
    expect(roundTrip('\\$a\\$ and $5 and $10')).toBe('\\$a\\$ and $5 and $10');
  });
});
