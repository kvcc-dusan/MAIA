// Shared constants for the Ledger decision surface (page, cards, modals).
// They moved here because DecisionCard and the modals were extracted out of
// LedgerPage.jsx but still speak the same visual language — one definition
// instead of three drifting copies.

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

// Bare form-field styling shared by the decision modals — the fields sit
// directly on the dialog surface with no boxed input chrome.
export const INPUT_CLEAN =
  'w-full bg-transparent border-none outline-hidden text-foreground placeholder:text-faint-foreground/50 transition-all resize-none p-0 focus:ring-0';

export const LABEL_CLASS =
  'text-xs font-bold uppercase tracking-widest text-subtle-foreground mb-3 block';
