# Codebase Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines), which may indicate they are handling too many concerns and need to be refactored or broken down into smaller components:
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
- No temporary `console.log` or `debugger` statements found.
- One leftover "TODO" in a string literal found inside `src/utils/dummyData.js:46` (false positive for real code TODOs).

## 3. Ghost Code
Ghost code contributes to codebase clutter. Static analysis (`eslint`) found the following unused variables/imports (`no-unused-vars`):

- **src/App.jsx**: `ensurePermission`, `handleOpenLedger`
- **src/components/ChronosModal.test.jsx**: `fireEvent`, `waitFor`
- **src/components/FocusWidget.jsx**: `onOpenPulse`
- **src/components/ui/CustomSelect.jsx**: `motion`
- **src/components/ui/DateTimePicker.jsx**: `motion`
- **src/components/ui/PillSelect.jsx**: `motion`
- **src/components/ui/dock.jsx**: `motion`
- **src/context/DataContext.jsx**: `parseContentMeta`
- **src/features/Graph/components/GraphControls.jsx**: `showSignals`, `setShowSignals`
- **src/features/Ledger/components/OutcomeDistribution.jsx**: `cn`, `total`
- **src/features/Opus/components/ExecutionPanel.jsx**: `showPromote`
- **src/features/Opus/components/ProjectResume.jsx**: `taskId`
- **src/features/Opus/components/ResourcesPanel.jsx**: `e`
- **src/features/Opus/components/TimelinePanel.jsx**: `idx`
- **src/lib/time.js**: `excludeId`
- **src/pages/HomePage.jsx**: `ledger`, `reminders`, `updateNote`
- **src/pages/JournalPage.jsx**: `onOpenLedger`
- **src/pages/ProjectsPage.jsx**: `notes`, `setNotes`, `pushToast`

## 4. Structure Drift
Several components are defined inline within page or other component files instead of being modularized into their own separate files (e.g. `src/components/` or a feature folder).

- **src/pages/LedgerPage.jsx** defines multiple inline components:
  - `CloseButton`
  - `ConfirmModal`
  - `RenameModal`
  - `NewDecisionModal`
  - `ReviewModal`
  - `DecisionDetailModal`
  - `DecisionCard`
  - `SectionDivider`

- **src/pages/CanvasPage.jsx** defines inline component:
  - `URLImage`
  - `CanvasBoard`

- **src/App.jsx** defines inline component:
  - `AppContent`

- **src/components/DailyTimeline.jsx** defines inline components:
  - `GridSlot`
  - `SessionItem`

- **src/pages/NotesPage.jsx**:
  - `NotesOverview`
