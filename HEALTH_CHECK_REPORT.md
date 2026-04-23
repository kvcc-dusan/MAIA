# Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity, exceeding 300 lines:
- `src/pages/LedgerPage.jsx` (1137 lines)
- `src/components/ChronosModal.jsx` (688 lines)
- `src/pages/NotesPage.jsx` (663 lines)
- `src/pages/CanvasPage.jsx` (594 lines)
- `src/components/DailyTimeline.jsx` (552 lines)
- `src/App.jsx` (374 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
- `src/components/ProjectIcon.jsx` (309 lines)
- `src/features/Graph/pages/GraphPage.jsx` (307 lines)

## 2. Leftovers
- `src/utils/dummyData.js`: Contains a leftover TODO comment (`"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`).

## 3. Ghost Code (Unused Imports/Variables)
- `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
- `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`
- `src/components/FocusWidget.jsx`: `onOpenPulse`
- `src/components/ui/CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`: `motion`
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
- `src/pages/LedgerPage.jsx`: Defines multiple components inline (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
- `src/pages/NotesPage.jsx`: Defines `PIN` and `NotesOverview` inline.
- `src/pages/CanvasPage.jsx`: Defines `URLImage` and `CanvasBoard` inline.
- `src/components/DailyTimeline.jsx`: Defines `GridSlot` and `SessionItem` inline.
- `src/App.jsx`: Defines `AppContent` inline.
- `src/components/GlassCard.jsx`: Groups multiple components (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`).
- `src/pages/NotesPage_ModalSnippet.jsx`: Fragmented/orphaned component snippet.
- `src/components/ProjectIcon.jsx`: Exporting non-components (`resolveColor`) preventing React fast refresh.
- `src/features/Opus/components/ProjectVitality.jsx`: Exporting non-components (`useProjectVitality`) preventing React fast refresh.
