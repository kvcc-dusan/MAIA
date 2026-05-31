# Codebase Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines) and may have highly nested functions or creeping scopes:
* `src/pages/LedgerPage.jsx` (1137 lines)
* `src/components/ChronosModal.jsx` (688 lines)
* `src/pages/NotesPage.jsx` (663 lines)
* `src/pages/CanvasPage.jsx` (594 lines)
* `src/components/DailyTimeline.jsx` (552 lines)
* `src/App.jsx` (374 lines)
* `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
* `src/components/ProjectIcon.jsx` (309 lines)
* `src/features/Graph/pages/GraphPage.jsx` (307 lines)

## 2. Leftovers
* `src/utils/dummyData.js` line 46: A `TODO` string literal exists (`"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`). This appears to be sample text rather than an active codebase TODO.
* No `console.log` or `debugger` statements were found that indicate temporary debugging leftovers. Expected usage like `console.error` and `console.warn` exist in error boundaries and catch blocks.

## 3. Ghost Code
ESLint static analysis identified the following unused variables, imports, or functions that may contribute to clutter:
* `src/App.jsx`: Unused function `ensurePermission`, unused variable `handleOpenLedger`.
* `src/components/ChronosModal.test.jsx`: Unused variables `fireEvent`, `waitFor`.
* `src/components/FocusWidget.jsx`: Unused variable `onOpenPulse`.
* `src/components/ui/CustomSelect.jsx`: Unused import `motion`.
* `src/components/ui/DateTimePicker.jsx`: Unused import `motion`.
* `src/components/ui/PillSelect.jsx`: Unused import `motion`.
* `src/components/ui/dock.jsx`: Unused import `motion`.
* `src/context/DataContext.jsx`: Unused import `parseContentMeta`.
* `src/features/Graph/components/GraphControls.jsx`: Unused variables `showSignals`, `setShowSignals`.
* `src/features/Ledger/components/OutcomeDistribution.jsx`: Unused import `cn`, unused variable `total`.
* `src/features/Opus/components/ExecutionPanel.jsx`: Unused variable `showPromote`.
* `src/features/Opus/components/ProjectResume.jsx`: Unused variable `taskId`.
* `src/features/Opus/components/ResourcesPanel.jsx`: Unused variable `e`.
* `src/features/Opus/components/TimelinePanel.jsx`: Unused variable `idx`.
* `src/lib/time.js`: Unused variable `excludeId`.
* `src/pages/HomePage.jsx`: Unused variables `ledger`, `reminders`, `updateNote`.
* `src/pages/JournalPage.jsx`: Unused variable `onOpenLedger`.
* `src/pages/ProjectsPage.jsx`: Unused variables `notes`, `setNotes`, `pushToast`.

## 4. Structure Drift
The following files define inline components instead of locating them in their own dedicated component files, violating the established project structure:
* `src/pages/LedgerPage.jsx`: Defines multiple inline components including `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
* `src/pages/NotesPage.jsx`: Defines `PIN` and `NotesOverview` inline.
* `src/components/DailyTimeline.jsx`: Defines `GridSlot` and `SessionItem` inline.
* `src/pages/CanvasPage.jsx`: Defines `URLImage` and `CanvasBoard` inline.
* `src/App.jsx`: Defines `AppContent` inline.

*(Note: The orphaned file `src/pages/NotesPage_ModalSnippet.jsx` was deleted as a trivial fix as it was an incomplete component snippet missing dependencies).*
