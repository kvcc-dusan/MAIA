# Maia Style Guide

This project follows strict coding standards to ensure consistency, maintainability, and readability.

## 1. CSS Framework: Tailwind CSS

We use [Tailwind CSS](https://tailwindcss.com/) for all styling.

### Rules
*   **Avoid Inline Styles:** Do not use `style={{ ... }}` unless the value is dynamic (e.g., calculated at runtime) or strictly required by a third-party library.
*   **Utility First:** Use Tailwind utility classes for layout, typography, colors, and spacing.
*   **Arbitrary Values:** Use arbitrary values (e.g., `w-[350px]`) only when standard spacing/sizing utilities do not fit the design requirements.

### Example

**Bad:**
```jsx
<div style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
  <h1 style={{ color: 'white' }}>Title</h1>
</div>
```

**Good:**
```jsx
<div className="flex flex-col p-2.5">
  <h1 className="text-white">Title</h1>
</div>
```

## 2. Formatting

We enforce consistent formatting via ESLint.

### Rules
*   **Indentation:** Use **2 spaces** for indentation.
*   **Quotes:** Use **double quotes** (`"`) for strings and JSX attributes.
*   **Semicolons:** Always use semicolons at the end of statements.
*   **Trailing Commas:** Use trailing commas where possible (ESLint default).

### Example

**Bad:**
```javascript
const myComponent = () => {
    const name = 'Maia'
    return <div className='p-4'>{name}</div>
}
```

**Good:**
```javascript
const MyComponent = () => {
  const name = "Maia";
  return <div className="p-4">{name}</div>;
};
```

## 3. Component Props

We use strict prop validation to catch bugs early.

### Rules
*   **PropTypes:** All components must define `propTypes`.
*   **Default Props:** Define default values for optional props using default parameters in the function signature.

### Example

**Bad:**
```jsx
export default function Card({ title, active }) {
  return <div>{title}</div>;
}
```

**Good:**
```jsx
import PropTypes from "prop-types";

export default function Card({ title, active = false }) {
  return (
    <div className={active ? "bg-white" : "bg-black"}>
      {title}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string.isRequired,
  active: PropTypes.bool,
};
```

## 4. Linting

Run the linter to check for violations:

```bash
npm run lint
```
