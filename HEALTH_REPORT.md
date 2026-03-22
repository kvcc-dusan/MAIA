# Codebase Health Check Report

## 1. Complexity Creep
The following files exhibit significant complexity, deep nesting, or high length:
* `src/pages/LedgerPage.jsx` (1137 lines) - Severe structure drift, defining multiple inline components (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
* `src/components/ChronosModal.jsx` (688 lines) - A complex monolith handling task views, session views, and calendar logic, requiring further decomposition.
* `src/pages/NotesPage.jsx` (663 lines) - Structure drift by defining `PIN` and `NotesOverview` components inline.
* `src/pages/CanvasPage.jsx` (594 lines) - Flagged for complexity and structure drift, containing inline components like `URLImage` and `CanvasBoard`.
* `src/components/DailyTimeline.jsx` (552 lines) - Structure drift by defining `GridSlot` and `SessionItem` components inline.
* `src/App.jsx` (374 lines) - Structure drift by defining the `AppContent` component inline.

## 2. Leftovers
* `src/utils/dummyData.js` (line 46) - Contains a `"TODO:
- [ ] Fix bug
- [ ] Deploy to prod"` inside a string literal (which might be a false positive, but should be flagged).
* `src/features/Graph/components/GraphRenderer.jsx` - Memory indicates it contains commented-out debug code (`// console.log(...)`).
* `src/pages/NotesPage_ModalSnippet.jsx` - Identified as an orphaned artifact (fragmented JSX snippet) and flagged as a leftover.

## 3. Ghost Code
Unused imports, variables, or functions caught by static analysis (ESLint):
* `src/App.jsx`: `ensurePermission` (line 5), `handleOpenLedger` (line 153)
* `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor` (line 2)
* `src/components/FocusWidget.jsx`: `onOpenPulse` (line 14)
* `src/components/ui/CustomSelect.jsx`: `motion` (line 4)
* `src/components/ui/DateTimePicker.jsx`: `motion` (line 4)
* `src/components/ui/PillSelect.jsx`: `motion` (line 4)
* `src/components/ui/dock.jsx`: `motion` (line 2)
* `src/context/DataContext.jsx`: `parseContentMeta` (line 4)
* `src/features/Graph/components/GraphControls.jsx`: `showSignals` (line 28), `setShowSignals` (line 29)
* `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn` (line 3), `total` (line 7)
* `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote` (line 57)
* `src/features/Opus/components/ProjectResume.jsx`: `taskId` (line 38)
* `src/features/Opus/components/ResourcesPanel.jsx`: `e` (line 30)
* `src/features/Opus/components/TimelinePanel.jsx`: `idx` (line 59)
* `src/lib/time.js`: `excludeId` (line 23)
* `src/pages/HomePage.jsx`: `ledger` (line 19), `reminders` (line 21), `updateNote` (line 23)
* `src/pages/JournalPage.jsx`: `onOpenLedger` (line 32)
* `src/pages/ProjectsPage.jsx`: `notes` (line 30), `setNotes` (line 33), `pushToast` (line 36)

## 4. Structure Drift
New components defined outside the established structure (inline inside page/feature files):
* `src/pages/LedgerPage.jsx`: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider` inline.
* `src/pages/NotesPage.jsx`: Defines `PIN` and `NotesOverview` inline.
* `src/components/DailyTimeline.jsx`: Defines `GridSlot` and `SessionItem` inline.
* `src/pages/CanvasPage.jsx`: Defines `URLImage` and `CanvasBoard` inline.
* `src/App.jsx`: Defines `AppContent` inline.
* `src/components/GlassCard.jsx`: Groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of individual files in `src/components/ui/`.
* `src/components/NewDecisionModal.jsx` vs inline version in `src/pages/LedgerPage.jsx` (duplicated logic).
* `src/components/ReviewModal.jsx` vs inline version in `src/pages/LedgerPage.jsx` (duplicated logic).
