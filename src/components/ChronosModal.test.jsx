// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/react';
import ChronosModal from './ChronosModal';
import React from 'react';

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
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-06T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders correctly', () => {
    const props = {
      onClose: vi.fn(),
      tasks: [
        { id: '1', title: 'Task 1', done: false, priority: 'p1' },
        { id: '2', title: 'Task 2', done: true, priority: 'p2' },
      ],
      setTasks: vi.fn(),
      reminders: [
        { id: 's1', title: 'Signal 1', scheduledAt: '2024-02-06T13:00:00Z', priority: 'high' }
      ],
      setReminders: vi.fn(),
      pushToast: vi.fn(),
    };

    const { asFragment } = render(<ChronosModal {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
