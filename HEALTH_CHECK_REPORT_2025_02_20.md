# Codebase Health Check Report - 2025-02-20

## Summary
A scan of the codebase has revealed significant issues related to **Complexity Creep** and **Structure Drift**. While the codebase is generally free of "Leftovers" (console.logs, etc.), several key files have grown to unmanageable sizes and contain multiple inline component definitions, violating the project's structural integrity.

## 1. Complexity Creep
The following files have exceeded reasonable size limits (>300 lines) and exhibit high complexity:

*   **`src/pages/LedgerPage.jsx` (~1140 lines)**: **CRITICAL**. This file is a monolith containing the entire Decision Ledger feature. It includes multiple modal definitions, card rendering logic, and complex state management all in one file.
*   **`src/components/ChronosModal.jsx` (~687 lines)**: **CRITICAL**. Acts as a "God Component" for the calendar/task/session system. It manages too many distinct responsibilities (Calendar Grid, Task List, Signal List, Session Forms).
*   **`src/pages/NotesPage.jsx` (~665 lines)**: **HIGH**. Contains the entire Notes Codex logic, including inline context menus, delete confirmations, and complex filtering logic.
*   **`src/pages/CanvasPage.jsx` (~595 lines)**: **HIGH**. Handles complex canvas logic (drawing, history, object management) and includes inline helper components.
*   **`src/components/DailyTimeline.jsx` (~553 lines)**: **HIGH**. Handles the timeline visualization but also includes inline component definitions for `GridSlot` and `SessionItem`.

## 2. Structure Drift
The project structure is being eroded by "Inline Component Definitions". Instead of creating new files in `src/components/` or `src/features/`, components are being defined directly within page files.

*   **`src/pages/LedgerPage.jsx`** defines:
    *   `NewDecisionModal`
    *   `ReviewModal`
    *   `DecisionDetailModal`
    *   `DecisionCard`
    *   `ConfirmModal`
    *   `RenameModal`
    *   `SectionDivider`
    *   `CloseButton` (inline version)

*   **`src/components/DailyTimeline.jsx`** defines:
    *   `GridSlot`
    *   `SessionItem`

*   **`src/pages/CanvasPage.jsx`** defines:
    *   `URLImage`

*   **`src/components/ProjectIcon.jsx`** defines:
    *   `IconPicker` (implied complex logic inline)

## 3. Leftovers & Ghost Code
*   **Leftovers**: The codebase is largely clean of `console.log` and `debugger` statements.
    *   One `TODO` found in `src/utils/dummyData.js`, which appears to be part of a string literal for sample data (Safe).
*   **Ghost Code**: No obvious unused imports were flagged by basic scanning, but the monolithic nature of the files above likely hides unused internal helper functions or state variables.

## Recommendations
1.  **Refactor `LedgerPage.jsx`**: Immediately extract `NewDecisionModal`, `ReviewModal`, `DecisionCard`, and other sub-components into their own files under `src/features/Ledger/components/`.
2.  **Decompose `ChronosModal.jsx`**: Split into `CalendarView`, `TaskPanel`, `SignalPanel`, and separate Form components.
3.  **Extract Inline Components**: Move `GridSlot`, `SessionItem`, and `URLImage` to their own files.
4.  **Enforce Linting Rules**: Consider adding ESLint rules to prevent defining multiple React components in a single file to stop this drift from recurring.
