# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention (more than 300 lines or high cyclomatic complexity):

*   **CRITICAL: `src/components/ChronosModal.jsx` (~688 lines)**
    *   This component remains a complex monolith handling task views, session views, and calendar logic.
    *   **Recommendation**: Continue decomposing into smaller sub-components and extract logic into custom hooks.
*   **CRITICAL: `src/pages/LedgerPage.jsx` (~1137 lines)**
    *   Significant complexity creep. Defines multiple modals and significant components inline.
    *   **Recommendation**: Move these components to `src/features/Ledger/components/` to match the project structure.
*   **HIGH: `src/pages/NotesPage.jsx` (~663 lines)**
    *   Accumulating substantial logic. Defines inline components.
    *   **Recommendation**: Refactor layout and logic into separate components/hooks.
*   **HIGH: `src/pages/CanvasPage.jsx` (~594 lines)**
    *   Flagged for complexity. Defines inline components.
    *   **Recommendation**: Refactor layout and logic into separate components/hooks.
*   **MEDIUM: `src/components/DailyTimeline.jsx` (~552 lines)**
    *   High line count.
    *   **Recommendation**: Extract inline components.
*   **MEDIUM: `src/App.jsx` (~374 lines)**
    *   High line count, combining routing, provider setup and layout logic.
*   **MEDIUM: `src/components/ProjectIcon.jsx` (~309 lines)**
*   **MEDIUM: `src/features/Graph/components/GraphRenderer.jsx` (~318 lines)**
*   **MEDIUM: `src/features/Graph/pages/GraphPage.jsx` (~308 lines)**

## 2. Structure Drift
New components are being defined outside the established structure (inline instead of separate files):

*   **`src/pages/LedgerPage.jsx`**: Defines 9 inline components (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
*   **`src/pages/CanvasPage.jsx`**: Defines 2 inline components (`CanvasBoard`, `URLImage`).
*   **`src/pages/NotesPage.jsx`**: Defines inline component `NotesOverview`.
*   **`src/components/DailyTimeline.jsx`**: Defines inline components `GridSlot` and `SessionItem`.
*   **`src/pages/JournalPage.jsx`**: Defines inline component `JournalHistoryList` alongside `Journal`.
*   **`src/App.jsx`**: Defines inline component `AppContent`.

## 3. Leftovers & Ghost Code
*   **Ghost Code**: Over 20 instances of unused imports and variables across multiple files, identified by ESLint (e.g., `motion` in UI components, unused functions like `handleOpenLedger` in `App.jsx`, etc.).
*   **Leftovers**: `src/utils/dummyData.js` contains a "TODO" string literal as sample data (a false positive, but noted for completeness). No active `console.log` or `debugger` statements were found in the source code.
*   **Fixed**: Deleted orphaned artifact `src/pages/NotesPage_ModalSnippet.jsx` which was causing `no-undef` linting errors.

## 4. Recommendations
1.  **Prioritize decomposing `ChronosModal.jsx` and `LedgerPage.jsx`**.
2.  **Refactor inline components**. Move the inline components found in pages and large components to their respective feature or shared component directories.
3.  **Clean up ghost code**. Remove unused variables and imports flagged by ESLint.
