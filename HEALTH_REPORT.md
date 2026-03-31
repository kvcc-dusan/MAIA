# Codebase Health Report

**Date**: 2024-05-22
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/components/ChronosModal.jsx` (~688 lines)**
    *   This component has become a monolith. It combines UI, complex state management, and helper functions.
    *   **Recommendation**: Decompose into smaller sub-components (e.g., `TaskView`, `SessionView`, `CalendarView`) and extract logic into custom hooks (`useChronosState`).

*   **HIGH: `src/pages/LedgerPage.jsx` (~1137 lines)**
    *   Defines multiple significant components inline (`NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`, `RenameModal`, `ConfirmModal`, `CloseButton`).
    *   **Recommendation**: Move these components to `src/features/Ledger/components/` to match the project structure.

*   **MEDIUM: `src/pages/NotesPage.jsx` (~663 lines) & `src/pages/CanvasPage.jsx` (~594 lines)**
    *   Accumulating substantial logic.
    *   **Recommendation**: Consider refactoring layout and logic into separate hooks/components.

*   **MEDIUM: `src/components/DailyTimeline.jsx` (~552 lines)**
    *   Growing in size. Contains complex drag-and-drop logic for sessions.
    *   **Recommendation**: Extract drag-and-drop and validation logic (`isPastTime`, `hasOverlap`) to custom hooks.

*   **MEDIUM: `src/App.jsx` (~374 lines)**
    *   **Recommendation**: Refactor routing and layout to separate components.

*   **MEDIUM: `src/features/Graph/components/GraphRenderer.jsx` (~317 lines)**
    *   **Recommendation**: Refactor D3 logic to custom hooks or separate utility functions.

## 2. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Acts as a module definition rather than just a page view, containing numerous inline components.
*   **`src/components/GlassCard.jsx`**: Defines `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`. While acceptable as a UI library file, consider renaming to `src/components/ui/glass.jsx` to reflect it is a collection of primitives.
*   **`src/pages/CanvasPage.jsx`**: Defines `CanvasBoard` and `URLImage` inline.
*   **`src/pages/NotesPage.jsx`**: Defines `NotesOverview` inline.
*   **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
*   **`src/App.jsx`**: Defines `AppContent` inline.
*   **`src/pages/JournalPage.jsx`**: Defines `JournalHistoryList` inline.

## 3. Leftovers & Ghost Code
*   **Fixed**: Removed orphaned file `src/pages/NotesPage_ModalSnippet.jsx` which caused static analysis errors.
*   **Fixed**: Removed active `console.log` in `src/features/Graph/pages/GraphPage.jsx`.
*   **Fixed**: Removed unused `MousePointer2` import in `src/pages/LedgerPage.jsx`.
*   **Warning**: `src/features/Graph/components/GraphRenderer.jsx` contains commented-out debug code (`// console.log(...)`).
*   **Warning**: Static analysis reveals ghost code (unused variables, imports) in:
    *   `src/App.jsx` (`ensurePermission`, `handleOpenLedger`)
    *   `src/components/FocusWidget.jsx` (`onOpenPulse`)
    *   `src/components/ui/CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx` (`motion` import)
    *   `src/context/DataContext.jsx` (`parseContentMeta`)
    *   `src/features/Graph/components/GraphControls.jsx` (`showSignals`, `setShowSignals`)
    *   `src/features/Ledger/components/OutcomeDistribution.jsx` (`cn`, `total`)
    *   `src/features/Opus/components/ExecutionPanel.jsx` (`showPromote`)
    *   `src/features/Opus/components/ProjectResume.jsx` (`taskId`)
    *   `src/features/Opus/components/ResourcesPanel.jsx` (`e`)
    *   `src/features/Opus/components/TimelinePanel.jsx` (`idx`)
    *   `src/lib/time.js` (`excludeId`)
    *   `src/pages/HomePage.jsx` (`ledger`, `reminders`, `updateNote`)
    *   `src/pages/JournalPage.jsx` (`onOpenLedger`)
    *   `src/pages/ProjectsPage.jsx` (`notes`, `setNotes`, `pushToast`)
*   **False Positive**: `src/utils/dummyData.js` contains "TODO" inside string literals for sample data.

## 4. Recommendations
1.  **Prioritize decomposing `ChronosModal.jsx` and `LedgerPage.jsx`**. They are likely sources of bugs and performance issues due to their size and structure drift.
2.  **Extract Inline Components**. Move inline components across the codebase into their respective files in `src/components/` or appropriate feature directories.
3.  **Enforce Linting**. Clean up all ghost code and unused variables caught by ESLint. Ensure these are caught by CI/CD pipelines.
