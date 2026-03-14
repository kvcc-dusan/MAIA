# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity (> 300 lines) and require attention:

*   **`src/pages/LedgerPage.jsx` (1137 lines)**: Huge monolith mixing UI, state management, and inline components.
*   **`src/components/ChronosModal.jsx` (688 lines)**: Extremely complex modal that needs splitting.
*   **`src/pages/NotesPage.jsx` (663 lines)**: Becoming complex, mixing list and details logic.
*   **`src/pages/CanvasPage.jsx` (594 lines)**: Significant logic accumulation.
*   **`src/components/DailyTimeline.jsx` (552 lines)**: High complexity logic and drag/drop management.
*   **`src/App.jsx` (374 lines)**: Growing size, managing too many global concerns.
*   **`src/features/Graph/components/GraphRenderer.jsx` (317 lines)**: High complexity graph drawing logic.
*   **`src/features/Graph/pages/GraphPage.jsx` (307 lines)**: Accumulating logic over standard component size.
*   **`src/components/ProjectIcon.jsx` (309 lines)**: Excessive complexity for an icon component.

## 2. Leftovers
*   No active `console.log` or `debugger` statements were found in the `src/` directory.
*   **False Positive**: `src/utils/dummyData.js` contains `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"` which is sample user content, not an actual codebase TODO.

## 3. Ghost Code (Unused imports/variables)
Static analysis (`eslint`) found multiple instances of ghost code:

*   `src/App.jsx`: Unused variable `ensurePermission`, `handleOpenLedger`.
*   `src/components/ChronosModal.test.jsx`: Unused imports `fireEvent`, `waitFor`.
*   `src/components/FocusWidget.jsx`: Unused variable `onOpenPulse`.
*   `src/components/ui/CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`: Unused import `motion`.
*   `src/context/DataContext.jsx`: Unused import `parseContentMeta`.
*   `src/features/Graph/components/GraphControls.jsx`: Unused variables `showSignals`, `setShowSignals`.
*   `src/features/Ledger/components/OutcomeDistribution.jsx`: Unused imports `cn`, `total`.
*   `src/features/Opus/components/ExecutionPanel.jsx`: Unused variable `showPromote`.
*   `src/features/Opus/components/ProjectResume.jsx`: Unused variable `taskId`.
*   `src/features/Opus/components/ResourcesPanel.jsx`: Unused variable `e`.
*   `src/features/Opus/components/TimelinePanel.jsx`: Unused variable `idx`.
*   `src/lib/time.js`: Unused variable `excludeId`.
*   `src/pages/HomePage.jsx`: Unused variables `ledger`, `reminders`, `updateNote`.
*   `src/pages/JournalPage.jsx`: Unused variable `onOpenLedger`.
*   `src/pages/ProjectsPage.jsx`: Unused variables `notes`, `setNotes`, `pushToast`.
*   `src/pages/NotesPage_ModalSnippet.jsx`: Several undefined variables used, looks like an orphaned snippet file.

## 4. Structure Drift
New components are being defined inline within other files rather than following the established project structure:

*   **`src/pages/LedgerPage.jsx`**: Defines multiple inline components (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`). These should ideally be moved to `src/features/Ledger/components/`.
*   **`src/pages/CanvasPage.jsx`**: Defines `CanvasBoard` and `URLImage` inline.
*   **`src/pages/NotesPage.jsx`**: Defines `NotesOverview` inline.

## Recommendations
1.  **Decompose complex files**: `LedgerPage.jsx` and `ChronosModal.jsx` are critical priorities for refactoring.
2.  **Extract inline components**: Move inline components from pages to their own dedicated files within the relevant feature folders.
3.  **Clean up ghost code**: Remove all unused variables and imports highlighted by the ESLint report to reduce clutter.
4.  **Remove orphaned files**: Delete `src/pages/NotesPage_ModalSnippet.jsx` as it contains syntax errors and appears unused.