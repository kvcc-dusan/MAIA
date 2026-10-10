// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ChronosModal from './ChronosModal';
import React from 'react';
import { clearScheduled } from '../../utils/notify.js';

// Mock utils — the path is relative to this file, so after the move from
// src/components/ it points two levels up.
vi.mock('../../utils/notify.js', () => ({
  ensurePermission: vi.fn(() => Promise.resolve(true)),
  scheduleLocalNotification: vi.fn(),
  rescheduleAll: vi.fn(),
  clearScheduled: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-dom createPortal so portalled dialog/menu content stays inside
// the test container instead of being appended to document.body.
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

// Arc's tooltip (inside IconButton) measures with ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChronosModal', () => {
  const mockOnClose = vi.fn();
  const mockSetTasks = vi.fn();
  const mockToggleTask = vi.fn();
  const mockSetReminders = vi.fn();
  const mockSetSessions = vi.fn();

  const baseProps = {
    onClose: mockOnClose,
    tasks: [],
    setTasks: mockSetTasks,
    toggleTask: mockToggleTask,
    reminders: [],
    setReminders: mockSetReminders,
    sessions: [],
    setSessions: mockSetSessions,
    projects: [],
  };

  // No frozen system time here: nothing in this suite asserts on a specific
  // date, and fake timers deadlock userEvent's internal scheduling unless
  // carefully configured — simplest to just not need them.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders as a labelled dialog', () => {
    render(<ChronosModal {...baseProps} />);
    // The dialog is named by its (visually hidden) title; the visible
    // "Chronos" wordmark lives in the left column of the layout — so the
    // name appears twice by design (hidden label + visible wordmark).
    const dialog = screen.getByRole('dialog', { name: 'Chronos' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('Chronos').length).toBeGreaterThanOrEqual(1);
  });

  it('closes via the Escape key', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);
    // The dialog has no visible close button — Escape (and clicking outside)
    // are the exits. Base UI routes both through onOpenChange(false).
    await user.keyboard('{Escape}');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows Tasks and Signals sections with add controls', () => {
    render(<ChronosModal {...baseProps} />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
    expect(screen.getByLabelText('Add task')).toBeInTheDocument();
    expect(screen.getByLabelText('Add signal')).toBeInTheDocument();
  });

  it('renders task delete button with aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);
    const deleteButton = screen.getByLabelText('Delete task');
    expect(deleteButton).toBeInTheDocument();
  });

  it('renders priority checkbox with aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);
    const buttons = screen.getAllByRole('button');
    const checkbox = buttons.find(b => b.getAttribute('aria-label')?.includes('Mark as done'));
    expect(checkbox).toBeInTheDocument();
  });

  it('toggles through the shared toggleTask instead of writing done itself', async () => {
    const user = userEvent.setup();
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);
    const checkbox = screen.getAllByRole('button').find(b => b.getAttribute('aria-label')?.includes('Mark as done'));
    await user.click(checkbox);
    expect(mockToggleTask).toHaveBeenCalledWith('1');
    expect(mockSetTasks).not.toHaveBeenCalled();
  });

  it('gives every calendar day cell an accessible name with task state', () => {
    // Today is always in the rendered month and selected by default; a task
    // due today must surface in the cell's name ("…, 1 task, today, selected").
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);

    const todayCell = screen.getByRole('button', { name: /today, selected/ });
    expect(todayCell).toBeInTheDocument();
    expect(todayCell.getAttribute('aria-label')).toMatch(/, 1 task, today, selected$/);
    expect(todayCell).toHaveAttribute('aria-current', 'date');
    // No cell may remain an unnamed button — the old grid was ~30 of them.
    const allCells = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent));
    allCells.forEach((cell) => expect(cell).toHaveAttribute('aria-label'));
  });

  it('opens the task form and shows an inline error on empty submit', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);

    await user.click(screen.getByLabelText('Add task'));
    expect(screen.getByText('New task')).toBeInTheDocument();
    // Field renders a visible-but-aria-hidden '*' after required labels;
    // testing-library's label matching includes it in textContent, so the
    // computed label text is "Title*", not "Title".
    expect(screen.getByLabelText('Title', { exact: false })).toBeInTheDocument();

    // Submitting with an empty title used to silently no-op; it now says why.
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(screen.getByText('Give the task a title.')).toBeInTheDocument();
    expect(mockSetTasks).not.toHaveBeenCalled();
  });

  it('creates a task with a title and returns to the calendar view', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);

    await user.click(screen.getByLabelText('Add task'));
    await user.type(screen.getByLabelText('Title', { exact: false }), 'Write the report');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(mockSetTasks).toHaveBeenCalled();
    expect(screen.queryByText('New task')).not.toBeInTheDocument();
  });

  it('asks before deleting a task, and only deletes on confirm', async () => {
    const user = userEvent.setup();
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);

    await user.click(screen.getByLabelText('Delete task'));
    expect(mockSetTasks).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog', { name: "Delete task 'Test Task'?" });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));
    expect(mockSetTasks).toHaveBeenCalledTimes(1);
    const remove = mockSetTasks.mock.calls[0][0];
    expect(remove(tasks)).toEqual([]);
  });

  it('keeps a task when the delete confirm is cancelled', async () => {
    const user = userEvent.setup();
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);

    await user.click(screen.getByLabelText('Delete task'));
    const dialog = await screen.findByRole('dialog', { name: "Delete task 'Test Task'?" });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(mockSetTasks).not.toHaveBeenCalled();
    // The dialog plays its exit animation before unmounting.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: "Delete task 'Test Task'?" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('dialog', { name: 'Chronos' })).toBeInTheDocument();
  });

  it('asks before cancelling a signal, and only cancels on confirm', async () => {
    const user = userEvent.setup();
    const reminders = [
      { id: 'r1', title: 'Stretch', scheduledAt: new Date(Date.now() + 3600000).toISOString(), delivered: false, priority: 'p3' }
    ];
    render(<ChronosModal {...baseProps} reminders={reminders} />);

    await user.click(screen.getByLabelText('Cancel signal'));
    expect(mockSetReminders).not.toHaveBeenCalled();
    expect(clearScheduled).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog', { name: "Cancel signal 'Stretch'?" });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel signal' }));

    expect(clearScheduled).toHaveBeenCalledWith('r1');
    expect(mockSetReminders).toHaveBeenCalledTimes(1);
    expect(mockSetReminders.mock.calls[0][0](reminders)).toEqual([]);
  });

  it('asks before deleting a session, and only deletes on confirm', async () => {
    const user = userEvent.setup();
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    const sessions = [
      { id: 's1', title: 'Deep work', start: start.toISOString(), end: end.toISOString(), color: 'neutral' }
    ];
    render(<ChronosModal {...baseProps} sessions={sessions} />);

    fireEvent.contextMenu(screen.getByRole('button', { name: /^Deep work,/ }));
    // Base UI's menu sits at pointer-events: none while it opens, so click it directly.
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete session' }));
    expect(mockSetSessions).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog', { name: "Delete session 'Deep work'?" });
    await user.click(within(dialog).getByRole('button', { name: 'Delete session' }));
    expect(mockSetSessions).toHaveBeenCalledTimes(1);
    expect(mockSetSessions.mock.calls[0][0](sessions)).toEqual([]);
  });

  it('cancels the signal form back to the calendar', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);

    await user.click(screen.getByLabelText('Add signal'));
    expect(screen.getByText('New signal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('New signal')).not.toBeInTheDocument();
  });
});
