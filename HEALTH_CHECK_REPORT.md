# Codebase Health Check Report

## 1. Complexity Creep

The following files have grown significantly in complexity and exceed 300 lines of code. They are candidates for refactoring and breaking down into smaller, more manageable components:

* `src/pages/LedgerPage.jsx` (1137 lines)
* `src/components/ChronosModal.jsx` (688 lines)
* `src/pages/NotesPage.jsx` (663 lines)
* `src/pages/CanvasPage.jsx` (594 lines)
* `src/components/DailyTimeline.jsx` (552 lines)
* `src/App.jsx` (374 lines)
* `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
* `src/components/ProjectIcon.jsx` (309 lines)
* `src/features/Graph/pages/GraphPage.jsx` (307 lines)

## 2. Leftovers

A scan for temporary development artifacts (`console.log`, `debugger`, `// TODO`) revealed:
* **No active `console.log` or `debugger` statements** were found in the source files.
* **TODOs**: Only one `TODO` was found, which is a false positive inside a string literal in `src/utils/dummyData.js`.

## 3. Ghost Code

Static analysis identified instances of unused variables and imports, contributing to codebase clutter. Examples include:
* `src/App.jsx`
* `src/context/DataContext.jsx`

*Note: The ESLint scan also identified an orphaned file, `src/pages/NotesPage_ModalSnippet.jsx`, which should be removed.*

## 4. Structure Drift

Several files violate the established project structure by defining new components inline instead of in their own dedicated files. This reduces reusability and increases file complexity.

Instances of structure drift:
* **`src/pages/LedgerPage.jsx`**: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider` inline.
* **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
* **`src/pages/CanvasPage.jsx`**: Defines `URLImage` inline.
