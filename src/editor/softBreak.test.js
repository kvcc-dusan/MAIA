// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes } from './testHelpers.js';
import { parseContentMeta } from '../lib/parseContentMeta.js';
import { makeEditor } from './testHelpers.js';

const LOSSLESS = [
  'line one\nline two',
  'one\ntwo\nthree',
  '- item one\n  continues here\n- item two',
  '> quoted\n> across lines',
  '**bold\nacross** a break',
  'line one\\\nline two',
];

describe('softBreak', () => {
  it.each(LOSSLESS)('keeps the newline: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('no longer joins lines with a space', () => {
    expect(roundTrip('line one\nline two')).not.toBe('line one line two');
    expect(nodeTypes('a\nb').has('softBreak')).toBe(true);
  });

  it('keeps a hard break as a hard break', () => {
    expect(nodeTypes('a\\\nb').has('hardBreak')).toBe(true);
    expect(nodeTypes('a\\\nb').has('softBreak')).toBe(false);
  });

  it('turns CRLF files into LF without joining lines', () => {
    expect(roundTrip('# T\r\n\r\ntext\r\nmore\r\n')).toBe('# T\n\ntext\nmore');
  });

  it('reads as a newline in getText', () => {
    const editor = makeEditor('a\nb');
    expect(editor.getText()).toBe('a\nb');
    expect(parseContentMeta(editor.getText()).tags).toEqual([]);
    editor.destroy();
  });
});
