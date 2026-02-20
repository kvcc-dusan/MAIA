# Codebase Health Report

**Date**: 2025-02-18
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (1139 lines)**
    *   This file has grown massively and exhibits severe structure drift. It defines multiple significant components inline (`NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`) which should be their own files.
    *   **Recommendation**: Immediate refactor required. Move inline components to `src/features/Ledger/components/` or `src/components/`.

*   **HIGH: `src/components/ChronosModal.jsx` (686 lines)**
    *   While reduced from its peak, it remains a complex monolith handling task views, session views, and calendar logic.
    *   **Recommendation**: Continue decomposition into smaller sub-components (e.g., `TaskView`, `SessionView`).

*   **HIGH: `src/pages/NotesPage.jsx` (664 lines)**
    *   High complexity with mixed concerns (UI, state, filtering).
    *   **Recommendation**: Extract logic into custom hooks (e.g., `useNotesFilter`) and break down the UI.

*   **MEDIUM: `src/pages/CanvasPage.jsx` (594 lines)**
    *   Contains inline component `URLImage`.
    *   **Recommendation**: Extract `URLImage` to a separate file.

*   **MEDIUM: `src/components/DailyTimeline.jsx` (552 lines)**
    *   Complex component handling drag-and-drop and grid logic. Defines `GridSlot` and `SessionItem` inline.
    *   **Recommendation**: Extract helper components to separate files.

## 2. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider` inline.
*   **`src/pages/CanvasPage.jsx`**: Defines `URLImage` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
*   **`src/components/GlassCard.jsx`**: Defines multiple components (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in one file. While acceptable for a UI library, it technically violates the one-component-per-file rule.

## 3. Leftovers & Ghost Code
*   **Resolved**: The previously reported commented-out debug code in `src/features/Graph/components/GraphRenderer.jsx` has been removed.
*   **Clean**: No new active `console.log` or `debugger` statements found in the main codebase.
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals.

## 4. Recommendations
1.  **Refactor `LedgerPage.jsx` immediately**. It is the biggest offender and a maintenance risk.
2.  **Standardize Component Definitions**. Enforce one component per file to prevent files like `LedgerPage.jsx` from ballooning.
3.  **Monitor `NotesPage.jsx` and `ChronosModal.jsx`**. Plan for their decomposition in future sprints.
