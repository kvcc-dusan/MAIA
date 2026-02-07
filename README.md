# Maia

Maia is a React-based personal knowledge management and operating system interface.

## Core Components

Maia is built on a few key pillars for its UI and functionality:

- **`ChronosModal`** (`src/components/ChronosModal.jsx`):
  The central hub for Task and Event management. It handles creating and editing items with a complex, responsive UI that includes date picking, priority setting, and signal (tag) management.

- **`WorldMapWidget`** (`src/components/WorldMapWidget.jsx`):
  A D3.js-based geovisualization widget. It renders a world map with time-based lighting effects, used for visualizing global context.

- **`GlassSurface`** (`src/components/GlassSurface.jsx`):
  The foundational UI building block. It provides the "Glass" effect with backdrop blur, noise texture, and rim lighting, ensuring a consistent aesthetic across the application.

## Glass Design System

The "Glass" aesthetic is defined by a set of standard Tailwind classes and utility components.

### Standard Classes
To maintain visual consistency, use the following utility classes or their equivalents:

- **Background**: `bg-black/80` (or `bg-zinc-900/40` via `.glass-panel`) - Dark, semi-transparent backgrounds.
- **Blur**: `backdrop-blur-xl` - Heavy background blur to separate content from the layer behind.
- **Border**: `border-white/10` (or `border-white/5`) - Subtle white borders for edge definition.
- **Rounding**: `rounded-[24px]` for large containers, `rounded-xl` for inner elements.

### Utilities
- **`.glass-panel`**: Defined in `src/index.css`, this utility combines `bg-zinc-900/40`, `backdrop-blur-xl`, `border`, `border-white/5`, and `shadow-2xl`.

## Project Structure

The project follows a hybrid architecture, separating reusable UI components from feature-specific domains.

### Directory Layout

- **`src/pages/`**: Top-level route components (Views) representing distinct screens (e.g., `HomePage`, `JournalPage`, `GraphPage`).
- **`src/components/`**: Reusable UI components and specific feature modules.
    - **`src/components/Graph/`**: Contains the complex components for the Graph visualization feature.
    - **`src/components/ui/`**: Low-level generic UI elements.
- **`src/lib/`**: Pure functions, domain logic, and utilities (e.g., `markdown.js` for text processing, `ids.js` for UUIDs).
- **`src/hooks/`**: Custom React hooks (e.g., `useDebounced.js`, `useSize.js`).
- **`src/context/`**: Global state management (e.g., `DataContext.jsx`).

### Naming Conventions

- **Components**: PascalCase (e.g., `GlassCard.jsx`, `ProjectIcon.jsx`).
- **Hooks**: camelCase, prefixed with `use` (e.g., `useDebounced.js`).
- **Libraries/Utilities**: camelCase (e.g., `ids.js`, `parseContentMeta.js`).

## Development

- `npm install`: Install dependencies.
- `npm run dev`: Start the development server.
- `npm run lint`: Run ESLint.
- `npm test`: Run tests with Vitest.
- `npm run build`: Build for production.
