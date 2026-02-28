# Health Check Report

This report summarizes the codebase health issues found during the scan regarding Complexity Creep, Structure Drift, and Ghost Code.

## 1. Complexity Creep
Several files have grown significantly in line count and complexity, indicating a need for refactoring and decomposition:
- `src/pages/LedgerPage.jsx`: ~1137 lines. It is a massive monolith.
- `src/components/ChronosModal.jsx`: ~688 lines. Remains highly complex.
- `src/pages/NotesPage.jsx`: ~663 lines.
- `src/pages/CanvasPage.jsx`: ~594 lines.
- `src/components/DailyTimeline.jsx`: ~552 lines.

## 2. Structure Drift
New components are being defined inside page or component files rather than in their own standalone files within the `src/components` or `src/features` directories:
- **`src/pages/LedgerPage.jsx`**: Defines multiple inline components including `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
- **`src/pages/NotesPage.jsx`**: Defines the `NotesOverview` component inside it, rather than just exporting the page default.
- **`src/pages/CanvasPage.jsx`**: Defines the `URLImage` component inline.
- **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` components inline.

## 3. Ghost Code (Unused Imports & Variables)
Static analysis (ESLint) identified the following unused variables and imports, which should be cleaned up:
- **`src/App.jsx`**: `ensurePermission`, `handleOpenLedger`
- **`src/components/FocusWidget.jsx`**: `onOpenPulse`
- **`src/context/DataContext.jsx`**: `parseContentMeta`
- **`src/features/Graph/components/GraphControls.jsx`**: `showSignals`, `setShowSignals`
- **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn`, `total`
- **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote`
- **`src/features/Opus/components/ProjectResume.jsx`**: `taskId`
- **`src/features/Opus/components/ResourcesPanel.jsx`**: `e`
- **`src/features/Opus/components/TimelinePanel.jsx`**: `idx`
- **`src/lib/time.js`**: `excludeId`
- **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, `updateNote`
- **`src/pages/JournalPage.jsx`**: `onOpenLedger`
- **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, `pushToast`
- **Multiple UI Components (`CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`)**: Import `motion` but never use it.

## 4. Leftovers Cleaned Up
- The `// TODO` comment that was likely a temporary artifact in `src/utils/dummyData.js` has been removed.
- The `src/pages/NotesPage_ModalSnippet.jsx` file, an abandoned snippet file outside the normal structure, has been deleted.