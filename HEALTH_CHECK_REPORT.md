### 1. Complexity Creep
Files exceeding 300 lines:
- `src/App.jsx`: 374 lines
- `src/components/ChronosModal.jsx`: 688 lines
- `src/components/DailyTimeline.jsx`: 552 lines
- `src/components/ProjectIcon.jsx`: 309 lines
- `src/pages/NotesPage.jsx`: 663 lines
- `src/pages/CanvasPage.jsx`: 594 lines
- `src/pages/LedgerPage.jsx`: 1137 lines
- `src/features/Graph/components/GraphRenderer.jsx`: 317 lines
- `src/features/Graph/pages/GraphPage.jsx`: 307 lines

### 2. Leftovers
Found `console.log`, `debugger`, or `// TODO` statements:
- No leftovers found.

### 3. Ghost Code
Unused variables/imports (from ESLint) and orphaned files:
- Orphaned file found: `src/pages/NotesPage_ModalSnippet.jsx` (dead code, modal snippet not imported or exported properly)
- `src/App.jsx`: Unused variable/import `ensurePermission`
- `src/App.jsx`: Unused variable/import `handleOpenLedger`
- `src/components/ChronosModal.test.jsx`: Unused variable/import `fireEvent`
- `src/components/ChronosModal.test.jsx`: Unused variable/import `waitFor`
- `src/components/FocusWidget.jsx`: Unused variable/import `onOpenPulse`
- `src/components/ui/CustomSelect.jsx`: Unused variable/import `motion`
- `src/components/ui/DateTimePicker.jsx`: Unused variable/import `motion`
- `src/components/ui/PillSelect.jsx`: Unused variable/import `motion`
- `src/components/ui/dock.jsx`: Unused variable/import `motion`
- `src/context/DataContext.jsx`: Unused variable/import `parseContentMeta`
- `src/features/Graph/components/GraphControls.jsx`: Unused variable/import `showSignals`
- `src/features/Graph/components/GraphControls.jsx`: Unused variable/import `setShowSignals`
- `src/features/Ledger/components/OutcomeDistribution.jsx`: Unused variable/import `cn`
- `src/features/Ledger/components/OutcomeDistribution.jsx`: Unused variable/import `total`
- `src/features/Opus/components/ExecutionPanel.jsx`: Unused variable/import `showPromote`
- `src/features/Opus/components/ProjectResume.jsx`: Unused variable/import `taskId`
- `src/features/Opus/components/ResourcesPanel.jsx`: Unused variable/import `e`
- `src/features/Opus/components/TimelinePanel.jsx`: Unused variable/import `idx`
- `src/lib/time.js`: Unused variable/import `excludeId`
- `src/pages/HomePage.jsx`: Unused variable/import `ledger`
- `src/pages/HomePage.jsx`: Unused variable/import `reminders`
- `src/pages/HomePage.jsx`: Unused variable/import `updateNote`
- `src/pages/JournalPage.jsx`: Unused variable/import `onOpenLedger`
- `src/pages/NotesPage_ModalSnippet.jsx`: Unused variable/import `showDeleteConfirm`
- `src/pages/NotesPage_ModalSnippet.jsx`: Unused variable/import `notes`
- `src/pages/NotesPage_ModalSnippet.jsx`: Unused variable/import `setShowDeleteConfirm`
- `src/pages/NotesPage_ModalSnippet.jsx`: Unused variable/import `confirmDeleteAll`
- `src/pages/ProjectsPage.jsx`: Unused variable/import `notes`
- `src/pages/ProjectsPage.jsx`: Unused variable/import `setNotes`
- `src/pages/ProjectsPage.jsx`: Unused variable/import `pushToast`

### 4. Structure Drift
Inline components found within page files (should be separated):
- `src/pages/CanvasPage.jsx` defines multiple inline components: `CanvasBoard, URLImage`
- `src/pages/NotesPage.jsx` defines multiple inline components: `NotesOverview`
- `src/pages/LedgerPage.jsx` defines multiple inline components: `CloseButton, ConfirmModal, RenameModal, NewDecisionModal, ReviewModal, DecisionDetailModal, DecisionCard, SectionDivider`
- `src/components/DailyTimeline.jsx` defines multiple inline components: `GridSlot, SessionItem`