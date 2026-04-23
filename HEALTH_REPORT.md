# Codebase Health Check Report

This report highlights areas of the codebase suffering from complexity creep, structure drift, ghost code, and forgotten artifacts.

## 1. Complexity Creep

The following files have grown significantly in size (over 500 lines) and complexity, housing substantial logic that should be broken down:

*   **`src/pages/LedgerPage.jsx` (1137 lines)**
    *   Acts as a monolith defining multiple significant UI elements and logic in one place.
*   **`src/components/ChronosModal.jsx` (688 lines)**
    *   Highly complex modal with multiple views (sessions, calendar) intertwined.
*   **`src/pages/NotesPage.jsx` (663 lines)**
    *   A massive component that should likely have extracted presentation layers.
*   **`src/pages/CanvasPage.jsx` (594 lines)**
*   **`src/components/DailyTimeline.jsx` (552 lines)**

## 2. Leftovers

*   **TODO Comments**: The only occurrence is `src/utils/dummyData.js:46`, which is a string literal used as mock data (`"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"`). No actionable developer TODOs were found.
*   **`console.log` / `debugger`**: Clean. None were found via static analysis.

## 3. Ghost Code (Unused Variables/Imports)

Static analysis (`eslint`) revealed several unused imports, variables, and assigned values across the codebase:

*   `src/App.jsx`: `ensurePermission` (line 5), `handleOpenLedger` (line 153).
*   `src/components/FocusWidget.jsx`: `onOpenPulse` (line 14).
*   `src/components/ui/CustomSelect.jsx`: `motion` import.
*   `src/components/ui/DateTimePicker.jsx`: `motion` import.
*   `src/components/ui/PillSelect.jsx`: `motion` import.
*   `src/components/ui/dock.jsx`: `motion` import.
*   `src/context/DataContext.jsx`: `parseContentMeta` import.
*   `src/features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals`.
*   `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn` import, `total` value.
*   `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote` value.
*   `src/features/Opus/components/ProjectResume.jsx`: `taskId` value.
*   `src/features/Opus/components/ResourcesPanel.jsx`: `e` variable.
*   `src/features/Opus/components/TimelinePanel.jsx`: `idx` variable.
*   `src/lib/time.js`: `excludeId` value.
*   `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`.
*   `src/pages/JournalPage.jsx`: `onOpenLedger`.
*   `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`.
*   `src/pages/NotesPage_ModalSnippet.jsx`: Contains several undefined variables indicating it's an orphaned artifact (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`).

## 4. Structure Drift

Several components define local sub-components within the page files themselves rather than keeping them isolated in the established project structure (`src/components/` or `src/features/*/components/`):

*   **`src/pages/LedgerPage.jsx`**:
    *   `CloseButton`
    *   `ConfirmModal`
    *   `RenameModal`
    *   `NewDecisionModal`
    *   `ReviewModal`
    *   `DecisionDetailModal`
    *   `DecisionCard`
    *   `SectionDivider`
*   **`src/pages/CanvasPage.jsx`**:
    *   `CanvasBoard`
    *   `URLImage`
*   **`src/pages/NotesPage.jsx`**:
    *   `NotesOverview`
*   **`src/components/DailyTimeline.jsx`**:
    *   `GridSlot`
    *   `SessionItem`
