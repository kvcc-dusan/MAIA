# Testing Strategy & Roadmap

## Overview
This document outlines the recommended testing strategy for the Maia application. Currently, the codebase has ~25 unit tests covering basic utilities and simple components. The goal is to expand coverage to critical user flows, complex logic, and data persistence.

## 1. Critical Paths
The following areas are essential for the application's core value and must be prioritized for testing:

1.  **Data Persistence (`DataContext.jsx`)**
    *   **Why:** This is the "brain" of the app. It manages all state (Notes, Projects, Tasks, Ledger). If this fails, the user loses data.
    *   **Risk:** Monolithic state update logic can lead to regressions in one area when modifying another.
2.  **Calendar & Task Management (`ChronosModal.jsx`)**
    *   **Why:** Complex interaction logic (drag-and-drop, resizing) and time calculations.
    *   **Risk:** Overlapping sessions, timezone bugs, and data corruption during drag operations.
3.  **Note Editing (`EditorRich.jsx`)**
    *   **Why:** Primary input method for knowledge management.
    *   **Risk:** Markdown parsing errors, data loss during switching, and plugin compatibility (Tiptap).

## 2. Edge Cases to Test

### Time & Scheduling (`ChronosModal`)
*   **Midnight Crossover:** Sessions that start on one day and end on the next (currently clipped, but needs verification).
*   **Timezones:** Ensuring `useWeather` and `ChronosModal` handle UTC vs Local time consistently.
*   **Past Time:** Dragging events into the past (should be prevented or handled).
*   **Overlap:** Creating a 4th session when 3 exist in the same slot (logic validation).

### Data Integrity (`DataContext`)
*   **Empty States:** App load with clear `localStorage`.
*   **Corrupted Data:** `localStorage` containing malformed JSON.
*   **Concurrent Updates:** Rapidly adding tasks or notes.

### Input Handling
*   **Markdown Injection:** XSS attempts via Markdown (partially covered in `markdown.test.js`, need to verify `EditorRich` integration).
*   **Large Inputs:** Pasting massive text blocks into `EditorRich`.

## 3. Integration Tests (Component Level)
These tests verify that components work together correctly.

*   **ChronosModal + DataContext:**
    *   Verify that `saveTask` in `ChronosModal` correctly updates the `tasks` array in `DataContext`.
    *   Verify that `deleteTask` removes it from both view and context.
*   **EditorRich + DataContext:**
    *   Verify that typing in the editor triggers `updateNote`.
    *   Verify that switching notes updates the editor content without leaking state.
*   **Drag & Drop Logic:**
    *   Simulate drag events in `ChronosModal` and verify the new start/end times are calculated correctly *before* saving.

## 4. End-to-End (E2E) Scenarios
Recommended tool: **Playwright** (currently not installed).
These tests simulate a real user.

1.  **The "Daily Flow":**
    *   Open App.
    *   Check Weather (verify widget loads).
    *   Open Chronos (Calendar).
    *   Create a Task ("Buy Milk").
    *   Drag Task to Calendar (Create Session).
    *   Mark Task as Done.
    *   Verify Task is crossed out.
2.  **Project & Notes:**
    *   Create a new Project "Alpha".
    *   Create a new Note.
    *   Type "# Alpha" and verify it links to the project.
    *   Verify Note appears in Project view.

## 5. Test Utilities & Mocks Needed

To facilitate the above, we need to implement:

*   **`renderWithContext(ui, { providerProps, ...options })`**: A custom render function for RTL that wraps the component in `DataProvider` with mocked state.
*   **`mockLocalStorage`**: A robust mock to reset state between tests.
*   **`mockResizeObserver`**: Required for `useSize` and Canvas components.
*   **`mockRange` / `mockGetClientRects`**: Required for Tiptap (JSDOM doesn't implement these layout methods).

## 6. Coverage Gaps & Roadmap

### Phase 1: Foundation (Weeks 1-2)
*   [ ] **Action:** Refactor `ChronosModal` logic (overlap, time checks) into a pure utility file (`src/lib/time-utils.js`).
*   [ ] **Test:** Write extensive unit tests for `src/lib/time-utils.js`.
*   [ ] **Test:** Expand `DataContext.test.jsx` to cover *all* actions (createProject, deleteProject, etc.).

### Phase 2: Component Interactions (Weeks 3-4)
*   [ ] **Setup:** Create `renderWithContext` helper.
*   [ ] **Test:** Write integration tests for `ChronosModal.jsx` (rendering tasks, opening forms).
*   [ ] **Test:** Write integration tests for `DecisionLedger.jsx`.

### Phase 3: Reliability (Week 5+)
*   [ ] **Setup:** Install Playwright.
*   [ ] **Test:** Implement "Daily Flow" E2E test.
*   [ ] **Test:** Implement "Project & Notes" E2E test.

## Recommendation for Immediate Action
Extract the `checkOverlap`, `hasOverlap`, and `isPastTime` functions from `src/components/ChronosModal.jsx` into `src/lib/chronos.js`. This will allow you to immediately unit test the most complex logic in the app without wrestling with React rendering tests.
