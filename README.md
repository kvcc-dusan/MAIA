# Maia

Maia is a React-based personal knowledge management and operating system interface.

## Project Structure

The project follows a standard React application structure with specific conventions for components and logic.

### Directory Layout

- **`src/pages/`**: Top-level route components (Views) representing distinct screens (e.g., `HomePage`, `JournalPage`, `GraphPage`).
- **`src/components/`**: Reusable UI components.
    - **`src/components/features/`** (Suggested): Feature-specific complex widgets should be grouped here in the future. Currently, complex features like `Graph` live in `src/components/Graph/`.
- **`src/lib/`**: Pure functions, business logic, and utilities (e.g., `analysis/`, `ids.js`, `markdown.js`).
- **`src/hooks/`**: Custom React hooks (e.g., `useDebounced.js`).
- **`src/context/`**: Global state management (e.g., `DataContext.jsx`).

### Naming Conventions

- **Components**: PascalCase (e.g., `GlassCard.jsx`, `ProjectIcon.jsx`).
    - Component filenames should match their default export name.
- **Hooks**: camelCase, prefixed with `use` (e.g., `useDebounced.js`).
- **Libraries/Utilities**: camelCase (e.g., `ids.js`, `parseContentMeta.js`).

## Development

- `npm install`: Install dependencies.
- `npm run dev`: Start the development server.
- `npm run lint`: Run ESLint.
- `npm test`: Run tests with Vitest.
- `npm run build`: Build for production.
