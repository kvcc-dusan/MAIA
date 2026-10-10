// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  checkRoundTrip, roundTripSafe, findDangerousSyntax, contentFingerprint, DANGEROUS_PATTERNS,
} from './roundTripSafe.js';

// Rewrites the audit lists as harmless in Obsidian: the guard must let these through.
const SAFE = {
  'bullet marker': '* a\n* b',
  'plus bullet': '+ a\n+ b',
  'bold __': 'a __bold__ b',
  'italic _': 'a _it_ b',
  'hr ***': 'a\n\n***\n\nb',
  'ordered 1)': '1) a\n2) b',
  'ordered renumber': '1. a\n1. b\n1. c',
  'setext heading': 'Title\n=====\n\nSub\n-----',
  'closing hashes': '## H ##',
  'bare url': 'see https://example.com/a?b=1 ok',
  'link title': '[text](https://example.com "T")',
  'angle link path': '[t](<My Note.md>)',
  'blank lines between tasks': '- [ ] todo\n- [x] done',
  'nested tasks': '- [ ] a\n  - [x] b',
  'multiple blank lines': 'a\n\n\n\nb',
  'tilde fence': '~~~\nx\n~~~',
  'indented code': 'para\n\n    indented code\n',
  'tabs in list': '- a\n\t- b',
  'two-space hard break': 'line one  \nline two',
  'literal asterisks': '2 * 3 * 4',
  'literal brackets': 'array[0] and [x] and [ ]',
  'CRLF': '# T\r\n\r\n- a\r\n- b\r\n\r\ntext\r\nmore\r\n',
  'empty': '',
  'only whitespace': '\n\n',
  'code with table-like and callout-like text': '```md\n| a | b |\n| - | - |\n> [!note] x\n```',
  'inline code with callout syntax': 'use `> [!note]` for callouts',
};

// Everything that the audit lists as DANGEROUS and that stage 1 does not fix yet.
const UNSAFE = {
  'table': ['| a | b |\n| - | - |\n| 1 | 2 |', 'table'],
  'table with alignment': ['| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |', 'table'],
  'table without outer pipes': ['a | b\n- | -\n1 | 2', 'table'],
  'callout': ['> [!note] Title\n> body', 'callout'],
  'foldable callout': ['> [!tip]- Folded\n> body', 'callout'],
  'nested callout': ['> [!info] T\n> > [!tip] inner\n> > b', 'callout'],
  'callout in a list': ['- a\n  > [!note] x\n  > y', 'callout'],
  'custom task status': ['- [/] partial\n- [-] cancelled\n- [>] deferred', 'task-status'],
  'task in numbered list': ['1. [ ] a\n2. [x] b', 'ordered-task'],
  'reference link': ['[ref]: https://example.com\n\n[text][ref]', 'reference-links'],
  'html entity': ['&copy; and &amp;', 'content-changed'],
  'wikilink in an alias': ['[[Note|![[x.png]]]]', 'content-changed'],
};

describe('roundTripSafe', () => {
  it.each(Object.entries(SAFE))('lets a harmless rewrite through: %s', (_, md) => {
    const result = checkRoundTrip(md);
    expect(result.reasons).toEqual([]);
    expect(result.safe).toBe(true);
  });

  it.each(Object.entries(UNSAFE))('flags %s', (_, [md, reason]) => {
    const result = checkRoundTrip(md);
    expect(result.safe).toBe(false);
    expect(result.reasons.map((r) => r.id)).toContain(reason);
  });

  it.each([
    'see [[Note|alias]] and [[Note#Heading]] ok',
    '![[image.png|300]]',
    '![alt](https://example.com/a.png)',
    'press <kbd>Ctrl</kbd> now',
    '<div class="x">\n  <p>hello</p>\n</div>',
    '<!-- c -->\n\ntext',
    'Text[^1] here.\n\n[^1]: The note.',
    'Text^[inline note] here.',
    'a %% hidden %% b',
    '%%\nhidden\nmulti\n%%',
    '$\\frac{a}{b}$',
    '$$\n\\begin{aligned}\na &= b \\\\\n\\end{aligned}\n$$',
    'line one\nline two',
    '##### H5',
    '###### H6',
  ])('treats syntax the editor keeps intact as safe: %j', (md) => {
    expect(roundTripSafe(md)).toBe(true);
  });

  it('flags a note when only one construct in a long note is dangerous', () => {
    const md = '# Plan\n\nLots of **fine** text with [[links]].\n\n> [!warning] Careful\n> body\n\nMore text.';
    expect(roundTripSafe(md)).toBe(false);
  });

  it('explains what it found', () => {
    const { reasons } = checkRoundTrip('| a | b |\n| - | - |\n\n> [!note] x');
    expect(reasons.map((r) => r.label)).toEqual(expect.arrayContaining(['tables', 'callouts']));
  });

  it('memoizes per note id and content', () => {
    const md = 'memo test **x**';
    expect(checkRoundTrip(md, { id: 'a' })).toBe(checkRoundTrip(md, { id: 'a' }));
    expect(checkRoundTrip(md, { id: 'b' })).not.toBe(checkRoundTrip(md, { id: 'a' }));
    expect(checkRoundTrip(`${md}!`, { id: 'a' })).not.toBe(checkRoundTrip(md, { id: 'a' }));
  });

  it('tolerates non-string input', () => {
    expect(roundTripSafe(undefined)).toBe(true);
    expect(roundTripSafe(null)).toBe(true);
  });
});

describe('dangerous pattern list', () => {
  it('is data: every entry has an id, a label and a test', () => {
    DANGEROUS_PATTERNS.forEach((entry) => {
      expect(entry.id).toEqual(expect.any(String));
      expect(entry.label).toEqual(expect.any(String));
      expect(entry.test).toBeInstanceOf(RegExp);
    });
    expect(new Set(DANGEROUS_PATTERNS.map((e) => e.id)).size).toBe(DANGEROUS_PATTERNS.length);
  });

  it('ignores constructs inside code', () => {
    expect(findDangerousSyntax('```\n> [!note] x\n```')).toEqual([]);
    expect(findDangerousSyntax('~~~\n| a | b |\n| - | - |\n~~~')).toEqual([]);
    expect(findDangerousSyntax('`> [!note]`')).toEqual([]);
  });

  it('does not take a setext heading or a rule for a table', () => {
    expect(findDangerousSyntax('Title\n-----')).toEqual([]);
    expect(findDangerousSyntax('a\n\n---\n\nb')).toEqual([]);
  });

  it('keeps footnote definitions out of the reference-link rule', () => {
    expect(findDangerousSyntax('x[^1]\n\n[^1]: note')).toEqual([]);
  });
});

describe('contentFingerprint', () => {
  it('ignores spacing, markers and escapes but not text', () => {
    expect(contentFingerprint('* a  b\n\n\n* c')).toBe(contentFingerprint('- a b\n- c'));
    expect(contentFingerprint('array[0]')).toBe(contentFingerprint('array\\[0\\]'));
    expect(contentFingerprint('![a](u)')).not.toBe(contentFingerprint(''));
  });
});
