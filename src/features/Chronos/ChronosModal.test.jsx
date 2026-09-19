// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ChronosModal from './ChronosModal';
import React from 'react';

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

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChronosModal', () => {
  const mockOnClose = vi.fn();
  const mockSetTasks = vi.fn();
  const mockSetReminders = vi.fn();
  const mockSetSessions = vi.fn();

  const baseProps = {
    onClose: mockOnClose,
    tasks: [],
    setTasks: mockSetTasks,
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

  it('closes via the standard dialog close button', () => {
    render(<ChronosModal {...baseProps} />);
    // AppDialog's own close button — every dialog in the app shares this
    // affordance now, so it is named "Close", not "Close Modal".
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('shows Tasks and Signals sections with add controls', () => {
    render(<ChronosModal {...baseProps} />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Signal')).toBeInTheDocument();
  });

  it('renders task delete button with aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(<ChronosModal {...baseProps} tasks={tasks} />);
    const deleteButton = screen.getByLabelText('Delete Task');
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

    await user.click(screen.getByLabelText('Add Task'));
    expect(screen.getByText('New Task')).toBeInTheDocument();
    // Field renders a visible-but-aria-hidden '*' after required labels;
    // testing-library's label matching includes it in textContent, so the
    // computed label text is "Title*", not "Title".
    expect(screen.getByLabelText('Title', { exact: false })).toBeInTheDocument();

    // Submitting with an empty title used to silently no-op; it now says why.
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(screen.getByText('Give the task a title.')).toBeInTheDocument();
    expect(mockSetTasks).not.toHaveBeenCalled();
  });

  it('creates a task with a title and returns to the calendar view', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);

    await user.click(screen.getByLabelText('Add Task'));
    await user.type(screen.getByLabelText('Title', { exact: false }), 'Write the report');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(mockSetTasks).toHaveBeenCalled();
    expect(screen.queryByText('New Task')).not.toBeInTheDocument();
  });

  it('cancels the signal form back to the calendar', async () => {
    const user = userEvent.setup();
    render(<ChronosModal {...baseProps} />);

    await user.click(screen.getByLabelText('Add Signal'));
    expect(screen.getByText('New Signal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('New Signal')).not.toBeInTheDocument();
  });
});
