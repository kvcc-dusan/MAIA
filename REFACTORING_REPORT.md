# Component Architecture & Reusability Report

## Executive Summary
The codebase exhibits a strong foundation with modern React patterns (Hooks, Functional Components) and a consistent design system (Glassmorphism). However, several key areas require refactoring to improve maintainability, performance, and scalability. The most critical issues are the monolithic nature of `ChronosModal.jsx` (1894 lines) and the centralized `DataContext.jsx` state management, which causes unnecessary re-renders across the application.

## 1. Component Size & Complexity

### `src/components/ChronosModal.jsx` (1894 lines)
**Issue:** This file is excessively large and violates the Single Responsibility Principle. It currently handles:
- **UI Rendering**: Modal layout, Calendar Grid, Task/Signal lists.
- **Form State**: Task creation/editing, Session creation/editing, Signal creation/editing.
- **Business Logic**: Drag-and-drop mechanics (custom implementation), Overlap detection, Time manipulation.
- **Sub-components**: Defines `Portal`, `CloseButton`, `PriorityCheckbox`, `CustomSelect`, `PillSelect`, `DateTimePicker`, `TaskRow`, `SignalRow` *inline*.

**Recommendation:**
1.  **Extract UI Components**: Move `DateTimePicker`, `CustomSelect`, `PillSelect`, `Portal` to `src/components/ui/`.
2.  **Extract Feature Components**: Move `TaskRow`, `SignalRow` to `src/components/chronos/`.
3.  **Extract Form Components**: Create `TaskForm`, `SessionForm`, `SignalForm` as separate components.
4.  **Extract Logic**: Move drag-and-drop and calendar math to a custom hook `useCalendarLogic.js`.

### `src/pages/CanvasPage.jsx` (588 lines)
**Issue:** While not as severe, this component mixes canvas rendering logic (Konva) with state management (history, tools).
**Recommendation:**
- Extract `useHistory` hook for undo/redo logic.
- Extract `Toolbar` and `PropertiesPanel` into separate components.

## 2. Reusable Patterns & UI Library

Several UI patterns are duplicated or implemented inline, leading to inconsistencies.

- **Popovers/Dropdowns**: `CustomSelect`, `PillSelect`, and `DateTimePicker` all implement their own "click outside" and "portal" logic.
    - *Action*: Create a reusable `Popover` or `Dropdown` component (or use a library primitive like Radix UI fully) to standardize this behavior.
- **Forms**: Input styles (`INPUT_CLASS`) are repeated.
    - *Action*: Create a `GlassInput` and `GlassTextarea` component in `src/components/ui/`.
- **Portals**: `Portal` is defined in `ChronosModal.jsx` but likely needed elsewhere.
    - *Action*: Move to `src/components/ui/portal.jsx`.

## 3. State Management & Coupling

### `src/context/DataContext.jsx`
**Issue:** Monolithic State. The `DataContext` holds `notes`, `projects`, `journal`, `ledger`, `tasks`, `reminders`, `sessions`.
**Impact:** Any update to a single task causes the *entire application* (via `App.jsx`) to re-render, as `App` consumes `useData`.
**Recommendation:**
- Split into multiple contexts:
    - `NotesContext` (Notes, Projects)
    - `JournalContext` (Journal, Ledger)
    - `ChronosContext` (Tasks, Reminders, Sessions)
- Use `useMemo` extensively or a library like Zustand/Recoil for atomic updates if performance becomes critical.

## 4. Component Composition & Routing

### `src/App.jsx`
**Issue:** Manual Routing. The app uses a string state (`currentPage`) to switch views.
**Impact:**
- No browser history support (back button doesn't work).
- No deep linking (cannot share a link to a specific note or view).
- Complex `render` method with conditional logic.
**Recommendation:**
- Adopt `react-router-dom`.
- Define routes for `/notes/:id`, `/projects`, `/calendar`, etc.
- Use `<Outlet />` for the main layout.

## 5. File Organization

**Current:**
- `src/components/` is a mix of generic UI (`GlassSurface`) and feature-specific (`ChronosModal`, `DecisionLedger`).
- `src/pages/` is good.

**Recommendation:**
- **`src/components/ui/`**: strictly for generic, reusable design system components (Button, Input, Card, Modal, Portal).
- **`src/features/`**: Group feature-specific components.
    - `src/features/chronos/` (ChronosModal, TaskRow, etc.)
    - `src/features/notes/` (EditorRich, NoteList)
    - `src/features/graph/` (GraphRenderer, GraphControls)

## 6. Prop Interfaces
- **`GlassSurface`**: Correctly uses `...props` to spread attributes, which is good for accessibility.
- **`ChronosModal`**: Receives too many props (`tasks`, `setTasks`, `reminders`, `setReminders`, etc.).
    - *Fix*: If `ChronosContext` is created, `ChronosModal` can consume it directly, reducing prop drilling from `App.jsx`.

## Proposed Refactoring Roadmap
1.  **Phase 1 (Immediate)**: Extract inline components from `ChronosModal.jsx` to `src/components/ui/`.
2.  **Phase 2 (Short-term)**: Split `DataContext` into domain-specific contexts.
3.  **Phase 3 (Medium-term)**: Implement `react-router-dom`.
