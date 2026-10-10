// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { makeEditor } from './testHelpers.js';
import { createExtensions } from './extensions.js';
import { createEmbedProvider, findNote } from './embedProvider.js';
import { parseEmbedSize } from './embeds.js';
import { buildFileIndex, resolveVaultFile } from '../lib/vaultFiles.js';

const FILES = buildFileIndex(['img/pic.png', 'Proj/pics/a.png', 'docs/spec.pdf', 'media/clip.mp4']);
const NOTES = [
  { title: 'Other', folder: '', content: '# Head\nbody text\n\n## Sub\nsub text ![[Other]]\n' },
  { title: 'Deep', folder: 'a/b', content: 'deep content' },
];

const setup = (markdown, { folder = '', findFile, openFile = vi.fn(), onOpenNote = vi.fn(), isDesktop = () => true } = {}) => {
  const embeds = createEmbedProvider({
    getNotes: () => NOTES,
    getFolder: () => folder,
    onOpenNote,
    createExtensions,
    isDesktop,
    getVault: () => '/vault',
    openFile,
    findFile: findFile ?? (async (_vault, target, from, options) => resolveVaultFile(FILES, target, from, options)),
    toAssetUrl: async (_vault, rel) => `asset://localhost/${rel}`,
  });
  return { editor: makeEditor(markdown, { embeds }), onOpenNote };
};
const dom = (editor) => editor.view.dom;
const until = (editor, selector) => vi.waitFor(() => expect(dom(editor).querySelector(selector)).not.toBeNull());

describe('image embeds', () => {
  it('loads ![[image.png|300]] through the asset url and keeps the markdown', async () => {
    const md = 'x ![[pic.png|300]] y';
    const { editor } = setup(md);
    await until(editor, '.maia-embed-host img');
    const img = dom(editor).querySelector('.maia-embed-host img');
    expect(img.getAttribute('src')).toBe('asset://localhost/img/pic.png');
    expect(img.getAttribute('width')).toBe('300');
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('applies |300x200 as width and height', async () => {
    const { editor } = setup('![[pic.png|300x200]]');
    await until(editor, '.maia-embed-host img');
    const img = dom(editor).querySelector('.maia-embed-host img');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['300', '200']);
    editor.destroy();
  });

  it('resolves markdown images relative to the note folder, with sizes in the alt', async () => {
    const md = '![alt|200x100](pics/a.png)';
    const { editor } = setup(md, { folder: 'Proj' });
    await until(editor, '.maia-image img');
    const img = dom(editor).querySelector('.maia-image img');
    expect(img.getAttribute('src')).toBe('asset://localhost/Proj/pics/a.png');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['200', '100']);
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('decodes %20 and leaves an unresolved markdown image as its chip', async () => {
    const findFile = vi.fn(async () => null);
    const { editor } = setup('![](My%20Pic.png)', { findFile });
    await vi.waitFor(() => expect(findFile).toHaveBeenCalledWith('/vault', 'My Pic.png', '', { preferRelative: true }));
    expect(dom(editor).querySelector('.maia-raw-image').textContent).toBe('My Pic.png');
    editor.destroy();
  });

  it('shows a muted chip with the target when the file is missing', async () => {
    const { editor } = setup('![[gone.png]]');
    await until(editor, '.maia-embed-missing');
    expect(dom(editor).querySelector('.maia-embed-missing').textContent).toBe('gone.png');
    editor.destroy();
  });

  it('falls back to the missing chip when the lookup throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { editor } = setup('![[pic.png]]', { findFile: async () => { throw new Error('disk'); } });
    await until(editor, '.maia-embed-missing');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    editor.destroy();
  });

  it('keeps the plain chip when there is no provider (web)', () => {
    const { editor } = setup('![[pic.png]]', { isDesktop: () => false });
    expect(dom(editor).querySelector('.maia-embed').textContent).toBe('pic.png');
    expect(dom(editor).querySelector('.maia-embed-host img')).toBeNull();
    editor.destroy();
  });
});

describe('file cards', () => {
  it('shows a card with the page for a pdf', async () => {
    const md = '![[spec.pdf#page=3]]';
    const { editor } = setup(md);
    await until(editor, '.maia-embed-file');
    const card = dom(editor).querySelector('.maia-embed-file');
    expect(card.textContent).toBe('PDFspec.pdfPage 3');
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('shows only a card for video', async () => {
    const { editor } = setup('![[clip.mp4]]');
    await until(editor, '.maia-embed-file');
    expect(dom(editor).querySelector('video')).toBeNull();
    expect(dom(editor).querySelector('.maia-embed-file-kind').textContent).toBe('Video');
    editor.destroy();
  });
});

describe('note embeds', () => {
  it('renders the whole target note read-only in a card with an open link', async () => {
    const md = '![[Other]]';
    const { editor, onOpenNote } = setup(md);
    await vi.waitFor(() => expect(dom(editor).querySelector('.maia-embed-note-body h1')).not.toBeNull());
    expect(dom(editor).querySelector('.maia-embed-note-body').textContent).toContain('body text');
    dom(editor).querySelector('.maia-embed-open').click();
    expect(onOpenNote).toHaveBeenCalledWith('Other');
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('renders only the heading section and stops at depth 1 (no embed inside an embed)', async () => {
    const { editor } = setup('![[Other#Sub]]');
    await vi.waitFor(() => expect(dom(editor).querySelector('.maia-embed-note-body h2')).not.toBeNull());
    const body = dom(editor).querySelector('.maia-embed-note-body');
    expect(body.textContent).not.toContain('body text');
    expect(body.textContent).toContain('sub text');
    expect(body.querySelector('.maia-embed-note')).toBeNull();
    editor.destroy();
  });

  it('says so when the section does not exist, and shows a chip for a missing note', async () => {
    const { editor } = setup('![[Other#Nope]] and ![[Nobody]]');
    await until(editor, '.maia-embed-note-empty');
    expect(dom(editor).querySelector('.maia-embed-note-empty').textContent).toBe('Section not found');
    expect(dom(editor).querySelector('.maia-embed-missing').textContent).toBe('Nobody');
    editor.destroy();
  });
});

describe('helpers', () => {
  it('parses embed sizes', () => {
    expect(parseEmbedSize('300')).toEqual({ width: 300, height: null });
    expect(parseEmbedSize('300x200')).toEqual({ width: 300, height: 200 });
    expect(parseEmbedSize('caption')).toEqual({ width: null, height: null });
  });

  it('finds notes by title, folder path and .md name; the shallowest wins', () => {
    const notes = [...NOTES, { title: 'Deep', folder: 'x', content: '' }];
    expect(findNote(notes, 'other').title).toBe('Other');
    expect(findNote(notes, 'Deep.md').folder).toBe('x');
    expect(findNote(notes, 'a/b/Deep').folder).toBe('a/b');
    expect(findNote(notes, 'b/Deep').folder).toBe('a/b');
    expect(findNote(notes, 'Nothing')).toBeNull();
    expect(findNote(notes, '')).toBeNull();
  });

  it('is null off the desktop', () => {
    expect(createEmbedProvider({ isDesktop: () => false })).toBeNull();
  });
});

describe('file card opening', () => {
  it('opens the file on click and on Enter or Space, and is a labelled button', async () => {
    const openFile = vi.fn();
    const { editor } = setup('![[spec.pdf]]', { openFile });
    await until(editor, '.maia-embed-file');
    const card = dom(editor).querySelector('.maia-embed-file');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('aria-label')).toBe('Open spec.pdf');
    card.click();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(openFile).toHaveBeenCalledTimes(3);
    expect(openFile).toHaveBeenCalledWith('/vault', 'docs/spec.pdf');
    editor.destroy();
  });
});
