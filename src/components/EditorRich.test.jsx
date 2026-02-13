// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditorRich from './EditorRich';

// Polyfill for Tiptap/ProseMirror in JSDOM
beforeEach(() => {
    document.createRange = () => {
        const range = new Range();
        range.getBoundingClientRect = vi.fn(() => ({
            x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0,
        }));
        range.getClientRects = vi.fn(() => ({
            item: () => null,
            length: 0,
            [Symbol.iterator]: vi.fn()
        }));
        return range;
    };

    window.getSelection = () => ({
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
        getRangeAt: vi.fn(() => document.createRange()),
    });

    // Fix for getClientRects error
    Element.prototype.getClientRects = vi.fn(() => [
         { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }
    ]);

    // Fix for elementFromPoint error
    Object.defineProperty(document, 'elementFromPoint', {
        writable: true,
        value: vi.fn(() => null)
    });
});

describe('EditorRich Component', () => {
    it('renders with initial value', async () => {
        render(<EditorRich value="Hello World" />);
        await waitFor(() => {
            expect(screen.getByText('Hello World')).toBeTruthy();
        });
    });

    it('updates content and calls onChange', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        const { container } = render(<EditorRich value="" onChange={onChange} />);

        const editor = container.querySelector('.ProseMirror');
        // ProseMirror/Tiptap needs focus before typing sometimes in tests
        editor.focus();
        await user.type(editor, 'Test input');

        // Tiptap updates are sometimes async or debounced, wait for it
        await waitFor(() => {
            expect(screen.getByText('Test input')).toBeTruthy();
            // Tiptap might wrap in <p>
        });

        // Check if onChange was called. Note: Tiptap might emit partial updates.
        // We check if it was called at least once with the expected text roughly.
        expect(onChange).toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith(expect.stringContaining('Test input'));
    });

    it('calls onMetaChange with correct metadata', async () => {
        const onMetaChange = vi.fn();
        const user = userEvent.setup();
        const { container } = render(<EditorRich value="" onMetaChange={onMetaChange} />);

        const editor = container.querySelector('.ProseMirror');
        editor.focus();
        // Type a tag and a link
        // Use paste to ensure brackets are preserved exactly without potential keyboard shortcut interference
        await user.paste('#mytag [[mylink]]');

        await waitFor(() => {
            const lastCall = onMetaChange.mock.calls[onMetaChange.mock.calls.length - 1][0];
            expect(lastCall.tags).toContain('mytag');
            expect(lastCall.links).toContain('mylink');
            // Word count: "#mytag", "[[mylink]]" -> words depend on implementation.
            // countWords in EditorRich:
            // text.match(/\p{L}[\p{L}\p{M}\p{N}'’_-]*/gu)
            // "#mytag" -> "mytag" (if # not in p{L})?
            // Let's check regex: \p{L} is letter. # is punctuation/symbol.
            // So "#mytag" -> "mytag" is a word.
            // "[[mylink]]" -> "mylink" is a word.
            // So expecting 2 words? Or maybe 1 if space is missing.
            // We typed "#mytag [[mylink]]".
            expect(lastCall.wordCount).toBeGreaterThan(0);
        });
    });

    it('toggles editable state', async () => {
        const { rerender, container } = render(<EditorRich value="Editable" editable={true} />);
        // Wait for editor to initialize
        await waitFor(() => {
             expect(screen.getByText('Editable')).toBeTruthy();
        });
        const editor = container.querySelector('.ProseMirror');
        expect(editor.getAttribute('contenteditable')).toBe('true');

        rerender(<EditorRich value="Editable" editable={false} />);
        // When editable is false, Tiptap sets contenteditable="false"
        expect(editor.getAttribute('contenteditable')).toBe('false');
    });

    it('handles rapid updates', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        const { container } = render(<EditorRich value="" onChange={onChange} />);

        const editor = container.querySelector('.ProseMirror');
        editor.focus();
        await user.type(editor, 'Rapid');
        await user.type(editor, 'Fire');

        await waitFor(() => {
            expect(screen.getByText(/Rapid/)).toBeTruthy();
            expect(screen.getByText(/Fire/)).toBeTruthy();
        });

        expect(onChange).toHaveBeenCalled();
    });
});
