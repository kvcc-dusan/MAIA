import { describe, it, expect } from 'vitest';
import {
  parseQuery, scoreMatch, noteAliases, shortestTarget, resolveNote, extractHeadings, extractBlocks, buildItems, emptyLabel,
} from './linkSuggestModel.js';

const note = (title, extra = {}) => ({ id: title, title, folder: '', content: '', ...extra });

const NOTES = [
  note('Alpha', { updatedAt: '2026-01-01T00:00:00Z' }),
  note('Alphabet soup', { updatedAt: '2026-03-01T00:00:00Z' }),
  note('Beta', { updatedAt: '2026-02-01T00:00:00Z', folder: 'Projects' }),
  note('Meeting', { updatedAt: '2026-01-05T00:00:00Z', folder: 'Work' }),
  note('Meeting', { id: 'm2', updatedAt: '2026-01-06T00:00:00Z', folder: 'Home' }),
  note('Gamma', { updatedAt: '2026-04-01T00:00:00Z', frontmatterExtra: { aliases: 'aliases: [Third, "G letter"]' } }),
];
const labels = (items) => items.map((i) => i.label);

describe('parseQuery', () => {
  it('reads the opener and the note text', () => {
    expect(parseQuery('[[Note')).toEqual({ isEmbed: false, stage: 'note', noteText: 'Note', subText: '' });
    expect(parseQuery('![[img')).toEqual({ isEmbed: true, stage: 'note', noteText: 'img', subText: '' });
  });
  it('does not take a note starting with ! for an embed', () => {
    expect(parseQuery('[[!x').isEmbed).toBe(false);
  });
  it('switches to heading, block and alias stages', () => {
    expect(parseQuery('[[Note#Intro')).toMatchObject({ stage: 'heading', noteText: 'Note', subText: 'Intro' });
    expect(parseQuery('[[Note#Parent#Child')).toMatchObject({ stage: 'heading', subText: 'Child' });
    expect(parseQuery('[[Note#^ab')).toMatchObject({ stage: 'block', noteText: 'Note', subText: 'ab' });
    expect(parseQuery('[[#Intro')).toMatchObject({ stage: 'heading', noteText: '', subText: 'Intro' });
    expect(parseQuery('[[Note|al')).toMatchObject({ stage: 'alias' });
    expect(parseQuery('[[Note#H|al')).toMatchObject({ stage: 'alias' });
  });
  it('words the empty state per stage', () => {
    expect(emptyLabel(parseQuery('[[x'))).toBe('No matching note');
    expect(emptyLabel(parseQuery('![[x'))).toBe('No matching note or file');
    expect(emptyLabel(parseQuery('[[x#y'))).toBe('No matching heading');
    expect(emptyLabel(parseQuery('[[x#^y'))).toBe('No matching block');
  });
});

describe('scoreMatch', () => {
  it('orders exact, prefix, word prefix, substring, loose', () => {
    expect(scoreMatch('alpha', 'Alpha')).toBe(0);
    expect(scoreMatch('alp', 'Alpha')).toBe(1);
    expect(scoreMatch('soup', 'Alphabet soup')).toBe(2);
    expect(scoreMatch('pha', 'Alpha')).toBe(3);
    expect(scoreMatch('apa', 'Alpha')).toBe(4);
    expect(scoreMatch('zz', 'Alpha')).toBeNull();
  });
  it('never fuzzy-matches a single letter', () => {
    expect(scoreMatch('z', 'a b c')).toBeNull();
  });
});

describe('noteAliases', () => {
  it('reads arrays, inline YAML, block YAML and scalars', () => {
    expect(noteAliases({ aliases: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(noteAliases({ frontmatterExtra: { aliases: 'aliases: [One, "Two words"]' } })).toEqual(['One', 'Two words']);
    expect(noteAliases({ frontmatterExtra: { aliases: 'aliases:\n  - One\n  - Two' } })).toEqual(['One', 'Two']);
    expect(noteAliases({ frontmatterExtra: { alias: 'alias: Solo' } })).toEqual(['Solo']);
    expect(noteAliases({})).toEqual([]);
  });
});

describe('shortestTarget', () => {
  const paths = ['Alpha', 'Projects/Beta', 'Work/Meeting', 'Home/Meeting', 'Meeting', 'a/x/Deep', 'b/x/Deep'];
  it('uses the title when it is unique', () => {
    expect(shortestTarget('Projects/Beta', paths)).toBe('Beta');
    expect(shortestTarget('Alpha', paths)).toBe('Alpha');
  });
  it('uses folder/Title when the title exists in more than one folder', () => {
    expect(shortestTarget('Work/Meeting', paths)).toBe('Work/Meeting');
    expect(shortestTarget('Home/Meeting', paths)).toBe('Home/Meeting');
  });
  it('lets the vault-root note keep the bare title, as links resolve to the shallowest', () => {
    expect(shortestTarget('Meeting', paths)).toBe('Meeting');
  });
  it('adds as many folders as it takes', () => {
    expect(shortestTarget('a/x/Deep', paths)).toBe('a/x/Deep');
  });
});

describe('resolveNote', () => {
  it('finds by title, path or path tail, shallowest first', () => {
    expect(resolveNote(NOTES, 'beta').folder).toBe('Projects');
    expect(resolveNote(NOTES, 'Work/Meeting.md').folder).toBe('Work');
    expect(resolveNote(NOTES, 'nope')).toBeNull();
  });
});

describe('extractors', () => {
  const body = '# One\ntext\n```\n# not a heading\n```\n## Two [[x]] ##\n- item here ^abc-1\nplain ^zz9\n';
  it('finds headings outside fences and cleans link characters', () => {
    expect(extractHeadings(body)).toEqual([{ level: 1, text: 'One' }, { level: 2, text: 'Two x' }]);
  });
  it('finds block ids with their text', () => {
    expect(extractBlocks(body)).toEqual([{ id: 'abc-1', text: 'item here' }, { id: 'zz9', text: 'plain' }]);
  });
});

describe('buildItems: notes', () => {
  it('lists recent notes first for an empty query', () => {
    expect(labels(buildItems('[[', { notes: NOTES }))).toEqual(['Gamma', 'Alphabet soup', 'Beta', 'Meeting', 'Meeting', 'Alpha']);
  });
  it('ranks exact and prefix matches before recency', () => {
    expect(labels(buildItems('[[alpha', { notes: NOTES }))).toEqual(['Alpha', 'Alphabet soup']);
  });
  it('matches substrings and aliases', () => {
    expect(labels(buildItems('[[eta', { notes: NOTES }))).toEqual(['Beta']);
    const [hit] = buildItems('[[third', { notes: NOTES });
    expect(hit).toMatchObject({ label: 'Gamma', detail: 'Alias: Third', raw: '[[Gamma|Third]]' });
  });
  it('inserts the shortest unambiguous target', () => {
    const items = buildItems('[[', { notes: NOTES });
    expect(items.find((i) => i.label === 'Beta').raw).toBe('[[Beta]]');
    expect(items.filter((i) => i.label === 'Meeting').map((i) => i.raw).sort()).toEqual(['[[Home/Meeting]]', '[[Work/Meeting]]']);
  });
  it('shows the folder muted when there is one', () => {
    const items = buildItems('[[', { notes: NOTES });
    expect(items.find((i) => i.label === 'Beta').detail).toBe('Projects');
    expect(items.find((i) => i.label === 'Alpha').detail).toBe('');
  });
  it('matches a typed folder path', () => {
    expect(labels(buildItems('[[work/mee', { notes: NOTES }))).toEqual(['Meeting']);
  });
  it('returns nothing for an unknown query', () => {
    expect(buildItems('[[qqqq', { notes: NOTES })).toEqual([]);
  });
  it('returns nothing after a pipe', () => {
    expect(buildItems('[[Alpha|', { notes: NOTES })).toEqual([]);
  });
  it('caps the list', () => {
    const many = Array.from({ length: 80 }, (_, i) => note(`n${i}`));
    expect(buildItems('[[', { notes: many })).toHaveLength(50);
  });
});

describe('buildItems: headings and blocks', () => {
  const notes = [note('Doc', { content: '# Intro\n## Setup steps\ntext ^blk1\n' }), note('Other')];
  it('lists the headings of the named note', () => {
    const items = buildItems('[[Doc#', { notes });
    expect(items.map((i) => i.raw)).toEqual(['[[Doc#Intro]]', '[[Doc#Setup steps]]']);
    expect(items[1].detail).toBe('H2');
  });
  it('filters headings', () => {
    expect(labels(buildItems('[[Doc#step', { notes }))).toEqual(['Setup steps']);
  });
  it('lists block ids after #^', () => {
    expect(buildItems('[[Doc#^', { notes }).map((i) => i.raw)).toEqual(['[[Doc#^blk1]]']);
  });
  it('lists headings of the current note for [[#', () => {
    const items = buildItems('[[#', { notes, currentContent: '# Mine\n' });
    expect(items.map((i) => i.raw)).toEqual(['[[#Mine]]']);
  });
  it('keeps the embed marker and finds nothing for an unknown note', () => {
    expect(buildItems('![[Doc#Intro', { notes })[0].raw).toBe('![[Doc#Intro]]');
    expect(buildItems('[[Missing#', { notes })).toEqual([]);
  });
});

describe('buildItems: embeds', () => {
  const files = ['img/pic.png', 'docs/spec.pdf', 'clip.mp4', 'song.mp3', 'data.csv', 'a/same.png', 'b/same.png'];
  it('adds images, pdfs, audio and video, not other files', () => {
    const items = buildItems('![[', { notes: [], files });
    expect(labels(items)).toContain('pic.png');
    expect(labels(items)).not.toContain('data.csv');
    expect(items.find((i) => i.label === 'spec.pdf')).toMatchObject({ kind: 'file', fileKind: 'pdf', raw: '![[spec.pdf]]' });
  });
  it('writes the path form when a file name repeats', () => {
    const raws = buildItems('![[same', { notes: [], files }).map((i) => i.raw).sort();
    expect(raws).toEqual(['![[a/same.png]]', '![[b/same.png]]']);
  });
  it('mixes notes and files, and never offers files for [[', () => {
    const notes = [note('pic notes')];
    expect(labels(buildItems('![[pic', { notes, files }))).toEqual(['pic notes', 'pic.png']);
    expect(labels(buildItems('[[pic', { notes, files }))).toEqual(['pic notes']);
  });
  it('does not put an alias on an embed', () => {
    const items = buildItems('![[third', { notes: NOTES });
    expect(items[0].raw).toBe('![[Gamma]]');
  });
});
