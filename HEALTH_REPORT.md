# Codebase Health Report

**Date**: 2026-04-04
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (1137 lines)**
    *   This component is too large and defines multiple modals and sub-components inline.
*   **HIGH: `src/components/ChronosModal.jsx` (688 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
*   **MEDIUM: `src/pages/NotesPage.jsx` (663 lines) & `src/pages/CanvasPage.jsx` (594 lines)**
    *   Accumulating substantial logic and structure drift.
*   **MEDIUM: `src/components/DailyTimeline.jsx` (552 lines)**
    *   Grown significantly in complexity.

## 2. Leftovers
*   **Resolved**: No `console.log` or `debugger` statements found in the source code.
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals for sample data.

## 3. Ghost Code
Unused variables and imports detected by ESLint:
*   `src/context/DataContext.jsx`: 'parseContentMeta'
*   `src/features/Graph/components/GraphControls.jsx`: 'showSignals', 'setShowSignals'
*   `src/features/Ledger/components/OutcomeDistribution.jsx`: 'cn', 'total'
*   `src/features/Opus/components/ExecutionPanel.jsx`: 'showPromote'
*   `src/features/Opus/components/ProjectResume.jsx`: 'taskId'
*   `src/features/Opus/components/ResourcesPanel.jsx`: 'e'
*   `src/features/Opus/components/TimelinePanel.jsx`: 'idx'
*   `src/lib/time.js`: 'excludeId'
*   `src/pages/HomePage.jsx`: 'ledger', 'reminders', 'updateNote'
*   `src/pages/JournalPage.jsx`: 'onOpenLedger'
*   `src/pages/ProjectsPage.jsx`: 'notes', 'setNotes', 'pushToast'

## 4. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines multiple significant components inline (`NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `ConfirmModal`, `RenameModal`, `CloseButton`, `SectionDivider`).
*   **`src/pages/NotesPage.jsx`**: Defines inline components.
*   **`src/pages/CanvasPage.jsx`**: Defines inline components (`URLImage`, `CanvasBoard`).
*   **`src/components/DailyTimeline.jsx`**: Defines inline components (`GridSlot`, `SessionItem`).
*   **Orphan File**: `src/pages/NotesPage_ModalSnippet.jsx` appears to be an orphaned snippet file.

## 5. Recommendations
1.  **Prioritize decomposing `LedgerPage.jsx` and `ChronosModal.jsx`**.
2.  **Clean up ghost code** identified by ESLint.
3.  **Refactor inline components** in `CanvasPage.jsx`, `NotesPage.jsx`, and `DailyTimeline.jsx` to their own files.
4.  **Remove orphaned snippet** `src/pages/NotesPage_ModalSnippet.jsx`.
