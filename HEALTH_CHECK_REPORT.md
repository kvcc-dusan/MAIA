# Codebase Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity, exhibiting high line counts (>300 lines) and/or deep nesting:
- `src/pages/LedgerPage.jsx` (~1137 lines)
- `src/components/ChronosModal.jsx` (~688 lines)
- `src/pages/NotesPage.jsx` (~663 lines)
- `src/pages/CanvasPage.jsx` (~594 lines)
- `src/components/DailyTimeline.jsx` (~552 lines)
- `src/App.jsx` (~374 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (~317 lines)
- `src/components/ProjectIcon.jsx` (~309 lines)
- `src/features/Graph/pages/GraphPage.jsx` (~307 lines)

## 2. Leftovers
Artifacts intended to be temporary (no `console.log` or `debugger` statements were found):
- `src/utils/dummyData.js`: Contains a "TODO" comment embedded in dummy data: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`

## 3. Ghost Code
Unused imports, variables, or functions identified by static analysis:
- `src/App.jsx`: Unused variables `ensurePermission`, `handleOpenLedger`.
- `src/components/FocusWidget.jsx`: Unused variable `onOpenPulse`.
- `src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`: Unused import `motion`.
- `src/context/DataContext.jsx`: Unused variable `parseContentMeta`.
- `src/features/Graph/components/GraphControls.jsx`: Unused variables `showSignals`, `setShowSignals`.
- `src/features/Ledger/components/OutcomeDistribution.jsx`: Unused variables `cn`, `total`.
- `src/features/Opus/components/ExecutionPanel.jsx`: Unused variable `showPromote`.
- `src/features/Opus/components/ProjectResume.jsx`: Unused variable `taskId`.
- `src/features/Opus/components/ResourcesPanel.jsx`: Unused variable `e`.
- `src/features/Opus/components/TimelinePanel.jsx`: Unused variable `idx`.
- `src/lib/time.js`: Unused variable `excludeId`.
- `src/pages/HomePage.jsx`: Unused variables `ledger`, `reminders`, `updateNote`.
- `src/pages/JournalPage.jsx`: Unused variable `onOpenLedger`.
- `src/pages/ProjectsPage.jsx`: Unused variables `notes`, `setNotes`, `pushToast`.
- `src/pages/NotesPage_ModalSnippet.jsx`: This file contains several undefined references indicating it is an orphaned snippet (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`).

## 4. Structure Drift
Components created outside the established project structure or other architectural drifts:
- `src/pages/LedgerPage.jsx`: Defines multiple inline components (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`).
- `src/pages/NotesPage.jsx`: Defines inline components (`PIN`, `NotesOverview`).
- `src/pages/CanvasPage.jsx`: Defines inline components (`URLImage`, `CanvasBoard`).
- `src/components/DailyTimeline.jsx`: Defines inline components (`GridSlot`, `SessionItem`).
- `src/App.jsx`: Defines an inline component `AppContent`.
- `src/components/GlassCard.jsx`: Groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of individual files under `src/components/ui/`.
- `src/components/ProjectIcon.jsx` and `src/features/Opus/components/ProjectVitality.jsx`: Mix constants/functions with component exports, breaking React Refresh rules.
