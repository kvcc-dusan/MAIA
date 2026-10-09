// Shared constants for the Ledger decision surface (page, cards, modals).

// Semantic colour of the stakes / outcome dots. CSS var() strings passed to
// `style.backgroundColor`. The dot never carries meaning alone: every use sits
// next to a text label.
export const STAKES_DOT = {
  high: 'var(--danger)',
  medium: 'var(--warning)',
  low: 'var(--text-muted)',
};

export const OUTCOME_DOT = {
  success: 'var(--success)',
  mixed: 'var(--warning)',
  failure: 'var(--danger)',
};

// Display copy for the stored enum values (sentence case).
export const STAKES_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
export const REVERSIBILITY_LABEL = { reversible: 'Reversible', costly: 'Costly', irreversible: 'Irreversible' };
export const OUTCOME_LABEL = { success: 'Success', mixed: 'Mixed', failure: 'Failure' };
