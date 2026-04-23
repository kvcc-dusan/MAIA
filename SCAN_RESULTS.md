# Codebase Health Check Report

This is an automated health check report based on the latest scan of the codebase.

## 1. Complexity Creep

The following files have grown significantly in complexity (> 300 lines) and may require refactoring or decomposition:

*   **`src/pages/LedgerPage.jsx` (1137 lines)**: Extreme length and complexity. Defines many components inline (`ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`) instead of extracting them. Needs significant refactoring to match project structure.
*   **`src/components/ChronosModal.jsx` (688 lines)**: Very high complexity. Combines UI, complex state, and logic. A monolith that needs decomposition into smaller views/components.
*   **`src/pages/NotesPage.jsx` (663 lines)**: High complexity.
*   **`src/pages/CanvasPage.jsx` (594 lines)**: High complexity.
*   **`src/components/DailyTimeline.jsx` (552 lines)**: High complexity.
*   **`src/App.jsx` (374 lines)**: Growing complexity, typical for root files, but keep an eye on it.
*   **`src/features/Graph/components/GraphRenderer.jsx` (317 lines)**: High complexity.
*   **`src/components/ProjectIcon.jsx` (309 lines)**: Growing complexity.
*   **`src/features/Graph/pages/GraphPage.jsx` (307 lines)**: Borderline complexity.

## 2. Leftovers

*   No obvious temporary `console.log` statements were found outside of legitimate error logging.
*   No `debugger` statements were found.
*   `src/utils/dummyData.js:46`: Contains a `"TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod"` in a string literal, but this seems to be sample data rather than an actual code leftover.

## 3. Ghost Code (Unused Imports/Variables)

ESLint analysis revealed the following unused items (ghost code):

*   **`src/App.jsx`**: `ensurePermission`, `handleOpenLedger`.
*   **`src/components/ChronosModal.test.jsx`**: `fireEvent`, `waitFor`.
*   **`src/components/FocusWidget.jsx`**: `onOpenPulse`.
*   **`src/components/ui/CustomSelect.jsx`**: `motion`.
*   **`src/components/ui/DateTimePicker.jsx`**: `motion`.
*   **`src/components/ui/PillSelect.jsx`**: `motion`.
*   **`src/components/ui/dock.jsx`**: `motion`.
*   **`src/context/DataContext.jsx`**: `parseContentMeta`.
*   **`src/features/Graph/components/GraphControls.jsx`**: `showSignals`, `setShowSignals`.
*   **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn`, `total`.
*   **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote`.
*   **`src/features/Opus/components/ProjectResume.jsx`**: `taskId`.
*   **`src/features/Opus/components/ResourcesPanel.jsx`**: `e`.
*   **`src/features/Opus/components/TimelinePanel.jsx`**: `idx`.
*   **`src/lib/time.js`**: `excludeId`.
*   **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, `updateNote`.
*   **`src/pages/JournalPage.jsx`**: `onOpenLedger`.
*   **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, `pushToast`.

## 4. Structure Drift

*   **`src/pages/LedgerPage.jsx`**: Severe structure drift. Defines multiple reusable/distinct components inline (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`). These should be moved to appropriate component directories (e.g., `src/features/Ledger/components/` or `src/components/ui/`).
*   **`src/pages/NotesPage.jsx`**: Structure drift. Defines `PIN` and `NotesOverview` inline.
*   **`src/pages/CanvasPage.jsx`**: Structure drift. Defines `URLImage` and `CanvasBoard` inline.
*   **`src/components/DailyTimeline.jsx`**: Structure drift. Defines `GridSlot` and `SessionItem` inline.
*   **`src/components/GlassCard.jsx`**: Groups multiple UI primitives (`GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`) in a single file instead of following a one-component-per-file or UI library pattern.

## 5. Additional Issues

*   **`src/components/ProjectIcon.jsx`**, **`src/features/Opus/components/ProjectVitality.jsx`**: Fast refresh warnings (exports non-components).
*   **`src/pages/EditorPage.jsx`**: React Hook "useCallback" is called conditionally.
*   **`src/pages/NotesPage_ModalSnippet.jsx`**: Several undefined variables used (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`). This file seems to be a detached snippet.
*   **`src/lib/utils.test.js`**: Syntax error with `&&` expressions.
