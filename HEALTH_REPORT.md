# Codebase Health Report

**Date**: 2025-02-18
**Status**: Warnings Found

## 1. Complexity Creep
The following files have grown significantly in complexity and require attention:

*   **CRITICAL: `src/pages/LedgerPage.jsx` (912 lines)**
    *   This file has grown massively and defines multiple significant components inline (`NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`).
    *   **Recommendation**: Move these components to `src/features/Ledger/components/` to match the project structure and reduce file size.

*   **HIGH: `src/pages/NotesPage.jsx` (624 lines) & `src/pages/CanvasPage.jsx` (594 lines)**
    *   These pages contain substantial logic and inline helper components/functions.
    *   **Recommendation**: Refactor layout and logic into separate hooks/components.

*   **HIGH: `src/components/ChronosModal.jsx` (559 lines)**
    *   Still a large component mixing UI, state, and business logic.
    *   **Recommendation**: Continue decomposing into smaller sub-components (e.g., `TaskView`, `SessionView`).

## 2. Structure Drift
New components are being defined outside the established structure:

*   **`src/pages/LedgerPage.jsx`**: Defines `CloseButton`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard` inline. This is a significant deviation from the component-per-file or feature-folder structure.
*   **`src/pages/CanvasPage.jsx`**: Defines `URLImage` inline.

## 3. Ghost Code
*   **Fixed**: Removed unused imports in `src/components/ChronosModal.jsx` (`PriorityCheckbox`, `PillSelect`, `Portal`, `Popover`, `ContextMenu`, etc.).
*   **Fixed**: Removed unused `ensurePermission` import in `src/App.jsx`.
*   **Fixed**: Removed unused `parseContentMeta` import in `src/context/DataContext.jsx`.

## 4. Leftovers
*   **Status**: Clean. No active `console.log`, `debugger`, or `TODO` comments found in critical paths.

## 5. Broken Tests
*   **`src/context/DataContext.test.jsx`**: The test "Deleting a Project cascades correctly" fails because it creates a second note (Step 1b) but expects the count to remain 1. This test logic appears flawed and requires fixing.
*   **`src/components/ChronosModal.test.jsx`**: Fails on missing `aria-label` assertions for `CloseButton`, `PriorityCheckbox`, etc. This might indicate issues with props spreading or test setup.

## 6. Recommendations
1.  **Refactor `LedgerPage.jsx` immediately**. It is the largest violator of structure and complexity rules.
2.  **Enforce Component Extraction**. Prevent defining non-trivial components inside page files.
3.  **Fix Broken Tests**. Address the failures in `DataContext.test.jsx` and `ChronosModal.test.jsx`.
4.  **Continue cleanup**. The removal of unused imports is a good step.
