// @vitest-environment jsdom
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import EditorRich from './EditorRich.jsx';

afterEach(cleanup);

// Content the editor would rewrite (bullet marker, setext heading, blank lines)
const REWRITABLE = 'Title\n=====\n\n* a\n* b\n\n\n\nend\n';

describe('EditorRich writes only on a real edit', () => {
  it('does not call onChange when a note is opened', async () => {
    const onChange = vi.fn();
    render(<EditorRich value={REWRITABLE} onChange={onChange} />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).not.toBeNull());
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when switching between reading and editing', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<EditorRich value={REWRITABLE} onChange={onChange} editable />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).not.toBeNull());
    rerender(<EditorRich value={REWRITABLE} onChange={onChange} editable={false} />);
    rerender(<EditorRich value={REWRITABLE} onChange={onChange} editable />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens a note whose body is raw syntax without touching it', async () => {
    const onChange = vi.fn();
    const md = 'see [[Note|a]] <kbd>K</kbd> $\\pi$ x[^1]\n\n[^1]: note';
    render(<EditorRich value={md} onChange={onChange} />);
    await waitFor(() => expect(document.querySelector('.maia-wikilink')).not.toBeNull());
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.maia-raw').length).toBeGreaterThan(0);
  });
});
