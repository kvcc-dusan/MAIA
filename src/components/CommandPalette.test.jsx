// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
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

    await user.type(screen.getByPlaceholderText('Type a command or search notes…'), 'retro');
    const hit = screen.getByText('Quarterly retrospective');
    await user.click(hit.closest('[cmdk-item]'));
    expect(onOpenNote).toHaveBeenCalledWith('n2');
    expect(onClose).toHaveBeenCalled();
  });

  it('says when the note list is truncated', () => {
    const user = userEvent.setup();
    const notes = Array.from({ length: 60 }, (_, i) => makeNote(i, i));
    render(<CommandPalette open onClose={onClose} notes={notes} onOpenNote={onOpenNote} go={go} />);

    expect(screen.queryByText(/most recent of 60/)).not.toBeInTheDocument();
    return user.type(screen.getByPlaceholderText('Type a command or search notes…'), 'Note')
      .then(() => {
        expect(screen.getByText(/Showing 50 most recent of 60 notes/)).toBeInTheDocument();
      });
  });

  it('renders the keyboard hints', () => {
    render(<CommandPalette open onClose={onClose} notes={[]} onOpenNote={onOpenNote} go={go} />);
    expect(screen.getByText('↑↓ navigate')).toBeInTheDocument();
    expect(screen.getByText('↵ open')).toBeInTheDocument();
    expect(screen.getByText('esc close')).toBeInTheDocument();
  });
});
