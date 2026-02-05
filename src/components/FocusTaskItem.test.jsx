// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import FocusTaskItem from './FocusTaskItem';
import React from 'react';

describe('FocusTaskItem', () => {
  it('renders task title', () => {
    const task = { id: 1, title: 'Test Task', done: false };
    render(<FocusTaskItem task={task} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders completed task with strikethrough', () => {
    const task = { id: 2, title: 'Done Task', done: true };
    render(<FocusTaskItem task={task} />);
    const title = screen.getByText('Done Task');
    expect(title).toHaveClass('line-through');
  });
});
