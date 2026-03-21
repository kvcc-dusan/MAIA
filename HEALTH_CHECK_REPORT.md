# Codebase Health Check Report

## 1. Complexity Creep
The following files exceed 300 lines, suggesting they have grown significantly in complexity (deep nesting) and may require decomposition:
- `src/App.jsx` (374 lines)
- `src/components/ChronosModal.jsx` (688 lines)
- `src/components/DailyTimeline.jsx` (552 lines)
- `src/components/ProjectIcon.jsx` (309 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
- `src/features/Graph/pages/GraphPage.jsx` (307 lines)
- `src/pages/CanvasPage.jsx` (594 lines)
- `src/pages/LedgerPage.jsx` (1137 lines)
- `src/pages/NotesPage.jsx` (663 lines)

## 2. Leftovers
Found potential temporary artifacts:
- `src/utils/dummyData.js`: Contains a "TODO" comment within a string literal: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`.
- `src/pages/NotesPage_ModalSnippet.jsx`: This file appears to be a fragmented JSX snippet missing context and variable definitions (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`). It looks like a forgotten artifact.

## 3. Ghost Code
ESLint static analysis identified the following unused imports, variables, and parameters that static analysis might have missed previously:
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
Multiple component definitions were found inside single files (often inside page files instead of their own component files):
- `src/App.jsx`: Contains `AppContent` and `App`
- `src/components/GlassCard.jsx`: Contains `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`
- `src/components/ProjectIcon.jsx`: Contains `ProjectIcon` and `IconPicker`
- `src/features/Opus/components/KnowledgePanel.jsx`: Contains `KnowledgePanel` and `NoteRow`
- `src/pages/CanvasPage.jsx`: Contains `CanvasBoard` and `URLImage`
- `src/pages/LedgerPage.jsx`: Contains `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`, and `LedgerPage`
- `src/pages/JournalPage.jsx`: Contains `JournalHistoryList`
- `src/components/ui/dock.jsx`: Contains `DesktopDock`, `MobileTabBar`
- `src/components/WorldMapWidget.jsx`: Contains `MapVisual`
