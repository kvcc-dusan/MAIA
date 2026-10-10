// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import EditorPage from './EditorPage.jsx';

if (!document.createRange().getClientRects) {
  document.createRange = () => ({
    setStart() {},
    setEnd() {},
    commonAncestorContainer: document.body,
    getClientRects: () => [],
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }),
  });
}

const UNSAFE_NOTE = '# Plan\n\n> [!warning] Careful\n> body\n\n| a | b |\n| - | - |\n| 1 | 2 |\n';
const SAFE_NOTE = '# Plan\n\nSee [[Other]] and **bold**.\n\n- a\n- b\n';

const makeNote = (content, overrides = {}) => ({
  id: 'n1', title: 'Plan', content, tags: [], links: [], createdAt: '2026-10-10T10:00:00.000Z',
  project: null, projectIds: [], ...overrides,
});

const renderEditor = (note, updateNote = vi.fn()) => ({
  updateNote,
  ...render(<EditorPage note={note} notes={[note]} updateNote={updateNote} onDelete={vi.fn()} projects={[]} />),
});

const source = () => screen.queryByLabelText('Note markdown source');
const rich = () => document.querySelector('.ProseMirror');
const notice = () => screen.queryByText("This note uses syntax the editor can't keep intact yet");

describe('EditorPage source mode and the round-trip guard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('opens a safe note in the rich view with no notice', async () => {
    renderEditor(makeNote(SAFE_NOTE));
    await waitFor(() => expect(rich()).not.toBeNull());
    expect(source()).toBeNull();
    expect(notice()).toBeNull();
  });

  it('opens a note with a callout and a table in source mode with the notice', async () => {
    renderEditor(makeNote(UNSAFE_NOTE));
    expect(source()).toHaveValue(UNSAFE_NOTE);
    expect(rich()).toBeNull();
    expect(notice()).toBeInTheDocument();
    expect(screen.getByText(/Edits are saved as plain markdown/)).toHaveTextContent('Found: tables, callouts');
    expect(screen.getByRole('button', { name: 'Switch to rich view' })).toBeInTheDocument();
  });

  it('opens in source mode even when rich view was remembered for that note', () => {
    localStorage.setItem('maia:note-view:n1', 'rich');
    renderEditor(makeNote(UNSAFE_NOTE));
    expect(source()).not.toBeNull();
  });

  it('switches to the rich view on request, warns, and does not remember the choice', async () => {
    renderEditor(makeNote(UNSAFE_NOTE));
    await userEvent.click(screen.getByRole('button', { name: 'Switch to rich view' }));
    await waitFor(() => expect(rich()).not.toBeNull());
    expect(source()).toBeNull();
    expect(screen.getByText(/can change or drop that syntax/)).toBeInTheDocument();
    expect(localStorage.getItem('maia:note-view:n1')).not.toBe('rich');
  });

  it('does not save anything just for opening a note in source mode', async () => {
    const { updateNote, unmount } = renderEditor(makeNote(UNSAFE_NOTE));
    unmount();
    // the unmount flush only writes when the content differs from what was loaded
    const writes = updateNote.mock.calls.map(([n]) => n.content);
    writes.forEach((content) => expect(content).toBe(UNSAFE_NOTE));
  });

  it('saves a source edit through the same path, byte for byte, on unmount', () => {
    const { updateNote, unmount } = renderEditor(makeNote(UNSAFE_NOTE));
    const edited = `${UNSAFE_NOTE}\n> [!tip] added  \n`;
    fireEvent.change(source(), { target: { value: edited } });
    unmount();
    expect(updateNote).toHaveBeenCalledWith(expect.objectContaining({ content: edited }));
  });

  it('autosaves a source edit after the debounce', async () => {
    const { updateNote } = renderEditor(makeNote(UNSAFE_NOTE));
    fireEvent.change(source(), { target: { value: `${UNSAFE_NOTE}more` } });
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(expect.objectContaining({ content: `${UNSAFE_NOTE}more` })));
  });

  it('opens a safe note in source mode when that was chosen for it', () => {
    localStorage.setItem('maia:note-view:n1', 'source');
    renderEditor(makeNote(SAFE_NOTE));
    expect(source()).toHaveValue(SAFE_NOTE);
    expect(notice()).toBeNull();
  });

  it('toggles from the More menu and remembers it per note', async () => {
    renderEditor(makeNote(SAFE_NOTE));
    await waitFor(() => expect(rich()).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Source mode' }));
    expect(source()).toHaveValue(SAFE_NOTE);
    expect(localStorage.getItem('maia:note-view:n1')).toBe('source');

    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rich view' }));
    await waitFor(() => expect(rich()).not.toBeNull());
    expect(localStorage.getItem('maia:note-view:n1')).toBe('rich');
  });

  it('keeps the edited text when switching views', async () => {
    renderEditor(makeNote(UNSAFE_NOTE));
    fireEvent.change(source(), { target: { value: 'plain **edit**' } });
    await userEvent.click(screen.getByRole('button', { name: 'Switch to rich view' }));
    await waitFor(() => expect(rich()).not.toBeNull());
    expect(rich().textContent).toContain('plain edit');
  });

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    renderEditor(makeNote(UNSAFE_NOTE));
    expect(source()).not.toBeNull();
    spy.mockRestore();
  });
});
