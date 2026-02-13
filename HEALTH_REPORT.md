# Codebase Health Report

## Complexity Creep
The following files have grown significantly in complexity (size > 300 lines):

- `src/components/ChronosModal.jsx` (1901 lines)
- `src/pages/CanvasPage.jsx` (588 lines)
- `src/pages/LedgerPage.jsx` (494 lines)
- `src/pages/NotesPage.jsx` (460 lines)
- `src/App.jsx` (359 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (324 lines)
- `src/components/DecisionLedger.jsx` (324 lines)
- `src/pages/HomePage.jsx` (322 lines)
- `src/features/Graph/pages/GraphPage.jsx` (311 lines)

## Structure Drift
The following files contain component definitions that should likely be moved to their own files:

- `src/pages/LedgerPage.jsx`: Contains `NewDecisionModal`, `ReviewModal`, `DecisionCard`, `CloseButton`.
- `src/pages/CanvasPage.jsx`: Contains `URLImage`.
- `src/pages/JournalPage.jsx`: Contains `JournalHistoryList`.

## Leftovers
The following artifacts were identified and removed:

- `src/features/Graph/pages/GraphPage.jsx`: Removed `console.log("GraphPage: Nodes"...)`.
- `src/features/Graph/components/GraphRenderer.jsx`: Removed commented out `// console.log("GraphRenderer render"...)`.
