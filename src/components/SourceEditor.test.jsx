// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import SourceEditor from './SourceEditor.jsx';

afterEach(cleanup);

const box = () => screen.getByLabelText('Note markdown source');

describe('SourceEditor', () => {
  it('shows the markdown exactly as given, syntax the rich editor cannot keep included', () => {
    const md = '> [!note] Title\n> body\n\n| a | b |\n| - | - |\n\n$\\frac{a}{b}$ and [[Link|alias]] ^id';
    render(<SourceEditor value={md} />);
    expect(box().value).toBe(md);
  });

  it('hands back exactly what was typed', () => {
    const onChange = vi.fn();
    render(<SourceEditor value="a" onChange={onChange} />);
    fireEvent.change(box(), { target: { value: 'a\n\n\n  b\t[[x]]  ' } });
    expect(onChange).toHaveBeenCalledWith('a\n\n\n  b\t[[x]]  ');
  });

  it('writes CRLF back for a file that used CRLF', () => {
    const onChange = vi.fn();
    render(<SourceEditor value={'one\r\ntwo\r\n'} onChange={onChange} />);
    expect(box().value).toBe('one\ntwo\n');
    fireEvent.change(box(), { target: { value: 'one\ntwo\nthree\n' } });
    expect(onChange).toHaveBeenCalledWith('one\r\ntwo\r\nthree\r\n');
  });

  it('keeps LF files LF', () => {
    const onChange = vi.fn();
    render(<SourceEditor value={'one\ntwo'} onChange={onChange} />);
    fireEvent.change(box(), { target: { value: 'one\ntwo\nthree' } });
    expect(onChange).toHaveBeenCalledWith('one\ntwo\nthree');
  });

  it('emits tags, links and counts on mount and on change', () => {
    const onMetaChange = vi.fn();
    render(<SourceEditor value={'hello [[Note]] #tag'} onMetaChange={onMetaChange} />);
    expect(onMetaChange).toHaveBeenLastCalledWith(expect.objectContaining({ tags: ['tag'], links: ['Note'], wordCount: 3 }));
    fireEvent.change(box(), { target: { value: 'hello [[Other]]' } });
    expect(onMetaChange).toHaveBeenLastCalledWith(expect.objectContaining({ tags: [], links: ['Other'] }));
  });

  it('does not emit anything on mount when nothing changed', () => {
    const onChange = vi.fn();
    render(<SourceEditor value="untouched" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is read-only in reading mode and focusable when editable', () => {
    const { rerender } = render(<SourceEditor value="x" editable={false} />);
    expect(box()).toHaveAttribute('readonly');
    rerender(<SourceEditor value="x" editable autoFocus />);
    expect(box()).not.toHaveAttribute('readonly');
    expect(box()).toHaveFocus();
  });

  it('does not steal focus from a field the user is typing in', () => {
    const search = document.createElement('input');
    document.body.appendChild(search);
    search.focus();
    render(<SourceEditor value="" autoFocus />);
    expect(search).toHaveFocus();
    search.remove();
  });
});
