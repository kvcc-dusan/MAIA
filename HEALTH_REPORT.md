# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/components/ChronosModal.jsx` (1911 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
    *   **Recommendation**: Decompose into smaller sub-components (e.g., `TaskView`, `SessionView`, `CalendarView`) and extract logic into custom hooks (`useChronosState`).

*   **HIGH: `src/pages/LedgerPage.jsx` (912 lines)**
    *   Defines multiple significant components inline (`NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`).
    *   **Recommendation**: Move these components to `src/features/Ledger/components/` to match the project structure.

*   **MEDIUM: `src/pages/NotesPage.jsx` (624 lines) & `src/pages/CanvasPage.jsx` (588 lines)**
    *   Accumulating substantial logic.
    *   **Recommendation**: Consider refactoring layout and logic into separate hooks/components.

## 2. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: As noted above, this file acts as a module definition rather than just a page view.
*   **`src/components/GlassCard.jsx`**: Defines `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`. While acceptable as a UI library file, consider renaming to `src/components/ui/glass.jsx` to reflect it is a collection of primitives.

## 3. Leftovers & Ghost Code
*   **Fixed**: Removed active `console.log` in `src/features/Graph/pages/GraphPage.jsx`.
*   **Fixed**: Removed unused `MousePointer2` import in `src/pages/LedgerPage.jsx`.
*   **Warning**: `src/features/Graph/components/GraphRenderer.jsx` contains commented-out debug code (`// console.log(...)`).
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals for sample data.

## 4. Recommendations
1.  **Prioritize decomposing `ChronosModal.jsx`**. It is likely a source of bugs and performance issues due to its size.
2.  **Refactor `LedgerPage.jsx`**. Move the inline modals and cards to the `src/features/Ledger/` directory.
3.  **Enforce Linting**. Ensure unused imports are caught by CI/CD pipelines.
