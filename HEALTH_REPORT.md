# Codebase Health Report

## Summary
The codebase shows signs of significant complexity creep in key components and structure drift in page files. While the core logic is functional, the monolithic nature of `ChronosModal.jsx` and `LedgerPage.jsx` poses maintainability risks.

## 1. Complexity Creep
- **`src/components/ChronosModal.jsx` (1911 lines)**:
  - **Issue**: Massive component handling UI, state, drag-and-drop, and business logic.
  - **Recommendation**: Extract sub-components (`TaskRow`, `SignalRow`, `DateTimePicker`) and move logic to custom hooks (`useChronos`, `useSessions`).

- **`src/pages/LedgerPage.jsx` (912 lines)**:
  - **Issue**: Defines multiple modal and card components inline.
  - **Recommendation**: Move `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, and `DecisionCard` to `src/features/Ledger/components/`.

## 2. Structure Drift
- **Inline Components**:
  - `ChronosModal.jsx`: Defines `Portal`, `CloseButton`, `PriorityCheckbox`, `CustomSelect`, `PillSelect`, `DateTimePicker`. These should be reusable UI components.
  - `LedgerPage.jsx`: Inline definition of domain-specific components violates the feature-folder structure established in `src/features/`.

## 3. Leftovers & Ghost Code
- **Ghost File**: `src/pages/NotesPage_ModalSnippet.jsx` appears to be a copy-paste artifact. It is not imported anywhere and contains invalid JSX (no component definition). **Action: Deleted.**
- **Console Logs**:
  - `src/features/Graph/pages/GraphPage.jsx`: `console.log("GraphPage: Nodes", nodes.length, ...)` **Action: Removed.**
  - `src/features/Graph/components/GraphRenderer.jsx`: Commented out debug log. **Action: Removed.**

## 4. Recommendations
1.  **Refactor `ChronosModal`**: Prioritize breaking this component down. It is the most complex part of the application and likely a source of bugs.
2.  **Standardize `LedgerPage`**: Align with the `src/features/` pattern used in `Graph` and `Opus`.
3.  **UI Library**: consolidate inline UI components (`PillSelect`, `CustomSelect`) into `src/components/ui/`.
