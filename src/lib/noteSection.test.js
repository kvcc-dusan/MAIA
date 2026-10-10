import { describe, it, expect } from 'vitest';
import { extractSection } from './noteSection.js';

const NOTE = [
  '# Title', 'intro', '', '## Alpha', 'a1', '### Deep', 'd1', '', '## Beta', 'b1', '',
  '```', '## not a heading', '```', '', 'A paragraph', 'with two lines ^par1', '', '- item one ^li1', '- item two',
].join('\n');

describe('extractSection', () => {
  it('returns everything without a subpath', () => {
    expect(extractSection(NOTE, '')).toBe(NOTE);
  });

  it('cuts a heading up to the next heading of the same or higher level', () => {
    expect(extractSection(NOTE, 'Alpha')).toBe('## Alpha\na1\n### Deep\nd1');
    expect(extractSection(NOTE, 'deep')).toBe('### Deep\nd1');
    expect(extractSection(NOTE, 'Alpha#Deep')).toBe('### Deep\nd1');
  });

  it('runs to the end for the last heading and ignores headings in fences', () => {
    expect(extractSection(NOTE, 'Beta')).toContain('## not a heading');
    expect(extractSection(NOTE, 'not a heading')).toBeNull();
  });

  it('cuts a block by id without the id, a paragraph or just the list item', () => {
    expect(extractSection(NOTE, '^par1')).toBe('A paragraph\nwith two lines');
    expect(extractSection(NOTE, '^li1')).toBe('- item one');
  });

  it('returns null when nothing matches', () => {
    expect(extractSection(NOTE, 'Missing')).toBeNull();
    expect(extractSection(NOTE, '^nope')).toBeNull();
  });
});
