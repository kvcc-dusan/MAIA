# Codebase Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity, exceeding 300 lines of code:
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
- **TODO comments**: `src/utils/dummyData.js:46` contains a dummy TODO string (`"TODO:
- [ ] Fix bug
- [ ] Deploy to prod"`) that looks like placeholder data.
- **Console.logs**: `src/hooks/useLocalStorage.js`, `src/hooks/useWeather.js`, `src/utils/notify.js`, `src/components/WorldMapWidget.jsx`, and `src/components/GlassErrorBoundary.jsx` contain `console.error` and `console.warn` statements. (No rogue `console.log` or `debugger` statements found).

## 3. Ghost Code
Unused imports, variables, and functions identified by static analysis:
- `src/App.jsx`: `ensurePermission` is imported but unused; `handleOpenLedger` is defined but never used.
- `src/pages/NotesPage_ModalSnippet.jsx`: Unused snippet file leftover from refactoring. References several undefined variables (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`).
- `src/components/ChronosModal.test.jsx`: `fireEvent` and `waitFor` are imported but never used.
- `src/components/FocusWidget.jsx`: `onOpenPulse` is defined but never used.
- `src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`: `motion` is imported but never used.
- `src/context/DataContext.jsx`: `parseContentMeta` is imported but never used.
- `src/features/Graph/components/GraphControls.jsx`: `showSignals` and `setShowSignals` are defined but never used.
- `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn` and `total` are defined but never used.
- `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote` is assigned a value but never used.
- `src/features/Opus/components/ProjectResume.jsx`: `taskId` is assigned a value but never used.
- `src/features/Opus/components/ResourcesPanel.jsx`: `e` is defined but never used.
- `src/features/Opus/components/TimelinePanel.jsx`: `idx` is defined but never used.
- `src/lib/time.js`: `excludeId` is assigned a value but never used.
- `src/pages/HomePage.jsx`: `ledger`, `reminders`, and `updateNote` are defined but never used.
- `src/pages/JournalPage.jsx`: `onOpenLedger` is defined but never used.
- `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, and `pushToast` are defined but never used.

## 4. Structure Drift
Components are being created outside the established project structure (inline inside pages instead of their own files in `src/components/`):
- `src/pages/LedgerPage.jsx` defines multiple inline components: `CloseButton`, `ConfirmModal`, `DecisionCard`, `DecisionDetailModal`, `NewDecisionModal`, `RenameModal`, `ReviewModal`, and `SectionDivider`.
- `src/pages/NotesPage.jsx` defines inline component: `NotesOverview`.
- `src/pages/CanvasPage.jsx` defines inline components: `CanvasBoard` and `URLImage`.
- `src/components/DailyTimeline.jsx` defines inline components: `GridSlot` and `SessionItem`.
