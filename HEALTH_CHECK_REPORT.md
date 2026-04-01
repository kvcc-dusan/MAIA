# Codebase Health Check Report

This report outlines signs of degradation, complexity creep, structure drift, and "forgotten" artifacts in the codebase.

## 1. Complexity Creep

The following files have grown significantly in complexity (> 300 lines) and may have functions with high cyclomatic complexity.

* `src/pages/LedgerPage.jsx` (~1137 lines)
* `src/components/ChronosModal.jsx` (~688 lines)
* `src/pages/NotesPage.jsx` (~663 lines)
* `src/pages/CanvasPage.jsx` (~594 lines)
* `src/components/DailyTimeline.jsx` (~552 lines)
* `src/App.jsx` (~374 lines)
* `src/features/Graph/components/GraphRenderer.jsx` (~317 lines)
* `src/components/ProjectIcon.jsx` (~309 lines)
* `src/features/Graph/pages/GraphPage.jsx` (~307 lines)

## 2. Leftovers

* **// TODO comments**:
    * `src/utils/dummyData.js`: `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"` (inside a string literal, possibly intended but matches signature)

## 3. Ghost Code (Unused Imports/Variables)

Identified via ESLint static analysis:

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

* **Inline Component Definitions**: Components are being defined inside page or main component files instead of their own separate files.
    * `src/pages/LedgerPage.jsx` (~1137 lines) defines multiple inline components: `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
    * `src/pages/NotesPage.jsx` (~663 lines) defines `PIN` and `NotesOverview` inline.
    * `src/components/DailyTimeline.jsx` (~552 lines) defines `GridSlot` and `SessionItem` inline.
    * `src/App.jsx` defines `AppContent` inline.
    * `src/pages/JournalPage.jsx` defines `JournalHistoryList` inline.
    * `src/pages/CanvasPage.jsx` (~594 lines) defines `URLImage` and `CanvasBoard` inline.
    * `src/components/GlassCard.jsx` groups `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea` in a single file instead of individual files in `src/components/ui/`.

* **Component Duplication**:
    * `NewDecisionModal` and `ReviewModal` have duplicate logic: a standalone version exists in `src/components/` while an inline version is defined inside `src/pages/LedgerPage.jsx`.
