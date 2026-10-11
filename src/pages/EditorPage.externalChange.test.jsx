// @vitest-environment jsdom
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
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
  title: 'Plan',
  content: 'First version',
  tags: [],
  links: [],
  createdAt: '2026-10-10T10:00:00.000Z',
  project: null,
  projectIds: [],
  ...overrides,
});

const body = () => document.querySelector('.ProseMirror');
const setup = (note) => {
  const updateNote = vi.fn();
  const view = render(<EditorPage note={note} notes={[note]} updateNote={updateNote} onDelete={vi.fn()} projects={[]} />);
  const rerenderWith = (next) => view.rerender(
    <EditorPage note={next} notes={[next]} updateNote={updateNote} onDelete={vi.fn()} projects={[]} />,
  );
  return { updateNote, rerenderWith };
};

describe('EditorPage when the file changes on disk', () => {
  afterEach(cleanup);

  it('shows the new text of an open note without a tab switch', async () => {
    const { rerenderWith } = setup(makeNote());
    await waitFor(() => expect(body()).toHaveTextContent('First version'));

    rerenderWith(makeNote({ content: 'Edited in Obsidian' }));

    await waitFor(() => expect(body()).toHaveTextContent('Edited in Obsidian'));
  });

  it('keeps unsaved typing instead of overwriting it', async () => {
    const { rerenderWith } = setup(makeNote());
    await waitFor(() => expect(body()).toHaveTextContent('First version'));

    fireEvent.change(screen.getByLabelText('Note title'), { target: { value: 'Typed locally' } });
    rerenderWith(makeNote({ content: 'Edited in Obsidian' }));

    expect(screen.getByLabelText('Note title')).toHaveValue('Typed locally');
    expect(body()).toHaveTextContent('First version');
  });

  it('ignores the echo of its own save', async () => {
    const { updateNote, rerenderWith } = setup(makeNote());
    await waitFor(() => expect(body()).toHaveTextContent('First version'));

    fireEvent.change(screen.getByLabelText('Note title'), { target: { value: 'Renamed' } });
    await waitFor(() => expect(updateNote).toHaveBeenCalled());
    const saved = updateNote.mock.calls.at(-1)[0];
    rerenderWith({ ...saved });

    expect(screen.getByLabelText('Note title')).toHaveValue('Renamed');
    expect(body()).toHaveTextContent('First version');
  });

  it('adopts an external change to the title too', async () => {
    const { rerenderWith } = setup(makeNote());
    await waitFor(() => expect(body()).toHaveTextContent('First version'));

    rerenderWith(makeNote({ title: 'Plan v2', content: 'First version' }));

    await waitFor(() => expect(screen.getByLabelText('Note title')).toHaveValue('Plan v2'));
  });
});
