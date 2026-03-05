# Codebase Health Report

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **src/pages/LedgerPage.jsx** (1138 lines)
    *   Defines multiple significant components inline (CloseButton, ConfirmModal, RenameModal, NewDecisionModal, ReviewModal, DecisionDetailModal, DecisionCard, SectionDivider).
*   **src/components/ChronosModal.jsx** (689 lines)
    *   A massive component handling task views, session views, and calendar logic.
*   **src/pages/NotesPage.jsx** (664 lines)
    *   Contains inline components like PIN and NotesOverview.
*   **src/pages/CanvasPage.jsx** (595 lines)
    *   Contains inline components like URLImage and CanvasBoard.
*   **src/components/DailyTimeline.jsx** (553 lines)
    *   Contains inline components like GridSlot and SessionItem.

## 2. Leftovers
No obvious leftovers (`console.log`, `debugger`, `// TODO`) found outside of known false positives.

## 3. Ghost Code
*   **src/App.jsx:5**: Unused variable/import `ensurePermission`
*   **src/App.jsx:153**: Unused variable/import `handleOpenLedger`
*   **src/components/ChronosModal.test.jsx:2**: Unused variable/import `fireEvent`
*   **src/components/ChronosModal.test.jsx:2**: Unused variable/import `waitFor`
*   **src/components/FocusWidget.jsx:14**: Unused variable/import `onOpenPulse`
*   **src/components/ui/CustomSelect.jsx:4**: Unused variable/import `motion`
*   **src/components/ui/DateTimePicker.jsx:4**: Unused variable/import `motion`
*   **src/components/ui/PillSelect.jsx:4**: Unused variable/import `motion`
*   **src/components/ui/dock.jsx:2**: Unused variable/import `motion`
*   **src/context/DataContext.jsx:4**: Unused variable/import `parseContentMeta`
*   **src/features/Graph/components/GraphControls.jsx:28**: Unused variable/import `showSignals`
*   **src/features/Graph/components/GraphControls.jsx:29**: Unused variable/import `setShowSignals`
*   **src/features/Ledger/components/OutcomeDistribution.jsx:3**: Unused variable/import `cn`
*   **src/features/Ledger/components/OutcomeDistribution.jsx:7**: Unused variable/import `total`
*   **src/features/Opus/components/ExecutionPanel.jsx:57**: Unused variable/import `showPromote`
*   **src/features/Opus/components/ProjectResume.jsx:38**: Unused variable/import `taskId`
*   **src/features/Opus/components/ResourcesPanel.jsx:30**: Unused variable/import `e`
*   **src/features/Opus/components/TimelinePanel.jsx:59**: Unused variable/import `idx`
*   **src/lib/time.js:23**: Unused variable/import `excludeId`
*   **src/pages/HomePage.jsx:19**: Unused variable/import `ledger`
*   **src/pages/HomePage.jsx:21**: Unused variable/import `reminders`
*   **src/pages/HomePage.jsx:23**: Unused variable/import `updateNote`
*   **src/pages/JournalPage.jsx:32**: Unused variable/import `onOpenLedger`
*   **src/pages/ProjectsPage.jsx:30**: Unused variable/import `notes`
*   **src/pages/ProjectsPage.jsx:33**: Unused variable/import `setNotes`
*   **src/pages/ProjectsPage.jsx:36**: Unused variable/import `pushToast`

## 4. Structure Drift
The following files exhibit structure drift:
*   **`src/pages/LedgerPage.jsx`**: Defines multiple UI components (e.g., `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`) inline instead of in their own files within `src/features/Ledger/components/` or `src/components/`.
*   **`src/pages/NotesPage.jsx`**: Defines components like `PIN` and `NotesOverview` inline.
*   **`src/pages/CanvasPage.jsx`**: Defines components like `URLImage` and `CanvasBoard` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines components like `GridSlot` and `SessionItem` inline.
*   **`src/components/GlassCard.jsx`**: Defines multiple reusable components (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of following a one-component-per-file pattern or grouping them under a `ui` folder.