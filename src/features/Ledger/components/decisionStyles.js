// Shared constants for the Ledger decision surface (page, cards, modals).
// They moved here because DecisionCard and the modals were extracted out of
// LedgerPage.jsx but still speak the same visual language — one definition
// instead of three drifting copies.

// The modals' old INPUT_CLEAN / LABEL_CLASS field styles are gone: the
// dialogs consume the shared Field / Input / Textarea / Button primitives
// now, so their styling can no longer drift from the rest of the app.

// Semantic colour of the stakes / outcome dots. These are CSS var() *strings*
// passed to `style.backgroundColor`, so they stay token-driven while keeping
// the dot markup declarative.
export const STAKES_DOT = {
  high: 'var(--destructive)',
  medium: 'var(--warning)',
  low: 'var(--priority-1)',
};

export const OUTCOME_DOT = {
  success: 'var(--success)',
  mixed: 'var(--warning)',
  failure: 'var(--destructive)',
};
