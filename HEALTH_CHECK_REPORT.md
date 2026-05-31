# Health Check Report

## 1. Complexity Creep
The following files exhibit signs of complexity creep due to high line count (over 300 lines) or deep nesting:
- `src/pages/LedgerPage.jsx` (1137 lines): Very high complexity, multiple inline components.
- `src/components/ChronosModal.jsx` (688 lines): Extremely large monolithic component handling various calendar/timeline logic.
- `src/pages/NotesPage.jsx` (663 lines): High line count, complex internal state.
- `src/pages/CanvasPage.jsx` (594 lines): Complex inline components (e.g., `CanvasBoard`).
- `src/components/DailyTimeline.jsx` (552 lines): Drag/drop logic and inline visualization components.
- `src/App.jsx` (374 lines): Main router/layout logic has grown quite large, defining `AppContent` inline.
- `src/features/Graph/components/GraphRenderer.jsx` (317 lines): D3 visualization complexity.
- `src/components/ProjectIcon.jsx` (309 lines): SVG monolithic component.
- `src/features/Graph/pages/GraphPage.jsx` (307 lines): Container page for graph visualization.

## 2. Leftovers
- **console.log**: None found.
- **debugger**: None found.
- **// TODO**: A `TODO` string literal was found in `src/utils/dummyData.js` at line 46: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`. This appears to be sample content/dummy data rather than an actual actionable task left by a developer, acting as a false positive.

## 3. Ghost Code (Unused imports/variables)
Static analysis (ESLint) surfaced multiple instances of unused variables and imports:
- `src/App.jsx`: `ensurePermission`, `handleOpenLedger`.
- `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`.
- `src/components/FocusWidget.jsx`: `onOpenPulse`.
- `src/components/ui/CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`: `motion` import.
- `src/context/DataContext.jsx`: `parseContentMeta`.
- `src/features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals`.
- `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn`, `total`.
- `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote`.
- `src/features/Opus/components/ProjectResume.jsx`: `taskId`.
- `src/features/Opus/components/ResourcesPanel.jsx`: `e` (event parameter).
- `src/features/Opus/components/TimelinePanel.jsx`: `idx`.
- `src/lib/time.js`: `excludeId`.
- `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`.
- `src/pages/JournalPage.jsx`: `onOpenLedger`.
- `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`.

## 4. Structure Drift
Several files drift from the standard one-component-per-file project structure by nesting complex components inline:
- `src/pages/LedgerPage.jsx` (1137 lines) defines multiple full-fledged components inline: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
- `src/pages/NotesPage.jsx` (663 lines) defines `PIN` and `NotesOverview` components inline.
- `src/pages/CanvasPage.jsx` (594 lines) defines `URLImage` and `CanvasBoard` inline.
- `src/components/DailyTimeline.jsx` (552 lines) defines `GridSlot` and `SessionItem` inline.
- `src/App.jsx` (374 lines) defines `AppContent` inline instead of inside its own file or within the `src/components` layout folder.
- `src/components/GlassCard.jsx` (81 lines) groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) into a single file.
