# Codebase Health Check Report

## 1. Complexity Creep

The following files have been identified as potentially overly complex or growing beyond their intended scope:

*   **`src/pages/LedgerPage.jsx` (1137 lines)**: Contains significant structure drift with multiple inline component definitions (`CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`). These should be extracted to separate files.
*   **`src/components/ChronosModal.jsx` (688 lines)**: Acts as a monolithic controller for Tasks, Signals, Sessions, and Calendar views. Contains inline form logic and complex state management that should be decomposed.
*   **`src/features/Graph/components/GraphRenderer.jsx` (317 lines)**: Contains complex D3 logic. While D3 is inherently complex, this file should be monitored for further growth.
*   **`src/components/ProjectIcon.jsx` (309 lines)**: Unusually large for an icon component. Likely contains a large switch statement or map that could be optimized or split.

## 2. Leftovers

*   **`src/pages/NotesPage_ModalSnippet.jsx`**: This file appears to be a code snippet or backup file that was not properly integrated or deleted. It contains undefined variables and should be removed.

## 3. Ghost Code (Unused Variables/Imports)

Static analysis (`eslint`) identified the following unused variables and imports:

*   **`src/App.jsx`**: `ensurePermission`, `handleOpenLedger`.
*   **`src/context/DataContext.jsx`**: `parseContentMeta`.
*   **`src/features/Graph/components/GraphControls.jsx`**: `showSignals`, `setShowSignals`.
*   **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn`, `total`.
*   **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, `updateNote`.
*   **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, `pushToast`.
*   **`src/components/ui/*.jsx`**: Unused `motion` imports in `CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`.
*   **`src/components/FocusWidget.jsx`**: `onOpenPulse`.

## 4. Structure Drift

*   **`src/pages/LedgerPage.jsx`**: Defines reusable UI components (`CloseButton`, `ConfirmModal`, etc.) inline instead of importing them from `src/components/ui/` or `src/features/Ledger/components/`.
*   **`src/components/ChronosModal.jsx`**: Defines form views inline within the render method using a switch statement (`rightView`). These should be extracted to `TaskForm`, `SignalForm`, `SessionForm` components.
*   **`src/pages/NotesPage.jsx`**: Contains an inline delete confirmation modal (`showDeleteConfirm`) that logic could be extracted or replaced with a generic confirmation dialog.

## Recommendations

1.  **Refactor `LedgerPage.jsx`**: Extract inline components to `src/features/Ledger/components/`.
2.  **Refactor `ChronosModal.jsx`**: Extract form views to separate components.
3.  **Delete `NotesPage_ModalSnippet.jsx`**.
4.  **Clean up unused variables** across the codebase to reduce noise.
