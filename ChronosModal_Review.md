# ChronosModal Code Quality & Performance Review

## 1. Performance Issues

### Critical: Unnecessary Re-renders during Drag Operations
**Line 619-623 (`isDragging`, `dragCurrent` state):**
The drag state is hosted in the top-level `ChronosModal` component.
- **Issue:** Every time the mouse moves during a drag operation (which fires `onMouseEnter` or `onMouseMove` frequently), `setDragCurrent` is called. This triggers a re-render of the *entire* modal, including the sidebar, the calendar grid, and the task lists.
- **Impact:** Significant lag during drag-and-drop interactions, especially on lower-end devices.
- **Fix:** Extract the Timeline visualization into a separate component (`TimelineGrid`) that manages its own drag state internally. Only call a parent callback (e.g., `onSessionUpdate`) when the drag operation completes (`onMouseUp`).

### Missing Memoization
**Lines 605-609 (`gridCells` calculation):**
```javascript
const monthStart = new Date(view.y, view.m, 1);
// ...
const gridCells = []; // loop logic
```
- **Issue:** The calendar grid is recalculated on every render, even when the `view` (month/year) hasn't changed.
- **Fix:** Wrap in `useMemo(() => { ... }, [view.y, view.m])`.

**Line 612 (`tasksOn` helper):**
```javascript
const tasksOn = (date) => tasks.filter((t) => t.due && sameDay(new Date(t.due), date) && !t.deleted);
```
- **Issue:** This function is recreated on every render.
- **Fix:** It's cheap to create, but it might break memoization of child components if passed down. The heavy part is the `tasks.filter` inside it which runs repeatedly during rendering of the grid. It would be better to pre-process tasks into a map `Map<DateString, Task[]>` inside a `useMemo`.

**Inline Event Handlers:**
- **Lines 824-830 (`TaskRow` props):** `onToggle={() => toggleTask(t.id)}`. This creates a new function identity every render, causing `TaskRow` to re-render even if `React.memo` were added to it.

## 2. Code Duplication

### Popover/Portal Logic
**Lines 115-177 (`CustomSelect`), 179-228 (`PillSelect`), 230-333 (`DateTimePicker`):**
- **Issue:** All three components implement their own "click outside" listeners (`useEffect`), positioning logic (`useLayoutEffect`), and Portal rendering.
- **Fix:**
    1.  Create a reusable `usePopover` hook or a generic `<Popover>` component (wrapping Radix UI which is already imported).
    2.  Extract `CloseButton` and `Portal` to `src/components/ui/` if they aren't already.

### Date Formatting
**Lines 280 and 590 (`toLocalInputValue`):**
- **Issue:** The `toLocalInputValue` function is defined twice.
- **Fix:** Move to `src/utils/date.js` or `src/lib/ids.js` (alongside `isoNow`).

### Session Rendering
**Lines 1070-1115 (Existing Sessions) vs Lines 1118-1144 (Ghost Draft) vs Lines 1147-1175 (Grid Draft):**
- **Issue:** The logic to calculate `top`, `height`, and render the session box is repeated three times with minor variations.
- **Fix:** Create a `<SessionBlock />` component that accepts `start`, `end`, `title`, `description`, and `status` ('draft', 'dragging', 'static') props.

## 3. Complex Functions

### Timeline Rendering Logic
**Lines 950-1170:**
- **Issue:** This section is deeply nested (map inside return) and contains inline handlers for `onMouseDown`, `onMouseEnter`, `onDoubleClick`.
- **Complexity:** It mixes view logic (grid lines), interaction logic (drag handlers), and data display (sessions).
- **Fix:** Extract into a `<TimelineView />` component.
    - Move `handleSlotDown`, `handleSlotEnter`, `handleSessionMouseDown`, `handleMouseUp` into this new component.

### `ChronosModal` Component
**Lines 560-1234 (Total ~670 lines):**
- **Issue:** The component acts as a "God Component", managing:
    - Global Modal State (Open/Close)
    - Data Fetching/Filtering (`tasksOn`, `upcomingSignals`)
    - Form State (`taskDraft`, `signalDraft`, `sessionDraft`)
    - Drag & Drop State
    - UI Layout (Sidebar + Main Content)
- **Fix:** Break down into:
    - `ChronosSidebar`: Handles Task/Signal lists.
    - `ChronosCalendar`: Handles the monthly grid.
    - `TimelineView`: Handles the daily schedule.
    - `TaskForm`, `SignalForm`, `SessionForm`: Separate components for the right-hand panel forms.

## 4. State Management

### Redundant State
**Lines 598-624 (State definitions):**
- **Issue:** There are ~15 `useState` calls.
- **Fix:**
    - Group form states: `const [formState, setFormState] = useState({ view: 'calendar', data: null })`.
    - Group drag state: `const [dragState, dispatchDrag] = useReducer(dragReducer, initialDragState)`.

### Derived State
**Lines 605-609 (Grid Cells):**
- As mentioned in performance, this should be derived via `useMemo`.

## 5. Memory Leaks

**Lines 123-126, 187-190, 246-249 (Click Listeners):**
```javascript
window.addEventListener("mousedown", globalClick);
```
- **Observation:** These clean up correctly. However, if multiple dropdowns are rendered (even if closed, depending on implementation), having many global listeners can be slightly inefficient.
- **Suggestion:** Radix UI's `Popover` handles this efficiently. Since `TaskRow` uses `@radix-ui/react-popover`, the custom components should too.

## 6. Prop Drilling

**Projects Prop:**
- **Path:** `ChronosModal` -> `TaskRow` (Context Menu).
- **Issue:** Not severe, but `projects` is passed down just for the context menu "Assign to Project".
- **Fix:** If nesting goes deeper, consider a `ProjectContext`. For now, it's acceptable but worth noting.

## Refactoring Roadmap

1.  **Extract `TimelineView.jsx`**: Move lines 950-1170 and associated drag state (619-624) into a new component.
2.  **Extract `forms/`**: Create `TaskForm.jsx`, `SignalForm.jsx`, `SessionForm.jsx` moving logic from lines 660-800 and render blocks 1178-1280.
3.  **Utility Extraction**: Move `toLocalInputValue` to `src/lib/utils.js`.
4.  **Component Reuse**: Replace `CustomSelect` and `DateTimePicker` internals with Radix UI primitives or a shared `PopoverBase`.
