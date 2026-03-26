# Codebase Health Check Report

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines) and may require decomposition:
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
- A "forgotten" artifact fragment, `src/pages/NotesPage_ModalSnippet.jsx`, was found and has been deleted as a trivial fix.
- (Note: No temporary `console.log` or `debugger` statements were found. The `TODO` found in `src/utils/dummyData.js` is part of dummy markdown text, thus ignored.)

## 3. Ghost Code
Unused imports, variables, or functions detected by static analysis that act as clutter:
- **`src/App.jsx`**: `ensurePermission`, `handleOpenLedger`
- **`src/components/ChronosModal.test.jsx`**: `fireEvent`, `waitFor`
- **`src/components/FocusWidget.jsx`**: `onOpenPulse`
- **`src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`**: `motion` (framer-motion unused)
- **`src/context/DataContext.jsx`**: `parseContentMeta`
- **`src/features/Graph/components/GraphControls.jsx`**: `showSignals`, `setShowSignals`
- **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn`, `total`
- **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote`
- **`src/features/Opus/components/ProjectResume.jsx`**: `taskId`
- **`src/features/Opus/components/ResourcesPanel.jsx`**: `e` (exception param unused)
- **`src/features/Opus/components/TimelinePanel.jsx`**: `idx`
- **`src/lib/time.js`**: `excludeId`
- **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, `updateNote`
- **`src/pages/JournalPage.jsx`**: `onOpenLedger`
- **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, `pushToast`

## 4. Structure Drift
New components are being defined inside other component/page files instead of their own modular file:
- **`src/pages/LedgerPage.jsx`**: Contains multiple inline components: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
- **`src/pages/CanvasPage.jsx`**: Contains inline component `URLImage`.
- **`src/components/DailyTimeline.jsx`**: Contains inline components `GridSlot` and `SessionItem`.
- **`src/App.jsx`**: Contains inline component `AppContent`.
