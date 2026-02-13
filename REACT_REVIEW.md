# React Code Review Report

This report documents the findings from a review of the codebase for React anti-patterns and best practices.

## Summary of Fixes

### 1. Nested Component Definitions
**Violation**: Components defined inside other components are recreated on every render, causing full unmount/remount of the subtree, loss of focus, and performance issues.

-   **Fixed**: `src/components/DecisionLedger.jsx` contained `DecisionCard` defined inside the main `DecisionLedger` component.
    -   **Action**: Extracted `DecisionCard` to the top level of the file. Passed `setReviewingId` as `onReview` prop.

### 2. Inline Helper Functions
**Violation**: Helper functions defined inside the render scope are recreated on every render. If passed as props, they break memoization of child components.

-   **Fixed**: `src/components/ChronosModal.jsx` contained `toLocalInputValue`, `checkOverlap`, and `isPastTime` inside the component.
    -   **Action**: Moved these pure functions to the top-level scope (outside the component). This also removed code duplication as `toLocalInputValue` was defined twice.

## Remaining Observations & Potential Improvements

### 1. Key Props
-   **Observation**: In `src/components/ChronosModal.jsx` and `DateTimePicker`, `gridCells.map((d, i) => ...)` uses the index `i` as the `key`.
-   **Explanation**: While using index as a key is generally an anti-pattern for dynamic lists, it is acceptable here because:
    -   The grid structure (calendar slots) is static in size (e.g., 42 cells).
    -   The items do not get reordered; they are replaced entirely when the view changes (e.g., changing months).
    -   The "identity" of the cell is its position in the grid.
-   **Status**: Acceptable exception.

### 2. Inline Event Handlers
-   **Observation**: `src/components/ChronosModal.jsx` defines many event handlers inline (e.g., `saveTask`, `saveSession`, `toggleTask`) and passes them to child components like `TaskRow`.
-   **Impact**: This causes `TaskRow` to re-render on every parent update because the function reference changes.
-   **Recommendation**: For a large application, these should be wrapped in `useCallback` and child components (`TaskRow`) should be wrapped in `React.memo`. Given the current complexity, this was not refactored but is noted as a performance optimization opportunity.

### 3. Prop Types & Default Props
-   **Observation**: Most components (e.g., `ChronosModal`, `DecisionLedger`) do not use `propTypes` or TypeScript for prop validation. They rely on default parameters or implicit contract.
-   **Recommendation**: Adopt `prop-types` or migrate to TypeScript for better type safety. Currently, default props are handled via destructuring defaults (e.g., `projects = []`), which is a modern and correct pattern.

### 4. Side Effects & Refs
-   **Observation**: `ChronosModal.jsx` uses `useLayoutEffect` for scrolling (`scrollIntoView`).
-   **Explanation**: `useLayoutEffect` is synchronous and blocks painting. This is correct for scroll adjustments to prevent visual jumping, but causes warnings in SSR environments. Since this is a client-side app (Vite), it is acceptable.
-   **Observation**: `CustomSelect` and `PillSelect` use `ref.current` inside `useEffect`. This is correct usage as they are checking the DOM node state on event.

### 5. Component Structure
-   **Observation**: `ChronosModal.jsx` is a very large file (~1300 lines) containing multiple sub-components and complex logic.
-   **Recommendation**: Decompose `ChronosModal` into smaller files (e.g., `CalendarGrid`, `TaskForm`, `SessionForm`) to improve maintainability.

## Best Practices Verified
-   **Controlled Inputs**: Form inputs in `ChronosModal`, `DecisionLedger`, and `EditorRich` are consistently controlled.
-   **Hook Rules**: Hooks are called at the top level. Custom hooks like `useLocalStorage` are used correctly.
-   **Memoization**: Heavy components like `GraphRenderer` and `JournalHistoryList` use `React.memo`.
