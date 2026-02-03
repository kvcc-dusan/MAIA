# Maia

**Maia** is a personal knowledge management and visualization dashboard built with modern web technologies. It combines text editing, data visualization, and generative art to create a unique workspace.

## Features

### 1. Interactive Knowledge Graph
- **Component**: `GraphRenderer.jsx`
- **Tech**: D3.js (Force Layout)
- **Description**: Visualize connections between notes and projects.
  - **Force-Directed Layout**: Nodes naturally repel while links pull connected items together.
  - **Semantic Zoom**: Labels fade in/out based on zoom level and node importance.
  - **Search Highlighting**: instantly filter and dim the graph to find relevant nodes.

### 2. Generative Fluid Backgrounds
- **Component**: `ColorBends.jsx`
- **Tech**: Three.js, GLSL (Custom Shaders)
- **Description**: A high-performance, GPU-accelerated fluid simulation.
  - **Domain Warping**: Uses layered sine waves to create organic, liquid-like motion.
  - **Interactive**: Responds to mouse movement with parallax and distortion effects.
  - **Configurable**: Adjustable speed, color palette, and complexity.

### 3. Data Visualization Widgets
- **Component**: `WorldMapWidget.jsx`
- **Tech**: D3-Geo, TopoJSON
- **Description**: Stylized map visualizations.
  - **Europe Focus**: Custom projection centering on Central Europe.
  - **Real-time Data**: Integrated clock and weather placeholders.
  - **SVG Animations**: Pulsing location indicators using SMIL.

### 4. Rich Text Editor
- **Tech**: Tiptap, Markdown
- **Description**: A block-based rich text editor with Markdown support.

## Project Structure

```
src/
├── components/
│   ├── Graph/           # D3 Graph implementation
│   │   └── GraphRenderer.jsx
│   ├── ColorBends.jsx   # WebGL Background
│   ├── WorldMapWidget.jsx # Map visualization
│   └── ...              # UI building blocks (GlassCard, Dock, etc.)
├── lib/                 # Utilities and themes
├── pages/               # Application routes
└── ...
```

## Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualization**: [D3.js](https://d3js.org/)
- **3D / WebGL**: [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmndrs.assets/react-three-fiber)
- **Editor**: [Tiptap](https://tiptap.dev/)

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Run Tests**:
   ```bash
   npm test
   ```
