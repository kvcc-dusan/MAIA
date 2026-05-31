# Codebase Health Check Report

This report summarizes the codebase health check scan performed on the Maia application, focusing on four primary areas: Complexity Creep, Leftovers, Ghost Code, and Structure Drift.

## 1. Complexity Creep

Several files have grown significantly in complexity, characterized by deep nesting and exceeding 300 lines of code:

- **`src/pages/LedgerPage.jsx`** (~1137 lines)
- **`src/components/ChronosModal.jsx`** (~688 lines)
- **`src/pages/NotesPage.jsx`** (~663 lines)
- **`src/pages/CanvasPage.jsx`** (~594 lines)
- **`src/components/DailyTimeline.jsx`** (~552 lines)
- **`src/App.jsx`** (~374 lines)
- **`src/features/Graph/components/GraphRenderer.jsx`** (~317 lines)
- **`src/components/ProjectIcon.jsx`** (~309 lines)
- **`src/features/Graph/pages/GraphPage.jsx`** (~307 lines)

## 2. Leftovers

A review of the codebase for forgotten temporary artifacts revealed:

- **`console.log` / `debugger`**: No active `console.log` or `debugger` statements were found in the `src/` directory.
- **`// TODO` Comments**: One instance of `TODO` was found:
  - `src/utils/dummyData.js:46`: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"` (Note: This exists within a dummy string literal).

## 3. Ghost Code

Static analysis (`eslint`) detected the following unused imports, variables, and functions:

- **`src/App.jsx`**: `ensurePermission`, `handleOpenLedger`
- **`src/components/FocusWidget.jsx`**: `onOpenPulse`
- **`src/components/ui/CustomSelect.jsx`**: `motion`
- **`src/components/ui/DateTimePicker.jsx`**: `motion`
- **`src/components/ui/PillSelect.jsx`**: `motion`
- **`src/components/ui/dock.jsx`**: `motion`
- **`src/context/DataContext.jsx`**: `parseContentMeta`
- **`src/features/Graph/components/GraphControls.jsx`**: `showSignals`, `setShowSignals`
- **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn`, `total`
- **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote`
- **`src/features/Opus/components/ProjectResume.jsx`**: `taskId`
- **`src/features/Opus/components/ResourcesPanel.jsx`**: `e`
- **`src/features/Opus/components/TimelinePanel.jsx`**: `idx`
- **`src/lib/time.js`**: `excludeId`
- **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, `updateNote`
- **`src/pages/JournalPage.jsx`**: `onOpenLedger`
- **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, `pushToast`
- **`src/components/ChronosModal.test.jsx`**: `fireEvent`, `waitFor`

*Note: In `src/components/ProjectIcon.jsx` and `src/features/Opus/components/ProjectVitality.jsx`, there are React Refresh warnings (`react-refresh/only-export-components`), indicating non-component exports mixed with components.*

## 4. Structure Drift

Several files deviate from the established project structure by defining multiple components inline within page files or creating modular fragments improperly:

- **`src/pages/LedgerPage.jsx`**: Contains multiple inline component definitions such as `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
- **`src/pages/CanvasPage.jsx`**: Defines `URLImage` and `CanvasBoard` inline instead of isolating them in feature or UI component folders.
- **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` components inline.
- **`src/pages/NotesPage.jsx`**: Relies on a floating sibling file (`src/pages/NotesPage_ModalSnippet.jsx`) which contains standalone floating UI snippets meant for inclusion but breaks typical modular bounds. Defines `NotesOverview` inline as the default export but its complexity obscures the page logic.

*(End of Report)*
