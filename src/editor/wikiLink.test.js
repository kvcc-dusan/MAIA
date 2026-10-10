// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { makeEditor, roundTrip, nodeTypes, typeInto } from './testHelpers.js';
import { parseWikiLink, wikiLinkLabel } from './wikiLink.js';
import { parseContentMeta } from '../lib/parseContentMeta.js';

// Inputs from the parity audit (scripts/obsidian-parity.test.js)
const LOSSLESS = [
  'see [[Note]] ok',
  'see [[Note|alias]] ok',
  'see [[Note#Heading]] ok',
  'see [[Note#^abc123]] ok',
  'see [[#Heading]] ok',
  'see [[my_note_name]] and [[a_b|c_d]] ok',
  '- [[Note]]\n- [[Other|x]]',
  '![[Note]]',
  '![[image.png]]',
  '![[image.png|300]]',
  '![[file.pdf#page=3]]',
  '![[Note#Heading]]',
  '[[A]] and [[B|b]] and [[C#d]]',
  '[[a*b]]',
  'see [[Note|alias]] and [[Note#Heading]] ok',
  '> quote with [[Note]]\n\n**bold [[Note]]** and *[[Other]]*',
];

describe('wikiLink', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('is a node, not escaped text', () => {
    expect(nodeTypes('see [[Note]] ok').has('wikiLink')).toBe(true);
    expect(roundTrip('see [[Note]]')).not.toContain('\\[');
  });

  it('leaves wikilinks in code alone', () => {
    const md = '`[[not a link]]`\n\n```md\n[[not link]]\n```';
    expect(nodeTypes(md).has('wikiLink')).toBe(false);
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps getText readable so tag and link extraction still sees the brackets', () => {
    const editor = makeEditor('see [[Note|alias]] and ![[img.png|300]] #tag');
    const meta = parseContentMeta(editor.getText());
    expect(meta.links).toEqual(['Note', 'img.png']);
    expect(meta.tags).toEqual(['tag']);
    editor.destroy();
  });

  it('parses target, heading and alias', () => {
    expect(parseWikiLink('[[Note#Heading|alias]]')).toEqual({ isEmbed: false, target: 'Note', subpath: 'Heading', alias: 'alias' });
    expect(parseWikiLink('![[img.png|300]]')).toEqual({ isEmbed: true, target: 'img.png', subpath: '', alias: '300' });
    expect(parseWikiLink('[[#H]]').target).toBe('');
  });

  it('labels links by alias, else target and heading; embeds by file name', () => {
    expect(wikiLinkLabel('[[Note|alias]]')).toBe('alias');
    expect(wikiLinkLabel('[[Note#Heading]]')).toBe('Note > Heading');
    expect(wikiLinkLabel('[[#Heading]]')).toBe('Heading');
    expect(wikiLinkLabel('![[img.png|300]]')).toBe('img.png');
  });

  it('opens the note by its target on click, not the alias or heading', () => {
    const onOpenLink = vi.fn();
    const editor = makeEditor('[[Note#Heading|alias]]', { onOpenLink });
    const node = editor.state.doc.firstChild.firstChild;
    const handled = editor.view.someProp('handleClickOn', (f) => f(editor.view, 1, node, 1, {}, true));
    expect(handled).toBe(true);
    expect(onOpenLink).toHaveBeenCalledWith('Note');
    editor.destroy();
  });

  it('does not open image embeds or heading-only links', () => {
    const onOpenLink = vi.fn();
    const editor = makeEditor('![[img.png]] [[#H]]', { onOpenLink });
    editor.state.doc.firstChild.forEach((node, offset) => {
      editor.view.someProp('handleClickOn', (f) => f(editor.view, offset + 1, node, offset + 1, {}, true));
    });
    expect(onOpenLink).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('opens an embedded note', () => {
    const onOpenLink = vi.fn();
    const editor = makeEditor('![[Other note]]', { onOpenLink });
    const node = editor.state.doc.firstChild.firstChild;
    editor.view.someProp('handleClickOn', (f) => f(editor.view, 1, node, 1, {}, true));
    expect(onOpenLink).toHaveBeenCalledWith('Other note');
    editor.destroy();
  });

  it('turns a typed [[link]] into a node and saves it as typed', () => {
    const editor = makeEditor('');
    editor.commands.focus();
    typeInto(editor, 'see [[Note|a]] ');
    expect(editor.storage.markdown.getMarkdown()).toBe('see [[Note|a]] ');
    expect(nodeTypes(editor.storage.markdown.getMarkdown()).has('wikiLink')).toBe(true);
    editor.destroy();
  });
});
