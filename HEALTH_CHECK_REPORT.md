# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (1137 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions. Defines multiple significant components inline.
*   **HIGH: `src/components/ChronosModal.jsx` (688 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
*   **HIGH: `src/pages/NotesPage.jsx` (663 lines)**
    *   Accumulating substantial logic.
*   **HIGH: `src/pages/CanvasPage.jsx` (594 lines)**
    *   Accumulating substantial logic.
*   **HIGH: `src/components/DailyTimeline.jsx` (552 lines)**
    *   Accumulating substantial logic.

## 2. Leftovers
*   `src/utils/dummyData.js` contains `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`.

## 3. Ghost Code
ESLint output indicates multiple unused variables/functions, including:
*   `ensurePermission` in `src/App.jsx`
*   `handleOpenLedger` in `src/App.jsx`
*   `showSignals` and `setShowSignals` in `src/features/Graph/components/GraphControls.jsx`
*   `showPromote` in `src/features/Opus/components/ExecutionPanel.jsx`
*   `taskId` in `src/features/Opus/components/ProjectResume.jsx`
*   `e` in `src/features/Opus/components/ResourcesPanel.jsx`
*   `idx` in `src/features/Opus/components/TimelinePanel.jsx`
*   `excludeId` in `src/lib/time.js`
*   `ledger` and `reminders` in `src/pages/HomePage.jsx`
*   `onOpenLedger` in `src/pages/JournalPage.jsx`
*   `notes`, `setNotes`, `pushToast` in `src/pages/ProjectsPage.jsx`

## 4. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines multiple significant components inline (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
*   **`src/pages/CanvasPage.jsx`**: Defines `URLImage` inline.
*   **`src/pages/NotesPage.jsx`**: Defines `NotesOverview` inline.

## 5. Recommendations
1.  **Prioritize decomposing `LedgerPage.jsx`, `ChronosModal.jsx`, `NotesPage.jsx`, `CanvasPage.jsx`, `DailyTimeline.jsx`**. They are likely a source of bugs and performance issues due to their size.
2.  **Refactor `LedgerPage.jsx`, `DailyTimeline.jsx`, `CanvasPage.jsx`, `NotesPage.jsx`**. Move the inline components to separate files to match the project structure.
3.  **Enforce Linting**. Fix ESLint warnings and errors to remove ghost code.
4.  **Remove Leftovers**. Remove `TODO` comments.
