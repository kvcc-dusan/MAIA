# Codebase Health Check Report

## 1. Complexity Creep (>300 lines)
- `src/App.jsx` (374 lines)
- `src/components/ChronosModal.jsx` (688 lines)
- `src/components/DailyTimeline.jsx` (552 lines)
- `src/components/ProjectIcon.jsx` (309 lines)
- `src/pages/NotesPage.jsx` (663 lines)
- `src/pages/CanvasPage.jsx` (594 lines)
- `src/pages/LedgerPage.jsx` (1137 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
- `src/features/Graph/pages/GraphPage.jsx` (307 lines)


## 2. Leftovers
No leftover `console.log`, `debugger`, or temporary `TODO` comments were identified in the source files, except for known sample data in `src/utils/dummyData.js` (which is excluded from this report per guidelines).


## 3. Ghost Code (Unused Variables/Imports)
- `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
- `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`
- `src/components/FocusWidget.jsx`: `onOpenPulse`
- `src/components/ui/CustomSelect.jsx`: `motion`
- `src/components/ui/DateTimePicker.jsx`: `motion`
- `src/components/ui/PillSelect.jsx`: `motion`
- `src/components/ui/dock.jsx`: `motion`
- `src/context/DataContext.jsx`: `parseContentMeta`
- `src/features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals`
- `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn`, `total`
- `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote`
- `src/features/Opus/components/ProjectResume.jsx`: `taskId`
- `src/features/Opus/components/ResourcesPanel.jsx`: `e`
- `src/features/Opus/components/TimelinePanel.jsx`: `idx`
- `src/lib/time.js`: `excludeId`
- `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`
- `src/pages/JournalPage.jsx`: `onOpenLedger`
- `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`


## 4. Structure Drift
Several files define multiple React components inline, rather than in their own dedicated files:
- `src/App.jsx`: Defines `AppContent` (and conditionally lazy-loads `GraphPage`, `CanvasPage`) inline.
- `src/components/DailyTimeline.jsx`: Defines `GridSlot` and `SessionItem` components inline.
- `src/pages/CanvasPage.jsx`: Defines `CanvasBoard` and `URLImage` components inline.
- `src/pages/JournalPage.jsx`: Defines `JournalHistoryList` inline.
- `src/pages/LedgerPage.jsx`: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider` inline.
- `src/pages/NotesPage.jsx`: Defines `PIN` and `NotesOverview` inline.
