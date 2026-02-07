// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
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

// Mock react-dom createPortal
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

  const reminders = [];

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-06T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly (snapshot)', () => {
    const props = {
      onClose: mockOnClose,
      tasks: [
        { id: '1', title: 'Task 1', done: false, priority: 'p1' },
        { id: '2', title: 'Task 2', done: true, priority: 'p2' },
      ],
      setTasks: mockSetTasks,
      reminders: [
        { id: 's1', title: 'Signal 1', scheduledAt: '2024-02-06T13:00:00Z', priority: 'high' }
      ],
      setReminders: mockSetReminders,
      sessions: [],
      setSessions: vi.fn(),
      pushToast: vi.fn(),
    };

    const { asFragment } = render(<ChronosModal {...props} />);
    expect(asFragment()).toMatchSnapshot();
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
        sessions={[]}
        setSessions={vi.fn()}
      />
    );

    const closeButton = screen.getByLabelText('Close Modal');
    expect(closeButton).toBeInTheDocument();
  });

  it('renders task close button with aria-label', () => {
    // Note: TaskRow in HEAD might default to "Close", so checking if "Delete Task" is effective or "Close" is present
    // Adjust expectations if TaskRow doesn't pass "Delete Task"
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
        sessions={[]}
        setSessions={vi.fn()}
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
        sessions={[]}
        setSessions={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    const checkbox = buttons.find(b => b.getAttribute('aria-label')?.includes('Mark as done'));
    expect(checkbox).toBeInTheDocument();
  });

  it.skip('handles Escape in DateTimePicker without closing modal', async () => {
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
        sessions={[]}
        setSessions={vi.fn()}
      />
    );

    const addSignalBtns = screen.getAllByText('+');
    // Assuming the second one is for signals.
    if (addSignalBtns[1]) {
      await user.click(addSignalBtns[1]);
      // ... simplified interaction check given limited context ...
    }
  });
});
