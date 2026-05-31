# Codebase Health Scan Report

## 1. Complexity Creep
The following files have grown significantly in complexity (> 300 lines) or exhibit deep nesting/high cyclomatic complexity:
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
- A `TODO` comment was found in `src/utils/dummyData.js`, however, this appears to be part of dummy data content rather than an actionable codebase TODO.
  - `src/utils/dummyData.js:46:    "TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`
- No other obvious temporary `console.log` or `debugger` statements were found in `.js` or `.jsx` files through simple scanning. Note: there is a mention in memory that `GraphRenderer.jsx` contains commented-out debug code (`// console.log(...)`).

## 3. Ghost Code (Unused Imports, Variables, Functions)
ESLint analysis revealed 50 problems (38 errors, 12 warnings). Notable ghost code instances:
- `App.jsx`: `ensurePermission`, `handleOpenLedger` unused.
- `ChronosModal.test.jsx`: `fireEvent`, `waitFor` unused.
- `FocusWidget.jsx`: `onOpenPulse` unused.
- `ui/CustomSelect.jsx`, `ui/DateTimePicker.jsx`, `ui/PillSelect.jsx`, `ui/dock.jsx`: `motion` unused.
- `context/DataContext.jsx`: `parseContentMeta` unused.
- `features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals` unused.
- `features/Ledger/components/OutcomeDistribution.jsx`: `cn`, `total` unused.
- `features/Opus/components/ExecutionPanel.jsx`: `showPromote` unused.
- `features/Opus/components/ProjectResume.jsx`: `taskId` unused.
- `features/Opus/components/ResourcesPanel.jsx`: `e` unused.
- `features/Opus/components/TimelinePanel.jsx`: `idx` unused.
- `lib/time.js`: `excludeId` unused.
- `pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote` unused.
- `pages/JournalPage.jsx`: `onOpenLedger` unused.
- `pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast` unused.
- `pages/NotesPage_ModalSnippet.jsx`: numerous undefined variables indicating it's a fragmented snippet.

## 4. Structure Drift
Multiple page components define inner/sub-components inline instead of placing them in their own files under `src/components/` or `src/features/`:
- `src/pages/LedgerPage.jsx` defines numerous inline components including `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
- `src/pages/NotesPage.jsx` defines `NotesOverview` inline.
- `src/pages/CanvasPage.jsx` defines `URLImage`, `CanvasBoard` inline.
- `src/App.jsx` defines `AppContent` inline.
- `src/components/DailyTimeline.jsx` defines `DailyTimeline` inline alongside others (like `GridSlot` and `SessionItem` mentioned in memory).
