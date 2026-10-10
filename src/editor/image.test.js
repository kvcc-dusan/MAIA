// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { makeEditor, roundTrip, nodeTypes } from './testHelpers.js';
import { parseImageAlt, isLoadableSrc } from './image.js';

const LOSSLESS = [
  '![alt](https://example.com/a.png)',
  '![alt|300](https://example.com/a.png)',
  '![alt|300x200](https://example.com/a.png)',
  '![alt](https://example.com/a.png "Title")',
  '![alt](<My Folder/pic one.png>)',
  '![](attachments/photo.jpg)',
  '- ![a](https://x.com/a.png)\n- text',
  '[![a](https://x.com/a.png)](https://x.com)',
  'before ![a](img/a.png) after',
];

describe('image', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('is a node (it used to be deleted)', () => {
    expect(nodeTypes('![alt](https://example.com/a.png)').has('image')).toBe(true);
  });

  it('keeps src, alt and title as attributes', () => {
    const editor = makeEditor('![alt|300](https://example.com/a.png "T")');
    const image = editor.state.doc.firstChild.firstChild;
    expect(image.attrs).toMatchObject({ src: 'https://example.com/a.png', alt: 'alt|300', title: 'T' });
    editor.destroy();
  });

  it('renders a remote image as <img> with the size from the alt text', () => {
    const editor = makeEditor('![alt|300x200](https://example.com/a.png)');
    const img = editor.view.dom.querySelector('.maia-image img');
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
    expect(img.getAttribute('alt')).toBe('alt');
    expect(img.getAttribute('width')).toBe('300');
    expect(img.getAttribute('height')).toBe('200');
    editor.destroy();
  });

  it('renders a relative path as a chip with the alt text, or the file name', () => {
    const editor = makeEditor('![diagram](img/a.png) and ![](img/My%20Pic.png)');
    expect(editor.view.dom.querySelector('.maia-image img')).toBeNull();
    const chips = [...editor.view.dom.querySelectorAll('.maia-raw-image')].map((el) => el.textContent);
    expect(chips).toEqual(['diagram', 'My Pic.png']);
    editor.destroy();
  });

  it('falls back to a chip when the image fails to load', () => {
    const editor = makeEditor('![alt](https://example.com/missing.png)');
    editor.view.dom.querySelector('.maia-image img').dispatchEvent(new Event('error'));
    expect(editor.view.dom.querySelector('.maia-image img')).toBeNull();
    expect(editor.view.dom.querySelector('.maia-raw-image').textContent).toBe('alt');
    editor.destroy();
  });

  it('parses alt sizes and detects loadable sources', () => {
    expect(parseImageAlt('pic|300')).toEqual({ label: 'pic', width: 300, height: null });
    expect(parseImageAlt('pic|300x200')).toEqual({ label: 'pic', width: 300, height: 200 });
    expect(parseImageAlt('a|b')).toEqual({ label: 'a|b', width: null, height: null });
    expect(isLoadableSrc('https://x/a.png')).toBe(true);
    expect(isLoadableSrc('data:image/png;base64,AA')).toBe(true);
    expect(isLoadableSrc('img/a.png')).toBe(false);
  });

  it('writes a markdown image for a node that has no original text', () => {
    const editor = makeEditor('');
    editor.commands.insertContent({ type: 'paragraph', content: [{ type: 'image', attrs: { src: 'a b.png', alt: 'x', title: 'T' } }] });
    expect(editor.storage.markdown.getMarkdown()).toBe('![x](<a b.png> "T")');
    editor.destroy();
  });
});
