# Health Check Report

## 1. Complexity Creep
The following components have grown significantly in complexity, exceeding 300 lines of code:
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
- No unexpected `console.log`, `debugger`, or temporary `// TODO` comments were found across the active codebase. (The `TODO` in dummyData.js is a mock payload string).
- **Unused Artifact**: `src/pages/NotesPage_ModalSnippet.jsx` exists in the repository as a leftover unused snippet and should be deleted.

## 3. Ghost Code
ESLint static analysis identified several instances of unused code ("ghost code") that can be safely removed:
- Unused functions/variables in `src/App.jsx` (`ensurePermission`, `handleOpenLedger`).
- Unused test imports in `src/components/ChronosModal.test.jsx`.
- Unused imports (like `motion`) in UI components (`src/components/ui/CustomSelect.jsx`, `src/components/ui/DateTimePicker.jsx`, `src/components/ui/PillSelect.jsx`, `src/components/ui/dock.jsx`).
- Unused parameters and variables across feature components (`src/features/Opus/`, `src/features/Graph/`, `src/features/Ledger/`).
- Unused state/variables in several pages (`src/pages/HomePage.jsx`, `src/pages/JournalPage.jsx`, `src/pages/ProjectsPage.jsx`).

## 4. Structure Drift
Several pages exhibit structure drift by defining multiple sub-components inline instead of placing them in dedicated component files within `src/components/` or a feature directory:
- `src/pages/LedgerPage.jsx`: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`.
- `src/pages/NotesPage.jsx`: Defines `PIN`, `NotesOverview`.
- `src/components/DailyTimeline.jsx`: Defines `GridSlot`, `SessionItem`.
- `src/pages/CanvasPage.jsx`: Defines `URLImage`, `CanvasBoard`.
