# DataContext & State Management Review

## 1. Context Optimization

### Current Issues
The `DataContext` is currently implemented as a "monolithic" context. The `value` object passed to `DataContext.Provider` includes:
1.  **All State**: `notes`, `projects`, `tasks`, `reminders`, `journal`, etc.
2.  **All Actions**: `createNote`, `updateProject`, `addTask`, etc.

**The Problem:**
Every time *any* piece of state changes (e.g., ticking a checkbox on a task), the `value` object is recreated (despite `useMemo`, because one dependency changed). This causes **all consumers** of `useData()` to re-render.

In `src/App.jsx`, the `AppContent` component consumes `useData()`. This means `AppContent`—the root of your application layout—re-renders on every single keystroke in the Note Editor or interaction in the Task list. This propagates re-renders down to all children (unless they are strictly memoized, which many are not).

### Recommendations
**A. Split Contexts (State vs. Dispatch)**
Split the context into two: `DataStateContext` and `DataDispatchContext`.
*   `DataStateContext`: Holds the data.
*   `DataDispatchContext`: Holds the functions (`createNote`, `updateNote`, etc.).

Since `useCallback` functions usually have stable dependencies (or can be made stable with `useReducer`), `DataDispatchContext` will rarely update. Components that only need to *dispatch* actions (like a button adding a task) won't re-render when the *list* of tasks changes.

**B. Domain-Specific Contexts**
For better scalability, consider splitting by domain:
*   `NotesContext`
*   `TasksContext`
*   `JournalContext`

**C. Push Context Consumption Down**
Refactor `App.jsx` to avoid reading all data at the top level.
*   **Current**: `App` reads `notes`, filters them, and passes `filteredNotes` to `NotesPage`.
*   **Optimized**: Pass only the *search query* to `NotesPage`. Let `NotesPage` consume `useData()` internally to filter notes. This isolates the re-render to the `NotesPage` component.

## 2. LocalStorage Efficiency

### Current Issues
The `useLocalStorage` hook performs a `JSON.stringify(state)` and `localStorage.setItem(...)` inside a `useEffect` that runs on **every state update**.

```javascript
// src/hooks/useLocalStorage.js
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(state));
}, [key, state]);
```

**The Problem:**
*   **Blocking Main Thread**: `JSON.stringify` is synchronous and CPU-intensive for large datasets (like long notes with Markdown).
*   **High Frequency**: If a user types fast in the editor, `updateNote` is called on every keystroke. This triggers a write to disk ~5-10 times per second, causing input lag.

### Recommendations
**Implement Debouncing**:
Wrap the storage logic in a debounce function so it only writes to disk after the state has settled (e.g., 500ms or 1s).

```javascript
useEffect(() => {
  const handler = setTimeout(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, 1000); // 1 second debounce

  return () => clearTimeout(handler);
}, [key, state]);
```

## 3. Data Normalization & Integrity

### Current Issues
1.  **Array Lookups (O(N))**: `notes`, `tasks`, etc., are stored as arrays. Finding an item requires `.find()`, and updating requires `.map()`. While acceptable for < 1000 items, it scales linearly.
2.  **Schema Inconsistency (Critical)**:
    *   `moveNoteToProject`: Updates `note.project` (Singular, likely a Name string).
    *   `addProjectToNote`: Updates `note.projectIds` (Array of IDs).
    *   This suggests two conflicting data models are active simultaneously, which will lead to bugs in the "Projects" view.

### Recommendations
**A. Normalize Data Structures**
Use Objects (Dictionaries) or `Map` for faster lookups (O(1)).
```javascript
// Normalized State
{
  ids: ["id1", "id2"],
  entities: {
    "id1": { id: "id1", title: "Note 1", ... },
    "id2": { id: "id2", title: "Note 2", ... }
  }
}
```

**B. Fix Project Schema**
Standardize on **IDs** for relationships.
*   Deprecate `note.project` (string name).
*   Use `note.projectIds` (array of IDs) exclusively.
*   Update `moveNoteToProject` to resolve the project Name to an ID before assigning.

## 4. Action Patterns (useReducer)

### Current Issues
The `DataProvider` manages many independent `useState` hooks. The logic for complex updates (like "Deleting a project should remove it from all notes") is hidden inside `useCallback` bodies.

### Recommendations
**Adopt `useReducer`**
Switch to a reducer pattern to centralize state logic. This makes it easier to:
1.  Handle complex cross-slice updates (e.g., `DELETE_PROJECT` also updates `notes`).
2.  Keep the `dispatch` function strictly stable (it never changes), ensuring `DataDispatchContext` never causes re-renders.

```javascript
function dataReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n => n.id === action.id ? ... : n)
      };
    // ...
  }
}
```

## 5. Stale Closures & Race Conditions

### Current Issues
**Toast Race Condition**:
```javascript
const pushToast = useCallback((msg) => {
  setToast(msg);
  setTimeout(() => setToast(null), 2200);
}, []);
```
If `pushToast` is called twice quickly, the first timeout will clear the second toast prematurely.

**Recommendation**: Use a `ref` to track the active timeout ID and clear it before setting a new one.

```javascript
const timerRef = useRef();
const pushToast = useCallback((msg) => {
  if (timerRef.current) clearTimeout(timerRef.current);
  setToast(msg);
  timerRef.current = setTimeout(() => setToast(null), 2200);
}, []);
```

## 6. Type Safety

### Current Issues
The code is standard JavaScript with no JSDoc types. This makes it hard to know what properties a `note` or `task` object is expected to have (e.g., does a task have a `due` date? Is it a string or Date object?).

### Recommendations
Add JSDoc definitions in `src/lib/types.js` (or inline) to document shapes.

```javascript
/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string[]} [projectIds]
 * @property {string} createdAt - ISO Date string
 */
```
