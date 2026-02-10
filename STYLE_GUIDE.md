# Code Style & Consistency Guide

This document outlines the coding conventions and best practices for the project.

## 1. File Naming

*   **Components & Pages:** Use `PascalCase` (e.g., `ChronosModal.jsx`, `HomePage.jsx`).
*   **Hooks:** Use `camelCase` prefixed with `use` (e.g., `useWeather.js`).
*   **Libraries & Utils:** Use `camelCase` (e.g., `ids.js`, `notify.js`).
*   **Tests:** Co-located with the file they test, using `.test.jsx` or `.test.js` (e.g., `FocusTaskItem.test.jsx`).

## 2. Code Style

### Naming Conventions

*   **Variables & Functions:** `camelCase` (e.g., `isOpen`, `createSignal`).
*   **Components:** `PascalCase` (e.g., `TaskRow`).
*   **Constants:** `SCREAMING_SNAKE_CASE` for global/file-level constants (e.g., `NEON_BLUE`, `REFRESH_INTERVAL`).
*   **Props:** `camelCase`.

### Import Order

Imports should be grouped and ordered as follows:

1.  **React & Ecosystem:** `import React, { ... } from "react";`, `import { createPortal } from "react-dom";`
2.  **Third-Party Libraries:** `import * as Popover from "@radix-ui/react-popover";`
3.  **Internal Context & Hooks:** `import { useData } from "../context/DataContext";`
4.  **Internal Components:** `import ProjectIcon from "./ProjectIcon";`
5.  **Internal Utils & Libs:** `import { cn } from "@/lib/utils";`
6.  **Assets & Styles:** `import "./App.css";`

### Component Structure

1.  **Imports**
2.  **Constants & Helpers** (that don't need to be inside the component)
3.  **Component Definition**
    *   Hooks (`useState`, `useEffect`, etc.)
    *   Derived State / Memos
    *   Event Handlers
    *   Render
4.  **Sub-components** (if kept in the same file)

## 3. Comments & Documentation

*   **JSDoc:** Use JSDoc for hooks, complex utility functions, and API helpers. Explain parameters and return values.
*   **Section Comments:** Use section comments to divide large files (e.g., `// --- CONSTANTS ---`, `// --- HELPERS ---`).
*   **Inline Comments:** Explain *why* something is done, not *what* is done, especially for complex logic.

## 4. Best Practices

*   **Magic Numbers:** Avoid hardcoded values. Extract them to constants with descriptive names.
*   **Tailwind CSS:** Use the `cn` utility for class merging and conditional classes.
*   **State Management:** Keep state as local as possible. Move global state to `DataContext`.
*   **Accessibility:** Ensure interactive elements have appropriate ARIA attributes and keyboard support.
