# Optimization Plan

This document outlines the performance analysis and optimization steps taken for the Maia project.

## Summary of Changes

### 1. Bundle Size Reduction
*   **Dependency Cleanup:** Removed 15+ unused packages including `lexical` ecosystem, `markdown-it` ecosystem, and `lowlight`. This significantly reduces the `node_modules` size and potential bundle weight.
*   **Tree Shaking:**
    *   Refactored `src/pages/GraphPage.jsx` to use named imports from `d3` instead of `import * as d3`. This allows bundlers to drop unused D3 modules.
    *   Refactored `src/components/ColorBends.jsx` to use named imports from `three`.

### 2. Code Splitting & Dead Code Removal
*   **Dead Code:** Deleted `src/lib/markdown.js` which was an unused wrapper around `markdown-it`.

### 3. Rendering Performance
*   **GraphPage Optimization:**
    *   Decoupled the heavy D3 physics simulation from visual updates.
    *   Changing visual parameters (Node Size, Text Size, Link Thickness) no longer destroys and recreates the entire DOM/Simulation. It now transitions attributes on existing elements, resulting in 60fps UI interactions.
*   **Global Filters:**
    *   Refactored the expensive SVG `glass-filter` definition. Previously, it was defined inside `GlassSurface.jsx`, causing ID collisions and repeated DOM elements.
    *   Moved the filter definition to a single global component `src/components/GlobalFilters.jsx` rendered once in `App.jsx`.

## Remaining Opportunities (Low Hanging Fruit)

### 1. Asset Optimization
The following images are excessively large and should be resized or converted to WebP:

*   `public/maia-icon.png` (1.4MB) - Should be resized to standard icon sizes (e.g., 192x192, 512x512) and compressed (< 50KB).
*   `src/assets/maia-logo.png` (1.4MB) - Appears to be the same file. Should be optimized.
*   `public/temp_yosemite.jpg` (207KB) - Could be further compressed if used as a background.

### 2. CSS & Effects
*   **Backdrop Filter:** The application uses `backdrop-blur-xl` and `saturate(1.8)` heavily. This is GPU-intensive.
    *   *Recommendation:* Consider adding a "Low Power Mode" setting that disables backdrop filters or reduces the blur radius.
*   **Glass Filter:** The custom SVG displacement filter (`#glass-filter`) adds rendering cost.
    *   *Recommendation:* Verify if this subtle effect is visible on all screens. If not, consider removing it for mobile devices.

### 3. Three.js Usage
*   `ColorBends.jsx` manages a Three.js scene imperatively, while `Dither.jsx` uses `@react-three/fiber`.
    *   *Recommendation:* Refactor `ColorBends.jsx` to use `@react-three/fiber` for better resource management (automatic disposal) and consistency.

## Verification

*   Run `npm run build` to verify that the bundle builds successfully with the reduced dependencies.
*   Run `npm run lint` to ensure code quality.
