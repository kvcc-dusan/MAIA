# Codebase Health Check Report

This report documents findings from a codebase scan focusing on degradation, complexity creep, and structure drift.

## 1. Complexity Creep

The following files have grown significantly in complexity and size, exceeding recommended limits or containing deep nesting. It is recommended to decompose these components into smaller, more manageable units.

*   **`src/components/ChronosModal.jsx`** (1901 lines): This component is extremely large and handles too many responsibilities (UI rendering, state management, complex logic, inline helper components). It should be broken down into sub-components (e.g., `TaskSection`, `SessionTimeline`, `CalendarView`).
*   **`src/pages/CanvasPage.jsx`** (588 lines): Contains significant logic related to canvas manipulation that could be extracted into a custom hook or a separate renderer component.
*   **`src/pages/LedgerPage.jsx`** (494 lines): Includes inline component definitions (`CloseButton`, `NewDecisionModal`) and complex state management that should be extracted.
*   **`src/pages/NotesPage.jsx`** (468 lines): Handles significant list rendering and filtering logic that could be moved to a `NotesList` component.
*   **`src/pages/HomePage.jsx`** (322 lines): While not excessively large, it contains inline definitions for "widgets" (Quick Capture, Recent Entries) that should be standalone components to improve readability and reusability.

## 2. Structure Drift

The codebase shows signs of inconsistent structural patterns:

*   **Inline Components in Pages**:
    *   `src/pages/LedgerPage.jsx` defines `CloseButton` and `NewDecisionModal` inline. These should be moved to `src/components/` or a localized `components/` folder.
    *   `src/pages/HomePage.jsx` renders complex widget-like sections inline (Quick Capture, Recent Entries) instead of importing them as components, unlike `FocusWidget` and `WorldMapWidget` which are properly separated.
*   **`src/features/` Directory**:
    *   The `src/features/Graph` directory introduces a "feature-based" architecture (containing its own `pages`, `components`, `hooks`) which conflicts with the application's primary "layer-based" architecture (`src/components`, `src/pages`, `src/hooks`). This inconsistency can lead to confusion about where to place new code.

## 3. Leftovers (Addressed)

The following artifacts were identified and removed as part of this health check:

*   **`src/features/Graph/pages/GraphPage.jsx`**: Removed a `console.log` statement used for debugging node/link counts.
*   **`src/features/Graph/components/GraphRenderer.jsx`**: Removed a commented-out `console.log` statement.

## 4. Ghost Code

*   **Dummy Data**: `src/utils/dummyData.js` is used in `DataContext` and appears to be active for development/demo purposes.
*   **Graph Feature**: `src/features/Graph` is lazy-loaded in `App.jsx` and is active.
*   **Unused Imports**: A manual scan suggests potential unused imports in `ChronosModal.jsx` due to its size, but a linter configuration is required to accurately identify and remove them.

## Recommendations

1.  **Refactor `ChronosModal.jsx`**: This is the highest priority. Extract inline components and separate logic into hooks (`useChronosState`).
2.  **Standardize Project Structure**: Decide between "layer-based" or "feature-based" architecture. If "layer-based" is preferred, move `src/features/Graph` contents to the main directories.
3.  **Extract Inline Widgets**: Move inline widgets from `HomePage.jsx` and `LedgerPage.jsx` to `src/components/`.
4.  **Fix Linter**: Restore `eslint` functionality to automatically catch unused variables and imports.
