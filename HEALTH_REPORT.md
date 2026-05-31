# Codebase Health Report

**Date**: 2024-05-28
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines or complex functions) and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (1137 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and multiple inline components.
    *   **Recommendation**: Move these components to `src/features/Ledger/components/` to match the project structure.

*   **HIGH: `src/components/ChronosModal.jsx` (688 lines)**
    *   Still complex, handling tasks, sessions, and calendar logic.
    *   **Recommendation**: Decompose into smaller sub-components.

*   **HIGH: `src/pages/NotesPage.jsx` (663 lines) & `src/pages/CanvasPage.jsx` (594 lines) & `src/components/DailyTimeline.jsx` (552 lines)**
    *   Accumulating substantial logic.
    *   **Recommendation**: Consider refactoring layout and logic into separate hooks/components.

*   **MEDIUM: `src/App.jsx` (374 lines), `src/features/Graph/components/GraphRenderer.jsx` (317 lines), `src/components/ProjectIcon.jsx` (309 lines), `src/features/Graph/pages/GraphPage.jsx` (307 lines)**
    *   Growing in size and logic.

## 2. Leftovers & Ghost Code
*   **Warning**: `src/features/Graph/components/GraphRenderer.jsx` contains commented-out debug code (`// console.log(...)`).
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals for sample data.
*   **Ghost Code (Unused Variables/Imports)**:
    *   `src/App.jsx`: `ensurePermission`, `handleOpenLedger`.
    *   `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`.
    *   `src/components/FocusWidget.jsx`: `onOpenPulse`.
    *   `src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`: `motion`.
    *   `src/context/DataContext.jsx`: `parseContentMeta`.
    *   `src/features/Graph/components/GraphControls.jsx`: `showSignals`, `setShowSignals`.
    *   `src/features/Ledger/components/OutcomeDistribution.jsx`: `cn`, `total`.
    *   `src/features/Opus/components/ExecutionPanel.jsx`: `showPromote`.
    *   `src/features/Opus/components/ProjectResume.jsx`: `taskId`.
    *   `src/features/Opus/components/ResourcesPanel.jsx`: `e`.
    *   `src/features/Opus/components/TimelinePanel.jsx`: `idx`.
    *   `src/lib/time.js`: `excludeId`.
    *   `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`.
    *   `src/pages/JournalPage.jsx`: `onOpenLedger`.
    *   `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`.
*   **Ghost Code (Missing Dependencies in Hooks)**:
    *   `src/App.jsx`, `src/components/ChronosModal.jsx`, `src/components/EditorRich.jsx`, `src/context/DataContext.jsx`, `src/features/Graph/components/GraphRenderer.jsx`, `src/features/Graph/hooks/useGraphSimulation.js`, `src/pages/LedgerPage.jsx`, `src/pages/NotesPage.jsx`.
*   **Orphaned Artifact**:
    *   `src/pages/NotesPage_ModalSnippet.jsx` contains multiple undefined references (`showDeleteConfirm`, `notes`, `setShowDeleteConfirm`, `confirmDeleteAll`) and seems to be a disconnected snippet.

## 3. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider` inline instead of their own files.
*   **`src/pages/CanvasPage.jsx`**: Defines `URLImage`, `CanvasBoard` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `DailyTimeline`, `GridSlot`, `SessionItem` inline.
*   **`src/components/GlassCard.jsx`**: Defines `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`. While acceptable as a UI library file, consider renaming to `src/components/ui/glass.jsx`.
*   **`src/components/ProjectIcon.jsx`**: Defines `ProjectIcon`, `IconPicker` inline.
*   **`src/features/Opus/components/ExecutionPanel.jsx`**: Defines `TaskRow`, `GroupHeader` inline.
*   **`src/features/Opus/components/KnowledgePanel.jsx`**: Defines `NoteRow` inline.

## 4. Recommendations
1.  **Refactor `LedgerPage.jsx`**. Move the inline modals and cards to the `src/features/Ledger/` directory.
2.  **Prioritize decomposing large components**. `ChronosModal.jsx`, `NotesPage.jsx`, `CanvasPage.jsx`, and `DailyTimeline.jsx` are likely sources of bugs and performance issues.
3.  **Clean up ghost code**. Remove unused variables, imports, and fix missing hook dependencies to ensure stability.
4.  **Remove orphaned files**. Delete `src/pages/NotesPage_ModalSnippet.jsx` as it's an unused snippet causing errors.
5.  **Enforce Linting**. Ensure unused imports are caught by CI/CD pipelines.