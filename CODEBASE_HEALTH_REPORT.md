# Codebase Health Check Report

This report summarizes the findings of the codebase health scan based on the provided criteria: Complexity Creep, Leftovers, Ghost Code, and Structure Drift.

## 1. Complexity Creep

The following files have grown significantly in complexity, mostly exceeding 300 lines of code. This often indicates deep nesting or high cyclomatic complexity, and these files might benefit from refactoring or decomposition.

*   `src/pages/LedgerPage.jsx` (~1137 lines)
*   `src/components/ChronosModal.jsx` (~688 lines)
*   `src/pages/NotesPage.jsx` (~663 lines)
*   `src/pages/CanvasPage.jsx` (~594 lines)
*   `src/components/DailyTimeline.jsx` (~552 lines)
*   `src/App.jsx` (~374 lines)
*   `src/features/Graph/components/GraphRenderer.jsx` (~317 lines)
*   `src/components/ProjectIcon.jsx` (~309 lines)
*   `src/features/Graph/pages/GraphPage.jsx` (~307 lines)

## 2. Leftovers

A search for common leftover debugging artifacts was performed:

*   **`console.log`**: None found in the `src/` directory.
*   **`debugger`**: None found in the `src/` directory.
*   **`// TODO`**: One instance was found in `src/utils/dummyData.js`, but it appears to be a string literal used as mock data rather than an actual temporary leftover comment in the code structure.

## 3. Ghost Code

Static analysis (ESLint) flagged several unused imports, variables, and functions that could be considered "ghost code".

*   **`src/App.jsx`**: Unused variables `ensurePermission`, `handleOpenLedger`. Missing dependencies in `useCallback` hooks.
*   **`src/components/ChronosModal.test.jsx`**: Unused variables `fireEvent`, `waitFor`.
*   **`src/components/FocusWidget.jsx`**: Unused variable `onOpenPulse`.
*   **`src/components/ui/CustomSelect.jsx`**, **`src/components/ui/DateTimePicker.jsx`**, **`src/components/ui/PillSelect.jsx`**, **`src/components/ui/dock.jsx`**: Unused import `motion`.
*   **`src/context/DataContext.jsx`**: Unused function `parseContentMeta`.
*   **`src/features/Graph/components/GraphControls.jsx`**: Unused variables `showSignals`, `setShowSignals`.
*   **`src/features/Ledger/components/OutcomeDistribution.jsx`**: Unused variables `cn`, `total`.
*   **`src/features/Opus/components/ExecutionPanel.jsx`**: Unused variable `showPromote`.
*   **`src/features/Opus/components/ProjectResume.jsx`**: Unused variable `taskId`.
*   **`src/features/Opus/components/ResourcesPanel.jsx`**: Unused variable `e`.
*   **`src/features/Opus/components/TimelinePanel.jsx`**: Unused variable `idx`.
*   **`src/lib/time.js`**: Unused variable `excludeId`.
*   **`src/pages/HomePage.jsx`**: Unused variables `ledger`, `reminders`, `updateNote`.
*   **`src/pages/JournalPage.jsx`**: Unused variable `onOpenLedger`.
*   **`src/pages/ProjectsPage.jsx`**: Unused variables `notes`, `setNotes`, `pushToast`.

## 4. Structure Drift

Several components exhibit structure drift, where new components are defined inline within a page or another component file instead of having their own dedicated file in the `src/components/` structure.

*   **`src/pages/LedgerPage.jsx`**: Defines multiple inline components including `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
*   **`src/pages/NotesPage.jsx`**: Defines `PIN` and `NotesOverview` components inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` components inline.
*   **`src/App.jsx`**: Defines the `AppContent` component inline.
*   **`src/pages/JournalPage.jsx`**: Defines the `JournalHistoryList` component inline alongside `Journal`.
*   **`src/pages/CanvasPage.jsx`**: Contains inline components like `URLImage` and `CanvasBoard`.
*   **`src/components/GlassCard.jsx`**: Groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of separate ones.

## Actions Taken

*   **Removed Leftovers**: Deleted the orphaned file `src/pages/NotesPage_ModalSnippet.jsx` which was causing linter errors.
