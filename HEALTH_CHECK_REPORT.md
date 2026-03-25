# HEALTH CHECK REPORT

## 1. Complexity Creep
The following files have grown significantly in complexity, deep nesting, and/or line counts:
- `src/pages/LedgerPage.jsx` (~1137 lines)
- `src/components/ChronosModal.jsx` (~688 lines)
- `src/pages/NotesPage.jsx` (~663 lines)
- `src/pages/CanvasPage.jsx` (~594 lines)
- `src/components/DailyTimeline.jsx` (~552 lines)
- `src/App.jsx` (~374 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (~317 lines)
- `src/components/ProjectIcon.jsx` (~309 lines)
- `src/features/Graph/pages/GraphPage.jsx` (~307 lines)

## 2. Leftovers
- `src/utils/dummyData.js`: Contains a "TODO: - [ ] Fix bug - [ ] Deploy to prod" string, though this is likely a false positive as it appears inside sample data strings.
- `src/pages/NotesPage_ModalSnippet.jsx`: Appears to be an orphaned artifact or fragmented JSX snippet.

## 3. Ghost Code
ESLint static analysis identified several unused imports, variables, and functions (ghost code) across the codebase, contributing to clutter. Examples include:
- `src/App.jsx`: `ensurePermission`, `handleOpenLedger`
- `src/context/DataContext.jsx`: `parseContentMeta`
- Various Opus/Ledger components: e.g., `showPromote` in `ExecutionPanel.jsx`, `taskId` in `ProjectResume.jsx`, `total` and `cn` in `OutcomeDistribution.jsx`.

## 4. Structure Drift
- Components defined inline inside page files instead of their own separate files. Examples include:
  - `src/pages/LedgerPage.jsx`: Inline components like `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider`.
  - `src/pages/NotesPage.jsx`: `PIN`, `NotesOverview`.
  - `src/pages/CanvasPage.jsx`: `URLImage`, `CanvasBoard`.
  - `src/components/DailyTimeline.jsx`: `GridSlot`, `SessionItem`.
  - `src/App.jsx`: `AppContent`.
- Duplicated/divergent logic: `NewDecisionModal` and `ReviewModal` exist as standalone components but are also defined inline in `src/pages/LedgerPage.jsx`.
- Reusable UI components sometimes grouped together: e.g., `src/components/GlassCard.jsx` groups `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea`.
