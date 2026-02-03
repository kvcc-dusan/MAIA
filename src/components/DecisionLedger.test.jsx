// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import DecisionLedger from './DecisionLedger';

// Mock ids
vi.mock('../lib/ids.js', () => ({
    uid: () => 'test-id',
    isoNow: () => '2023-01-01T00:00:00.000Z'
}));

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Polyfills for JSDOM
beforeEach(() => {
    Object.defineProperty(document, 'elementFromPoint', {
        writable: true,
        value: vi.fn(() => null)
    });
});

afterEach(() => {
    cleanup();
});

describe('DecisionLedger Component', () => {
    it('renders empty ledger state', () => {
        render(<DecisionLedger ledger={[]} setLedger={vi.fn()} />);
        expect(screen.getByText('Decision Ledger')).toBeTruthy();
        expect(screen.getByText('No open decisions. Good clarity.')).toBeTruthy();
    });

    it('opens modal on "Log Decision" click', async () => {
        const user = userEvent.setup();
        render(<DecisionLedger ledger={[]} setLedger={vi.fn()} />);

        // Use getByRole button to be more specific, but there might be multiple if modal is open (which it isn't).
        // If previous tests leaked, we might see modal.
        const logButton = screen.getByRole('button', { name: /Log Decision/i });
        await user.click(logButton);

        expect(screen.getByText('Log Strategic Decision')).toBeTruthy();
    });

    it('validates empty form submission', async () => {
        const user = userEvent.setup();
        const setLedger = vi.fn();
        render(<DecisionLedger ledger={[]} setLedger={setLedger} />);

        await user.click(screen.getByRole('button', { name: /Log Decision/i }));

        // Find the submit button in the modal. It has text "Log Decision".
        // The one in the header is behind the modal (overlay).
        // The modal is last in DOM.
        const buttons = screen.getAllByText(/Log Decision/i);
        const modalSubmit = buttons[buttons.length - 1];

        await user.click(modalSubmit);

        expect(setLedger).not.toHaveBeenCalled();
    });

    it('adds a new decision', async () => {
        const user = userEvent.setup();
        const setLedger = vi.fn();
        render(<DecisionLedger ledger={[]} setLedger={setLedger} />);

        await user.click(screen.getByRole('button', { name: /Log Decision/i }));

        const titleInput = screen.getByPlaceholderText('e.g. Migration to Postgres');
        await user.type(titleInput, 'Test Decision');

        const assumptionsInput = screen.getByPlaceholderText(/- Zero downtime required/i);
        await user.type(assumptionsInput, 'Assumption 1');

        const buttons = screen.getAllByText(/Log Decision/i);
        const modalSubmit = buttons[buttons.length - 1];
        await user.click(modalSubmit);

        expect(setLedger).toHaveBeenCalledTimes(1);
        const newData = setLedger.mock.calls[0][0];
        expect(newData).toHaveLength(1);
        expect(newData[0]).toMatchObject({
            title: 'Test Decision',
            assumptions: ['Assumption 1'],
            status: 'open',
            id: 'test-id'
        });
    });

    it('reviews an open decision', async () => {
        const user = userEvent.setup();
        const setLedger = vi.fn();
        const initialLedger = [{
            id: 'test-id',
            title: 'Test Decision',
            assumptions: ['Assumption 1'],
            status: 'open',
            createdAt: '2023-01-01T00:00:00.000Z',
            stakes: 'medium',
            reversibility: 'reversible',
            confidence: 70
        }];

        render(<DecisionLedger ledger={initialLedger} setLedger={setLedger} />);

        await user.hover(screen.getByText('Test Decision'));

        const reviewBtn = screen.getByText('Review');
        await user.click(reviewBtn);

        expect(screen.getByText('Review Outcome')).toBeTruthy();

        const textareas = screen.getAllByRole('textbox');
        const outcomeInput = textareas[textareas.length - 1];
        await user.type(outcomeInput, 'It went well');

        await user.click(screen.getByText('success'));

        await user.click(screen.getByText('Complete Review'));

        expect(setLedger).toHaveBeenCalled();
        const updateFn = setLedger.mock.calls[0][0];
        expect(typeof updateFn).toBe('function');

        const newState = updateFn(initialLedger);
        expect(newState[0].status).toBe('reviewed');
        expect(newState[0].outcome).toBe('It went well');
        expect(newState[0].outcomeStatus).toBe('success');
    });
});
