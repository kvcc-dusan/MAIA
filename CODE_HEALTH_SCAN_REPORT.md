# Codebase Health Scan Report

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines) and require attention:

* `src/App.jsx` (375 lines)
* `src/components/ChronosModal.jsx` (689 lines)
* `src/components/DailyTimeline.jsx` (553 lines)
* `src/components/ProjectIcon.jsx` (310 lines)
* `src/pages/NotesPage.jsx` (664 lines)
* `src/pages/CanvasPage.jsx` (595 lines)
* `src/pages/LedgerPage.jsx` (1138 lines)
* `src/features/Graph/components/GraphRenderer.jsx` (318 lines)
* `src/features/Graph/pages/GraphPage.jsx` (308 lines)

## 2. Leftovers
* No leftovers (`console.log`, `debugger`, or `// TODO` comments) were found in the codebase.

## 3. Ghost Code
Static analysis (ESLint) identified the following unused imports and variables:

* `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
* `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`
* `src/components/FocusWidget.jsx`: `onOpenPulse`
* `src/components/ui/CustomSelect.jsx`: `motion`
* `src/components/ui/DateTimePicker.jsx`: `motion`
* `src/components/ui/PillSelect.jsx`: `motion`
* `src/components/ui/dock.jsx`: `motion`
* `src/context/DataContext.jsx`: `parseContentMeta`
* `src/features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals`
* `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn`, `total`
* `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote`
* `src/features/Opus/components/ProjectResume.jsx`: `taskId`
* `src/features/Opus/components/ResourcesPanel.jsx`: `e`
* `src/features/Opus/components/TimelinePanel.jsx`: `idx`
* `src/lib/time.js`: `excludeId`
* `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`
* `src/pages/JournalPage.jsx`: `onOpenLedger`
* `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`

## 4. Structure Drift
New components are being defined outside the established project structure (e.g., inside page files):

* `src/pages/CanvasPage.jsx` defines multiple components: `CanvasBoard`, `URLImage`
* `src/pages/JournalPage.jsx` defines multiple components: `Journal`, `JournalHistoryList`
* `src/pages/LedgerPage.jsx` defines multiple components: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`, `LedgerPage`

## Recommendations
* Prioritize decomposing large files, especially `LedgerPage.jsx` and `ChronosModal.jsx`.
* Refactor inline components out of page files and into the `src/components/` or feature-specific directories.
* Trivial issues (unused variables/imports and the orphaned `NotesPage_ModalSnippet.jsx` file) will be resolved directly.
