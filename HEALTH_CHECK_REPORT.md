# Codebase Health Check Report

This report highlights areas of the codebase exhibiting signs of degradation, complexity creep, or "forgotten" artifacts based on a static analysis and health check scan.

## 1. Complexity Creep
The following files have grown significantly in complexity (e.g., extreme file length > 300 lines, deep nesting):

- **`src/pages/LedgerPage.jsx`**: ~1137 lines. Extremely high complexity and structure drift.
- **`src/components/ChronosModal.jsx`**: ~688 lines. Complex monolith handling task views, session views, and calendar logic.
- **`src/pages/NotesPage.jsx`**: ~663 lines. High complexity.
- **`src/pages/CanvasPage.jsx`**: ~594 lines. High complexity.
- **`src/components/DailyTimeline.jsx`**: ~552 lines. High complexity.
- **`src/App.jsx`**: ~374 lines.
- **`src/features/Graph/components/GraphRenderer.jsx`**: ~317 lines.
- **`src/components/ProjectIcon.jsx`**: ~309 lines.
- **`src/features/Graph/pages/GraphPage.jsx`**: ~307 lines.

## 2. Leftovers
Artifacts that appear to have been meant as temporary fixes or test snippets:

- **`src/pages/NotesPage_ModalSnippet.jsx`**: An unused leftover snippet file that still exists in the codebase and needs to be deleted.
- **`src/utils/dummyData.js`** (Line 46): Contains a `// TODO` comment (`"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`) that is part of a string literal, but acts as a forgotten artifact in sample data.

## 3. Ghost Code
Unused imports, variables, or functions caught by static analysis (ESLint) and memory context:

- **`src/App.jsx`**: `ensurePermission` is defined but never used. `handleOpenLedger` is assigned a value but never used.
- **`src/components/ChronosModal.test.jsx`**: `fireEvent` and `waitFor` are defined but never used.
- **`src/components/FocusWidget.jsx`**: `onOpenPulse` is defined but never used.
- **`src/components/ui/CustomSelect.jsx`**: `motion` is defined but never used.
- **`src/components/ui/DateTimePicker.jsx`**: `motion` is defined but never used.
- **`src/components/ui/PillSelect.jsx`**: `motion` is defined but never used.
- **`src/components/ui/dock.jsx`**: `motion` is defined but never used.
- **`src/context/DataContext.jsx`**: `parseContentMeta` is defined but never used.
- **`src/features/Graph/components/GraphControls.jsx`**: `showSignals` and `setShowSignals` are defined but never used.
- **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn` is defined but never used. `total` is assigned but never used.
- **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote` is assigned but never used.
- **`src/features/Opus/components/ProjectResume.jsx`**: `taskId` is assigned but never used.
- **`src/features/Opus/components/ResourcesPanel.jsx`**: `e` is defined but never used.
- **`src/features/Opus/components/TimelinePanel.jsx`**: `idx` is defined but never used.
- **`src/lib/time.js`**: `excludeId` is assigned but never used.
- **`src/pages/HomePage.jsx`**: `ledger` and `reminders` are assigned but never used. `updateNote` is defined but never used.
- **`src/pages/JournalPage.jsx`**: `onOpenLedger` is defined but never used.
- **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, and `pushToast` are defined but never used.

## 4. Structure Drift
New components being created outside the established project structure (e.g., inline components instead of separate files):

- **`src/pages/LedgerPage.jsx`**: Contains multiple inline components: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
- **`src/pages/NotesPage.jsx`**: Component `NotesOverview` defined inline.
- **`src/pages/CanvasPage.jsx`**: Components `CanvasBoard` and `URLImage` defined inline.
- **`src/components/DailyTimeline.jsx`**: Components `GridSlot` and `SessionItem` defined inline.
- **`src/components/GlassCard.jsx`**: Groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of individual files.
- **`src/components/NewDecisionModal.jsx`** & **`src/components/ReviewModal.jsx`**: Duplicated logic existing as standalone components while also existing as inline versions in `src/pages/LedgerPage.jsx`.
