# Codebase Health Check Report

**Date:** 2025-02-18

This report identifies signs of degradation, complexity creep, and structure drift within the codebase.

## 1. Complexity Creep

The following files have grown significantly in size and complexity, often exceeding 500 lines of code and handling multiple concerns that should be separated.

*   **`src/pages/LedgerPage.jsx` (1139 lines)**: This file is critically large. It contains the entire logic for the Decision Ledger, including multiple inline modal components, detailed card rendering, and complex state management for filtering, sorting, and editing.
*   **`src/components/ChronosModal.jsx` (686 lines)**: While some components have been extracted (`TaskRow`, `SignalRow`), this file still manages the entire state for the calendar view, task lists, signal lists, and session management. It also contains inline form logic for creating/editing tasks, signals, and sessions.
*   **`src/pages/NotesPage.jsx` (664 lines)**: A large page component that likely handles too much responsibility regarding note management and display.
*   **`src/pages/CanvasPage.jsx` (594 lines)**: Contains complex canvas logic (React Konva) and state management for drawing, notes, and images.
*   **`src/components/DailyTimeline.jsx` (552 lines)**: Handles complex drag-and-drop interactions and time slot rendering.

## 2. Structure Drift

Several components are defined inline within page files or other components, violating the established project structure where reusable components should reside in their own files in `src/components/` or `src/features/`.

*   **`src/pages/LedgerPage.jsx`**:
    *   Defines `NewDecisionModal` inline, which conflicts with the existing `src/components/NewDecisionModal.jsx`. The inline version appears to be a different implementation.
    *   Defines `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, `SectionDivider`, `CloseButton`, `ConfirmModal`, and `RenameModal` inline.
    *   `DecisionCard` also exists as `src/components/DecisionCard.jsx`, creating duplication and potential inconsistency.
*   **`src/pages/CanvasPage.jsx`**:
    *   Defines `URLImage` inline.
*   **`src/components/DailyTimeline.jsx`**:
    *   Defines `GridSlot` and `SessionItem` inline.

## 3. Duplication & Inconsistency

*   **Decision Ledger Implementation**: There is a significant overlap between `src/pages/LedgerPage.jsx` and `src/components/DecisionLedger.jsx`.
    *   `src/App.jsx` uses `LedgerPage` as a main route but also uses `DecisionLedger` as a modal.
    *   `DecisionLedger.jsx` imports `NewDecisionModal` from `src/components/NewDecisionModal.jsx`.
    *   `LedgerPage.jsx` defines its own `NewDecisionModal`.
    *   This results in two different versions of the "New Decision" form being used in the application, leading to inconsistent user experience and maintenance nightmares.

## 4. Ghost Code

*   **Unused/Redundant Components**:
    *   `src/components/NewDecisionModal.jsx` and `src/components/DecisionCard.jsx` might be underutilized or superseded by the inline versions in `LedgerPage.jsx`, or vice versa. The codebase is currently maintaining two sets of similar components.

## Recommendations

1.  **Refactor `LedgerPage.jsx`**: Extract inline components (`NewDecisionModal`, `ReviewModal`, `DecisionCard`, etc.) into separate files in `src/features/Ledger/components/` or reconcile them with existing components in `src/components/`.
2.  **Unify Decision Ledger Logic**: Merge `LedgerPage.jsx` and `DecisionLedger.jsx` to share the same underlying components and logic.
3.  **Decompose `ChronosModal.jsx`**: Extract the form sections (TaskForm, SignalForm, SessionForm) into separate components. Move the calendar grid logic to a separate component.
4.  **Extract Inline Components**: Move `URLImage` from `CanvasPage.jsx` and `GridSlot`/`SessionItem` from `DailyTimeline.jsx` to their own files.
