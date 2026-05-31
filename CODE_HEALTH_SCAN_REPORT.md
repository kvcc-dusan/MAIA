# MAIA Codebase Health Scan Report

This report was generated automatically. Only issues are reported; no rewrites have been made unless trivial.

## 1. Complexity Creep
The following files have grown significantly in complexity (>300 lines) or exhibit high cyclomatic complexity:

*   **`src/pages/LedgerPage.jsx (1138 lines, approx CC: 133)`**
*   **`src/components/ChronosModal.jsx (689 lines, approx CC: 113)`**
*   **`src/pages/NotesPage.jsx (664 lines, approx CC: 97)`**
*   **`src/components/DailyTimeline.jsx (553 lines, approx CC: 76)`**
*   **`src/pages/ProjectsPage.jsx (288 lines, approx CC: 73)`**
*   **`src/hooks/useWeather.js (181 lines, approx CC: 70)`**
*   **`src/pages/CanvasPage.jsx (595 lines, approx CC: 70)`**
*   **`src/features/Graph/components/GraphRenderer.jsx (318 lines, approx CC: 68)`**
*   **`src/features/Opus/components/ExecutionPanel.jsx (262 lines, approx CC: 51)`**
*   **`src/features/Graph/pages/GraphPage.jsx (308 lines, approx CC: 45)`**
*   **`src/components/ui/DateTimePicker.jsx (220 lines, approx CC: 43)`**
*   **`src/App.jsx (375 lines, approx CC: 39)`**
*   **`src/components/EditorRich.jsx (258 lines, approx CC: 38)`**
*   **`src/pages/EditorPage.jsx (174 lines, approx CC: 36)`**
*   **`src/context/DataContext.jsx (282 lines, approx CC: 33)`**
*   **`src/lib/analysis/index.js (215 lines, approx CC: 33)`**
*   **`src/components/ProjectIcon.jsx (310 lines, approx CC: 13)`**

## 2. Leftovers
The following temporary artifacts (e.g., `console.log`, `debugger`, or `// TODO` comments) were found:

*   No leftovers found (note: string literal 'TODO' in `src/utils/dummyData.js` is considered a false positive and excluded).

## 3. Ghost Code
Unused variables, imports, or functions found via static analysis (ESLint):

*   ESLint reports 26 unused variables/imports across the codebase.
    Examples:
    *   `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
    *   `src/components/ChronosModal.test.jsx`: `fireEvent`, `waitFor`
    *   `src/pages/HomePage.jsx`: `ledger`, `reminders`, `updateNote`
    *   `src/pages/ProjectsPage.jsx`: `notes`, `setNotes`, `pushToast`
    *   *Note: Run `npx eslint src` to see the complete list.*

## 4. Structure Drift
New components are being defined outside the established project structure (e.g., inline within page files):

*   **`src/pages/CanvasPage.jsx`**: Defines multiple components inline (CanvasBoard, URLImage). Consider extracting these to `src/components/` or `src/features/`.
*   **`src/pages/JournalPage.jsx`**: Defines multiple components inline (JournalHistoryList, Journal). Consider extracting these to `src/components/` or `src/features/`.
*   **`src/pages/LedgerPage.jsx`**: Defines multiple components inline (CloseButton, ConfirmModal, RenameModal, NewDecisionModal, ReviewModal, DecisionDetailModal, DecisionCard, SectionDivider, LedgerPage). Consider extracting these to `src/components/` or `src/features/`.
*   **`src/pages/NotesPage.jsx`**: Exhibits structure drift by defining `PIN` and `NotesOverview` components inline.
*   **`src/App.jsx`**: Exhibits structure drift by defining the `AppContent` component inline.
*   **`src/components/DailyTimeline.jsx`**: Exhibits structure drift by defining `GridSlot` and `SessionItem` components inline.
