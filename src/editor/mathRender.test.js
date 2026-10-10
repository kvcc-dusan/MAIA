// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { makeEditor } from './testHelpers.js';

vi.mock('katex', () => ({
  default: {
    render: vi.fn((source, target, options) => {
      if (source.includes('\\bad')) throw new Error('KaTeX parse error: Undefined control sequence: \\bad');
      target.textContent = `${options.displayMode ? 'display' : 'inline'}:${source}`;
    }),
  },
}));
vi.mock('katex/dist/katex.min.css', () => ({}));

const settle = (editor, selector) => vi.waitFor(() => {
  expect(editor.view.dom.querySelector(selector)).not.toBeNull();
});

describe('math rendering', () => {
  it('renders inline and block math, and keeps the markdown as typed', async () => {
    const md = 'Euler $e^{i\\pi}$ here\n\n$$\n\\int_0^1 x dx\n$$';
    const editor = makeEditor(md);
    await vi.waitFor(() => expect(editor.view.dom.querySelectorAll('.maia-math-render')).toHaveLength(2));
    const [inline, block] = editor.view.dom.querySelectorAll('.maia-math-render');
    expect(inline.textContent).toBe('inline:e^{i\\pi}');
    expect(block.textContent).toBe('display:\n\\int_0^1 x dx\n');
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('does not treat currency or escaped dollars as math', () => {
    const editor = makeEditor('costs $5 and $10, \\$a\\$');
    expect(editor.view.dom.querySelector('.maia-math')).toBeNull();
    editor.destroy();
  });

  it('shows the raw text with the error message when katex throws', async () => {
    const editor = makeEditor('bad $\\bad{x}$ formula');
    await settle(editor, '.maia-math-error');
    const failed = editor.view.dom.querySelector('.maia-math-error');
    expect(failed.textContent).toBe('$\\bad{x}$');
    expect(failed.title).toContain('Undefined control sequence');
    expect(editor.storage.markdown.getMarkdown()).toBe('bad $\\bad{x}$ formula');
    editor.destroy();
  });

  it('edits the raw source in place and writes it back on blur', async () => {
    const editor = makeEditor('a $x$ b');
    await settle(editor, '.maia-math-render');
    editor.view.dom.querySelector('.maia-math').click();
    const input = editor.view.dom.querySelector('input.maia-math-input');
    expect(input.value).toBe('x');
    input.value = 'y^2';
    input.dispatchEvent(new Event('blur'));
    expect(editor.storage.markdown.getMarkdown()).toBe('a $y^2$ b');
    await vi.waitFor(() => expect(editor.view.dom.querySelector('.maia-math-render').textContent).toBe('inline:y^2'));
    editor.destroy();
  });

  it('commits on Escape and edits block math in a textarea', async () => {
    const editor = makeEditor('$$\na\n$$');
    await settle(editor, '.maia-math-render');
    editor.view.dom.querySelector('.maia-math').click();
    const area = editor.view.dom.querySelector('textarea.maia-math-input');
    expect(area.value).toBe('\na\n');
    area.value = '\nb\nc\n';
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(editor.storage.markdown.getMarkdown()).toBe('$$\nb\nc\n$$');
    editor.destroy();
  });

  it('refuses an edit that would break the syntax and keeps the old source', async () => {
    const editor = makeEditor('a $x$ b');
    await settle(editor, '.maia-math-render');
    editor.view.dom.querySelector('.maia-math').click();
    const input = editor.view.dom.querySelector('input.maia-math-input');
    input.value = 'x$ and $y';
    input.dispatchEvent(new Event('blur'));
    expect(editor.storage.markdown.getMarkdown()).toBe('a $x$ b');
    await settle(editor, '.maia-math-render');
    editor.destroy();
  });

  it('does not edit a read-only document', async () => {
    const editor = makeEditor('a $x$ b');
    editor.setEditable(false);
    await settle(editor, '.maia-math-render');
    editor.view.dom.querySelector('.maia-math').click();
    expect(editor.view.dom.querySelector('.maia-math-input')).toBeNull();
    editor.destroy();
  });
});
