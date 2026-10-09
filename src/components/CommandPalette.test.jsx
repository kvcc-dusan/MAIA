// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import CommandPalette from './CommandPalette';
import React from 'react';

// Portalled dialog content must stay inside the test container.
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

// cmdk measures its list; jsdom has neither class.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// cmdk scrolls the selected item into view.
Element.prototype.scrollIntoView = vi.fn();

function makeNote(i, ageDays = i) {
  const created = new Date(Date.now() - ageDays * 86400000).toISOString();
  return { id: `n${i}`, title: `Note ${i}`, content: '', tags: [], createdAt: created };
}

describe('CommandPalette', () => {
  const onClose = vi.fn();
  const onOpenNote = vi.fn();
  const go = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows recent notes first when the query is empty', () => {
    const notes = Array.from({ length: 10 }, (_, i) => makeNote(i, i));
    render(<CommandPalette open onClose={onClose} notes={notes} onOpenNote={onOpenNote} go={go} />);

    expect(screen.getByText('Recent notes')).toBeInTheDocument();
    // Sorted newest-first: Note 0 is the most recent and must be visible.
    expect(screen.getByText('Note 0')).toBeInTheDocument();
    // Recents cap at five.
    expect(screen.queryByText('Note 5')).not.toBeInTheDocument();
  });

  it('finds a note by title when typing', async () => {
    const user = userEvent.setup();
    const notes = [makeNote(0), makeNote(1), { ...makeNote(2), title: 'Quarterly retrospective' }];
    render(<CommandPalette open onClose={onClose} notes={notes} onOpenNote={onOpenNote} go={go} />);

    await user.type(screen.getByPlaceholderText('Search commands and notes'), 'retro');
    // The group heading changes with the query, so the old row fades out while the new one enters.
    await waitFor(() => expect(screen.getAllByText('Quarterly retrospective')).toHaveLength(1));
    const hit = screen.getByText('Quarterly retrospective');
    await user.click(hit.closest('[role="option"]'));
    expect(onOpenNote).toHaveBeenCalledWith('n2');
    expect(onClose).toHaveBeenCalled();
  });

  it('caps the typed search at the 50 most recent notes', async () => {
    const user = userEvent.setup();
    const notes = Array.from({ length: 60 }, (_, i) => makeNote(i, i));
    render(<CommandPalette open onClose={onClose} notes={notes} onOpenNote={onOpenNote} go={go} />);

    await user.type(screen.getByPlaceholderText('Search commands and notes'), 'Note');
    await screen.findByText('Note 49');
    expect(screen.queryByText('Note 50')).not.toBeInTheDocument();
  });

  it('closes from the Esc button', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={onClose} notes={[]} onOpenNote={onOpenNote} go={go} />);
    await user.click(screen.getByRole('button', { name: 'Close command palette' }));
    expect(onClose).toHaveBeenCalled();
  });
});
