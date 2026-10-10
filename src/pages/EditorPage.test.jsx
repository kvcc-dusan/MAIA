// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import EditorPage from './EditorPage.jsx';

// TipTap measures text with range rects, which jsdom does not implement.
if (!document.createRange().getClientRects) {
  document.createRange = () => ({
    setStart() {},
    setEnd() {},
    commonAncestorContainer: document.body,
    getClientRects: () => [],
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }),
  });
}

const makeNote = (overrides = {}) => ({
  id: 'n1',
  title: 'Untitled',
  content: '',
  tags: [],
  links: [],
  createdAt: '2026-10-10T10:00:00.000Z',
  project: null,
  projectIds: [],
  ...overrides,
});

const renderEditor = (note) => render(
  <EditorPage note={note} notes={[note]} updateNote={vi.fn()} onDelete={vi.fn()} projects={[]} />
);

const editorBody = () => document.querySelector('.ProseMirror');

describe('EditorPage initial focus', () => {
  afterEach(() => {
    cleanup();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  });

  it('focuses and selects the title of an empty note with the default title', async () => {
    renderEditor(makeNote());

    const title = screen.getByLabelText('Note title');
    await waitFor(() => expect(title).toHaveFocus());
    expect(title.selectionStart).toBe(0);
    expect(title.selectionEnd).toBe('Untitled'.length);
  });

  it('focuses the body of an empty note that already has a real title', async () => {
    renderEditor(makeNote({ title: 'Journal — Oct 10', tags: ['journal'] }));

    await waitFor(() => expect(editorBody()).toHaveFocus());
    expect(screen.getByLabelText('Note title')).not.toHaveFocus();
  });

  it('does not move focus when the note already has content', async () => {
    renderEditor(makeNote({ title: 'Plan', content: '# Plan\n\nSome text' }));

    await waitFor(() => expect(editorBody()).not.toBeNull());
    expect(document.activeElement).toBe(document.body);
  });

  it('does not take focus from a field the user is already typing in', async () => {
    const search = document.createElement('input');
    document.body.appendChild(search);
    search.focus();

    renderEditor(makeNote());
    await waitFor(() => expect(editorBody()).not.toBeNull());

    expect(search).toHaveFocus();
    search.remove();
  });
});
