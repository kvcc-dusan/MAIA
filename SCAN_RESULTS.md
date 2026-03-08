# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (1137 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
    *   **Recommendation**: Decompose into smaller sub-components.

*   **HIGH: `src/components/ChronosModal.jsx` (688 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
    *   **Recommendation**: Decompose into smaller sub-components.

*   **MEDIUM: `src/pages/NotesPage.jsx` (663 lines), `src/pages/CanvasPage.jsx` (594 lines) & `src/components/DailyTimeline.jsx` (552 lines)**
    *   Accumulating substantial logic.
    *   **Recommendation**: Consider refactoring layout and logic into separate hooks/components.

## 2. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines multiple inline components (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
*   **`src/pages/NotesPage.jsx`**: Defines `NotesOverview` inline.
*   **`src/pages/CanvasPage.jsx`**: Defines `CanvasBoard` and `URLImage` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
*   **`src/components/GlassCard.jsx`**: Contains `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea` which are UI components that could belong in `src/components/ui/`.

## 3. Leftovers
*   **False Positive**: `src/utils/dummyData.js` contains a "TODO" inside a string literal for sample data.
*   No active `console.log` or `debugger` statements left as leftovers.

## 4. Ghost Code
ESLint reported unused variables and imports in the following files:

*   `ensurePermission` and `handleOpenLedger` in `src/App.jsx`
*   `fireEvent` and `waitFor` in `src/components/ChronosModal.test.jsx`
*   `onOpenPulse` in `src/components/FocusWidget.jsx`
*   `motion` in multiple components (`src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`)
*   `parseContentMeta` in `src/context/DataContext.jsx`
*   `showSignals`, `setShowSignals` in `src/features/Graph/components/GraphControls.jsx`
*   `cn`, `total` in `src/features/Ledger/components/OutcomeDistribution.jsx`
*   `showPromote` in `src/features/Opus/components/ExecutionPanel.jsx`
*   `taskId` in `src/features/Opus/components/ProjectResume.jsx`
*   `e` in `src/features/Opus/components/ResourcesPanel.jsx`
*   `idx` in `src/features/Opus/components/TimelinePanel.jsx`
*   `excludeId` in `src/lib/time.js`
*   `ledger`, `reminders`, `updateNote` in `src/pages/HomePage.jsx`
*   `onOpenLedger` in `src/pages/JournalPage.jsx`
*   `notes`, `setNotes`, `pushToast` in `src/pages/ProjectsPage.jsx`