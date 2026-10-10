// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes, makeEditor } from './testHelpers.js';

const LOSSLESS = [
  'press <kbd>Ctrl</kbd> now',
  'a<br>b',
  'H<sub>2</sub>O x<sup>2</sup>',
  '<u>under</u>',
  '<mark>m</mark>',
  'use <name> here',
  'an <!-- inline comment --> in text',
  '<div class="x">\n  <p>hello</p>\n</div>',
  '<!-- c -->\n\ntext',
  '<details>\n<summary>S</summary>\n\nbody\n\n</details>',
  '<img src="a.png" width="100">',
  'a < b and c > d',
  '- list with <kbd>K</kbd>\n- two',
];

describe('html passthrough', () => {
  it.each(LOSSLESS)('round-trips byte for byte: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('never entity-escapes', () => {
    const out = roundTrip('press <kbd>Ctrl</kbd> and a < b <name>');
    expect(out).not.toMatch(/&lt;|&gt;/);
  });

  it('uses inline atoms for tags and a block atom for html blocks', () => {
    expect(nodeTypes('press <kbd>Ctrl</kbd>').has('htmlInline')).toBe(true);
    expect(nodeTypes('<div>\nx\n</div>').has('htmlBlock')).toBe(true);
  });

  it('does not run the html: it is shown as text', () => {
    const editor = makeEditor('<div onclick="x()">hi</div>\n\nA <b>bold</b> and <script>x</script>');
    expect(editor.view.dom.querySelector('div[onclick], b, script')).toBeNull();
    expect(editor.view.dom.textContent).toContain('<div onclick="x()">hi</div>');
    editor.destroy();
  });

  it('keeps the task list checkbox working', () => {
    expect(nodeTypes('- [ ] a\n- [x] b').has('taskItem')).toBe(true);
    expect(nodeTypes('- [ ] a').has('htmlInline')).toBe(false);
  });
});
