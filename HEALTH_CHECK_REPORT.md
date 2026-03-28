# Codebase Health Check Report

**Date**: 2026-03-28
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines) and may exhibit deep nesting, requiring attention:

*   **`src/pages/LedgerPage.jsx`** (1137 lines)
*   **`src/components/ChronosModal.jsx`** (688 lines)
*   **`src/pages/NotesPage.jsx`** (663 lines)
*   **`src/pages/CanvasPage.jsx`** (594 lines)
*   **`src/components/DailyTimeline.jsx`** (552 lines)
*   **`src/App.jsx`** (374 lines)
*   **`src/features/Graph/components/GraphRenderer.jsx`** (317 lines)
*   **`src/components/ProjectIcon.jsx`** (309 lines)
*   **`src/features/Graph/pages/GraphPage.jsx`** (307 lines)

**Recommendation**: Decompose these large files into smaller, more manageable sub-components or extract logic into custom hooks.

## 2. Leftovers
*   No actionable `console.log` or `debugger` statements found.
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals for sample data.

## 3. Ghost Code
ESLint static analysis identified several instances of unused imports, variables, and functions.

Notable unused items:
*   `ensurePermission` in `src/App.jsx`
*   `handleOpenLedger` in `src/App.jsx`
*   `fireEvent`, `waitFor` in `src/components/ChronosModal.test.jsx`
*   `onOpenPulse` in `src/components/FocusWidget.jsx`
*   `motion` in various UI components (`CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`)
*   `parseContentMeta` in `src/context/DataContext.jsx`
*   `showSignals`, `setShowSignals` in `src/features/Graph/components/GraphControls.jsx`
*   `ledger`, `reminders`, `updateNote` in `src/pages/HomePage.jsx`
*   `onOpenLedger` in `src/pages/JournalPage.jsx`
*   `notes`, `setNotes`, `pushToast` in `src/pages/ProjectsPage.jsx`

**Recommendation**: Remove these unused variables, functions, and imports to declutter the codebase.

## 4. Structure Drift
New components are being defined outside the established structure (inline definitions within larger files):

*   **`src/pages/LedgerPage.jsx`**: Defines multiple significant components inline: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
*   **`src/pages/CanvasPage.jsx`**: Defines `URLImage` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` components inline.
*   **`src/App.jsx`**: Defines `AppContent` inline.

**Recommendation**: Move these inline components to their own files, either within `src/components/` or within the corresponding feature folder, to match the established project structure and promote reusability.
