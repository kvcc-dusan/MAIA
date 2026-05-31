# Architecture Audit Report

**Date:** October 26, 2023
**Auditor:** Staff Principal Engineer
**Scope:** `/src` directory (React Best Practices, Component Architecture, Code Consistency)

---

## Executive Summary

The application exhibits a high degree of UI polish and creative interaction design (Glassmorphism, WebGL integration). However, the underlying architecture suffers from significant scalability and performance risks. The primary issues stem from monolithic component structures, expensive main-thread computations for data analysis, and potential memory leaks in canvas history management.

---

## 1. Critical Issues
*Immediate attention required to prevent bugs, crashes, or severe performance degradation.*

### 1.1. DOM ID Collision in Reusable Component
**File:** `src/components/GlassSurface.jsx`
**Line:** 9 (approx)
**Issue:** The component defines an SVG filter with a static ID `glass-filter`. When multiple `GlassSurface` components are rendered (e.g., in `Dock`, `ProjectsPage`), this results in duplicate IDs in the DOM. This invalidates HTML semantics and can cause rendering artifacts in browsers that reference the first ID found.

**Current Code:**
```jsx
<filter id="glass-filter">
```

**Refactored Approach:**
Generate a unique ID for each instance or move the definition to a global provider/layout.

```jsx
// src/components/GlassSurface.jsx
import React, { useId } from "react";

const GlassSurface = ({ children, className = "" }) => {
    const uniqueId = useId();
    const filterId = `glass-filter-${uniqueId}`;

    return (
        <div className={`...`}>
            <svg className="...">
                <defs>
                    <filter id={filterId}>
                         {/* ... */}
                    </filter>
                </defs>
            </svg>
            <div
                style={{
                    backdropFilter: `url(#${filterId}) saturate(1.8) blur(16px)`,
                    // ...
                }}
            />
            {/* ... */}
        </div>
    );
};
```

### 1.2. Memory Leak Risk in Canvas History
**File:** `src/pages/CanvasPage.jsx`
**Line:** 53
**Issue:** The `pushHistory` function performs a deep clone of the entire state (`strokes`, `notes`, `images`, `links`) and pushes it onto a stack. For a long-lived session with many edits, this will rapidly consume memory, potentially crashing the browser tab.

**Current Code:**
```jsx
const pushHistory = () => {
  const snapshot = {
    strokes: deepClone(strokes),
    notes: deepClone(notes),
    // ...
  };
  // ...
};
```

**Refactored Approach:**
Implement an immutable data structure library (like `immer` or `immutable.js`) or only store deltas/actions.

```jsx
// Recommendation: Use 'use-immer' for structural sharing
import { useImmer } from "use-immer";

// Alternatively, limit stack size more aggressively and consider offloading to IndexedDB
const MAX_HISTORY = 50;
s.stack = s.stack.slice(0, s.idx + 1).concat(snapshot).slice(-MAX_HISTORY);
```

### 1.3. Component Definition Inside Render Loop
**File:** `src/pages/LedgerPage.jsx`
**Line:** 168
**Issue:** `DecisionCard` is defined inside the `DecisionLedger` component. This causes the component function to be re-created on every render of the parent, forcing React to unmount and remount the `DecisionCard` instance. This destroys internal state and focus, and hurts performance.

**Current Code:**
```jsx
export default function DecisionLedger({ ledger = [], setLedger }) {
    // ...
    const DecisionCard = ({ d }) => (
        // ...
    );
    // ...
}
```

**Refactored Approach:**
Move the component definition outside.

```jsx
// src/pages/LedgerPage.jsx

const DecisionCard = ({ d, setReviewingId }) => (
    <div className="...">
       {/* ... */}
    </div>
);

export default function DecisionLedger({ ledger = [], setLedger }) {
    // ...
    return (
        // ...
        {openDecisions.map(d => <DecisionCard key={d.id} d={d} setReviewingId={setReviewingId} />)}
    );
}
```

---

## 2. Major Issues
*Significant impact on maintainability, performance, or development velocity.*

### 2.1. Heavy Computation on Main Thread
**File:** `src/pages/GraphPage.jsx`
**Line:** 68 (approx)
**Issue:** `findClusters` and `calculateVelocity` iterate over all notes and tags. This is executed inside `useMemo`, which runs on the main thread during render. As the dataset grows (e.g., >1000 notes), this will cause noticeable UI freezes (jank) when navigating or updating notes.

**Current Code:**
```jsx
const analysis = useMemo(() => {
    const rawClusters = findClusters(notes);
    const velocityStats = calculateVelocity(notes);
    // ...
}, [notes]);
```

**Refactored Approach:**
Offload analysis to a Web Worker or use `requestIdleCallback` / time-slicing. For now, at least ensure it doesn't block interaction by wrapping in a transition or using a separate effect that updates state asynchronously.

```jsx
// Simplified Async Approach
const [analysis, setAnalysis] = useState(null);

useEffect(() => {
    // Ideally use a Web Worker here
    const runAnalysis = async () => {
        const rawClusters = findClusters(notes);
        const velocityStats = calculateVelocity(notes);
        setAnalysis({ rawClusters, velocityStats });
    };
    runAnalysis();
}, [notes]);
```

### 2.2. Expensive Event Listener Logic
**File:** `src/components/ChronosModal.jsx`
**Line:** 162
**Issue:** The resize logic adds a `mousemove` listener that updates state (`setRightWidth`) on every pixel change. This triggers a re-render of the entire, large `ChronosModal` component tree.

**Current Code:**
```jsx
const onMove = (e) => {
  // ...
  setRightWidth(w); // Triggers re-render
};
```

**Refactored Approach:**
Split the layout into a container that handles the resizing and renders children, or use a ref for the style updates and only commit to state on `mouseup` (if persistence is needed).

```jsx
// Ref-based resize for performance
const containerRef = useRef(null);
const widthRef = useRef(rightWidth);

const onMove = (e) => {
    requestAnimationFrame(() => {
        const w = calculateWidth(e);
        if (containerRef.current) {
             containerRef.current.style.gridTemplateColumns = `minmax(0,1fr) ${w}px`;
        }
        widthRef.current = w;
    });
};

const onUp = () => {
    setRightWidth(widthRef.current); // Commit state once
    // ... cleanup
};
```

### 2.3. Monolithic Component (God Object)
**File:** `src/App.jsx`
**Line:** 22 (`AppContent`)
**Issue:** `AppContent` handles routing logic, global state consumption (`useData`), layout, global modals (`Chronos`, `Toast`, `CommandPalette`), and keyboard shortcuts. This violates the Single Responsibility Principle and makes testing and refactoring difficult.

**Refactored Approach:**
Extract providers and layout components.

```jsx
// src/Layout.jsx
export function Layout({ children }) {
  return (
    <div className="h-screen ...">
       <Dock />
       <MainContent>{children}</MainContent>
       <GlobalModals />
    </div>
  )
}

// src/App.jsx
export default function App() {
  return (
    <DataProvider>
      <Router /> {/* Custom router or standard library */}
    </DataProvider>
  );
}
```

### 2.4. Unstable Context Value
**File:** `src/context/DataContext.jsx`
**Line:** 151
**Issue:** The context `value` object is recreated whenever any data (`notes`, `projects`, etc.) changes. While `useMemo` is used, the dependency array includes *all* data. This means a change in `tasks` will trigger a re-render for a component that only consumes `notes` (if it uses `useContext(DataContext)`). The action functions (`createNote`, etc.) are also recreated on every render because they are defined in the component body.

**Refactored Approach:**
1. Memoize action functions using `useCallback`.
2. Split Contexts (e.g., `NotesContext`, `TasksContext`) or use a Reducer pattern to keep dispatch stable.

```jsx
// Example: Stabilizing Actions
const createNote = useCallback(() => {
    // ...
    setNotes(prev => ...);
}, [setNotes]); // Dependency is stable setter

const value = useMemo(() => ({
    notes,
    createNote, // Now stable reference
    // ...
}), [notes, createNote, ...]);
```

---

## 3. Minor Issues
*Code quality, consistency, and best practices.*

### 3.1. Insecure ID Generation
**File:** `src/lib/ids.js`
**Line:** 2
**Issue:** Uses `Math.random()` for ID generation. This is not cryptographically secure and has a higher collision probability than standard UUIDs.
**Fix:** Use `crypto.randomUUID()` (modern browsers) or a library like `nanoid`.

### 3.2. Synchronous LocalStorage Blocking
**File:** `src/hooks/useLocalStorage.js`
**Line:** 5
**Issue:** `localStorage.getItem` is synchronous and blocking. Reading it during the initial render state computation can delay the First Contentful Paint (FCP), especially if the stored data is large (e.g., large notes database).
**Fix:** For large data, consider loading asynchronously in a `useEffect` and showing a loading state, or using IndexedDB.

### 3.3. Duplicate/Confusing Component Files
**File:** `src/components/HomePage.jsx` vs `src/pages/HomePage.jsx`
**Issue:** Two files named `HomePage.jsx` exist. One seems to be an unused or alternate component version. This causes confusion.
**Fix:** Delete the unused one or rename them clearly (e.g., `HomeWidget.jsx` vs `HomeRoute.jsx`).

### 3.4. Hardcoded Styling & Values
**File:** `src/components/Navbar.jsx`
**Line:** 44
**Issue:** Inline styles used for layout: `style={{ gridTemplateColumns: "auto 1fr auto" }}`.
**Fix:** Use Tailwind utility classes: `grid-cols-[auto_1fr_auto]`.

### 3.5. Hook Naming Convention
**File:** `src/hooks/useDebounced.js`
**Issue:** The hook is named `useDebounced` but behaves like `useDebouncedEffect` (it runs a side effect). This is misleading for developers expecting it to return a value.
**Fix:** Rename to `useDebouncedEffect`.

### 3.6. Global Timer Leak
**File:** `src/utils/notify.js`
**Line:** 1
**Issue:** `let timers = new Map();` is defined in module scope. If the app is part of a micro-frontend or re-initialized, these timers persist.
**Fix:** Manage timers within a React Context or a cleanable service class.

---

## 4. Recommendations for Next Steps

1.  **Refactor `App.jsx`**: Break down the routing and layout logic into smaller, composed components.
2.  **Optimize `GlassSurface`**: Implement the `useId` fix immediately to ensure DOM validity.
3.  **Performance Pass**: Move heavy analysis logic (graph clustering) to a Web Worker.
4.  **Testing Strategy**: The codebase currently lacks tests. Introduce unit tests for `src/lib` utilities and component tests for complex interactive elements like `EditorRich`.
