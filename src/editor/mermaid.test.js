// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { makeEditor, roundTrip } from './testHelpers.js';
import { setTheme } from '../lib/theme.js';

const mermaid = vi.hoisted(() => ({
  loaded: false,
  initialize: vi.fn(),
  render: vi.fn(async (id, code) => {
    if (code.includes('broken')) throw new Error('Parse error on line 1');
    return { svg: `<svg data-diagram="${code.split('\n')[0]}"></svg>` };
  }),
}));
vi.mock('mermaid', () => {
  mermaid.loaded = true;
  return { default: { initialize: mermaid.initialize, render: mermaid.render } };
});

// The source only shows for a focused editor, and focus needs the element in the document.
const focusedEditor = (md) => {
  const editor = makeEditor(md);
  document.body.append(editor.options.element);
  return editor;
};
const FENCE = '```mermaid\ngraph TD\n  A-->B\n```';

describe('mermaid diagrams', () => {
  it('never loads mermaid for a document without a diagram', async () => {
    const editor = makeEditor('```js\nconst a = 1;\n```\n\ntext');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mermaid.loaded).toBe(false);
    expect(editor.view.dom.querySelector('.maia-mermaid')).toBeNull();
    expect(editor.view.dom.querySelector('.maia-mermaid-hidden')).toBeNull();
    editor.destroy();
  });

  it('keeps an ordinary fenced block in the markdown', () => {
    expect(roundTrip(FENCE)).toBe(FENCE);
  });

  it('draws the diagram, hides the code and uses strict security', async () => {
    const editor = makeEditor(FENCE);
    await vi.waitFor(() => expect(editor.view.dom.querySelector('.maia-mermaid-diagram svg')).not.toBeNull());
    expect(editor.view.dom.querySelector('pre').className).toContain('maia-mermaid-hidden');
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: 'strict', startOnLoad: false }));
    expect(editor.storage.markdown.getMarkdown()).toBe(FENCE);
    editor.destroy();
  });

  it('toggles to the source and back without touching the markdown', async () => {
    const editor = focusedEditor(FENCE);
    await vi.waitFor(() => expect(editor.view.dom.querySelector('.maia-mermaid-toggle')).not.toBeNull());
    editor.view.dom.querySelector('.maia-mermaid-toggle').click();
    editor.view.focus();
    expect(editor.view.dom.querySelector('pre').className).not.toContain('maia-mermaid-hidden');
    expect(editor.view.dom.querySelector('.maia-mermaid-toggle').textContent).toBe('Show diagram');
    expect(editor.view.dom.querySelector('.maia-mermaid-diagram')).toBeNull();
    editor.view.dom.querySelector('.maia-mermaid-toggle').click();
    expect(editor.view.dom.querySelector('pre').className).toContain('maia-mermaid-hidden');
    editor.view.dom.blur();
    expect(editor.storage.markdown.getMarkdown()).toBe(FENCE);
    editor.destroy();
  });

  it('shows the message and the source for a diagram that does not parse', async () => {
    const md = '```mermaid\nbroken ->\n```';
    const editor = makeEditor(md);
    await vi.waitFor(() => expect(editor.view.dom.querySelector('.maia-mermaid-error')).not.toBeNull());
    expect(editor.view.dom.querySelector('.maia-mermaid-error-message').textContent).toBe('Parse error on line 1');
    expect(editor.view.dom.querySelector('.maia-mermaid-error-source').textContent).toBe('broken ->');
    expect(editor.storage.markdown.getMarkdown()).toBe(md);
    editor.destroy();
  });

  it('redraws with the other mermaid theme when the app theme changes', async () => {
    setTheme('dark');
    const editor = makeEditor(FENCE);
    await vi.waitFor(() => expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' })));
    setTheme('light');
    await vi.waitFor(() => expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'default' })));
    editor.destroy();
  });

  it('has no toggle in a read-only document', async () => {
    const editor = makeEditor(FENCE);
    editor.setEditable(false);
    await vi.waitFor(() => expect(editor.view.dom.querySelector('.maia-mermaid-diagram svg')).not.toBeNull());
    expect(editor.view.dom.querySelector('.maia-mermaid-toggle')).toBeNull();
    editor.destroy();
  });
});
