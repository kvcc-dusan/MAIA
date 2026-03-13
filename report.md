# Health Check Report

## 1. Complexity Creep
- `src/pages/LedgerPage.jsx`: Over 1000 lines (1137 lines). Extremely large and likely very complex, handling too many concerns.
- `src/components/ChronosModal.jsx`: 688 lines. Complex monolith handling tasks, sessions, calendar, etc.
- `src/pages/NotesPage.jsx`: 663 lines. Very large for a page component.
- `src/pages/CanvasPage.jsx`: 594 lines. Very large.
- `src/components/DailyTimeline.jsx`: 552 lines. Very large.

## 2. Leftovers
- `src/utils/dummyData.js:46`: Contains a `TODO` string literal: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`.

## 3. Ghost Code (Unused imports, variables, functions)
ESLint caught several instances of ghost code:
- `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
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
- `src/pages/LedgerPage.jsx` has severe structure drift, defining many components inline (e.g. CloseButton, ConfirmModal, RenameModal, NewDecisionModal, ReviewModal, DecisionDetailModal, DecisionCard, SectionDivider).
- `src/pages/NotesPage.jsx` defines `PIN` and `NotesOverview` components inline.
- `src/components/DailyTimeline.jsx` defines `GridSlot` and `SessionItem` inline.
- `src/pages/CanvasPage.jsx` defines inline components like `URLImage` and `CanvasBoard`.
- `src/pages/NotesPage_ModalSnippet.jsx` is an orphaned artifact/dead code sitting in the pages directory.
