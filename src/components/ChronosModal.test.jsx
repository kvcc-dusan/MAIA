// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ChronosModal from './ChronosModal';
import React from 'react';

// Mock utils
vi.mock('../utils/notify.js', () => ({
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

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = vi.fn();

describe('ChronosModal', () => {
  const mockOnClose = vi.fn();
  const mockSetTasks = vi.fn();
  const mockSetReminders = vi.fn();

  const reminders = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with close button having aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(
      <ChronosModal
        onClose={mockOnClose}
        tasks={tasks}
        setTasks={mockSetTasks}
        reminders={reminders}
        setReminders={mockSetReminders}
      />
    );

    const closeButton = screen.getByLabelText('Close Modal');
    expect(closeButton).toBeInTheDocument();
  });

  it('renders task close button with aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(
      <ChronosModal
        onClose={mockOnClose}
        tasks={tasks}
        setTasks={mockSetTasks}
        reminders={reminders}
        setReminders={mockSetReminders}
      />
    );

    const deleteButton = screen.getByLabelText('Delete Task');
    expect(deleteButton).toBeInTheDocument();
  });

  it('renders priority checkbox with aria-label', () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    render(
      <ChronosModal
        onClose={mockOnClose}
        tasks={tasks}
        setTasks={mockSetTasks}
        reminders={reminders}
        setReminders={mockSetReminders}
      />
    );

    const buttons = screen.getAllByRole('button');
    const checkbox = buttons.find(b => b.getAttribute('aria-label')?.includes('Mark as done'));
    expect(checkbox).toBeInTheDocument();
  });

  it('handles Escape in DateTimePicker without closing modal', async () => {
    const tasks = [
      { id: '1', title: 'Test Task', done: false, priority: 'p1', due: new Date().toISOString() }
    ];
    const user = userEvent.setup();
    render(
      <ChronosModal
        onClose={mockOnClose}
        tasks={tasks}
        setTasks={mockSetTasks}
        reminders={reminders}
        setReminders={mockSetReminders}
      />
    );

    // Open Signal Form (which has DateTimePicker in "At" mode)
    const addSignalBtns = screen.getAllByText('+');
    await user.click(addSignalBtns[1]);

    // Switch to "At" mode
    await user.click(screen.getByText('At'));

    // Find the DateTimePicker trigger button
    const pickerTrigger = screen.getByLabelText('Select Date and Time');
    expect(pickerTrigger).toBeInTheDocument();

    // Open the picker
    await user.click(pickerTrigger);

    // Verify popover is open
    expect(screen.queryAllByText('Date').some(el => el.tagName === 'BUTTON')).toBe(true);

    // Press Escape using fireEvent on window (to ensure capture phase runs on window)
    fireEvent.keyDown(window, { key: 'Escape' });

    // Expect modal onClose NOT to have been called (because propagation stopped)
    // This implies the DateTimePicker handler intercepted the event
    expect(mockOnClose).not.toHaveBeenCalled();

    // Wait for state update (popover closing)
    await waitFor(() => {
      const dateTabs = screen.queryAllByText('Date').filter(el => el.tagName === 'BUTTON');
      // The Date button should be gone (it's inside the popover)
      expect(dateTabs.length).toBe(0);
    });

    // Press Escape again (now picker is closed, modal should close)
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
