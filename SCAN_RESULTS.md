**Codebase Health Scan Results**

### 1. Complexity Creep (>300 lines)
The following files have grown significantly in complexity:
- `src/pages/LedgerPage.jsx` (1137 lines)
- `src/components/ChronosModal.jsx` (688 lines)
- `src/pages/NotesPage.jsx` (663 lines)
- `src/pages/CanvasPage.jsx` (594 lines)
- `src/components/DailyTimeline.jsx` (552 lines)
- `src/App.jsx` (374 lines)
- `src/features/Graph/components/GraphRenderer.jsx` (317 lines)
- `src/components/ProjectIcon.jsx` (309 lines)
- `src/features/Graph/pages/GraphPage.jsx` (307 lines)

### 2. Leftovers (Temporary comments, logs, debuggers)
- `src/utils/dummyData.js:46`: Found `"TODO: ..."` inside sample data (Note: This might be a false positive as it's part of the dummy data content itself).

*(Note: Active `console.log` or `debugger` statements meant to be temporary were not found across the source files. Only standard `console.error` and `console.warn` for legitimate error boundaries and local storage error reporting were present).*

### 3. Ghost Code (Unused Imports & Variables)
Detected via static analysis (`npm run lint`):
- **`src/App.jsx`**: `ensurePermission` and `handleOpenLedger` are defined but never used.
- **`src/components/ChronosModal.test.jsx`**: `fireEvent` and `waitFor` are unused.
- **`src/components/FocusWidget.jsx`**: `onOpenPulse` is unused.
- **`src/components/ui/CustomSelect.jsx`, `DateTimePicker.jsx`, `PillSelect.jsx`, `dock.jsx`**: `motion` from framer-motion is imported/defined but never used.
- **`src/context/DataContext.jsx`**: `parseContentMeta` is unused.
- **`src/features/Graph/components/GraphControls.jsx`**: `showSignals` and `setShowSignals` are unused.
- **`src/features/Ledger/components/OutcomeDistribution.jsx`**: `cn` and `total` are unused.
- **`src/features/Opus/components/ExecutionPanel.jsx`**: `showPromote` is unused.
- **`src/features/Opus/components/ProjectResume.jsx`**: `taskId` is unused.
- **`src/features/Opus/components/ResourcesPanel.jsx`**: `e` is unused.
- **`src/features/Opus/components/TimelinePanel.jsx`**: `idx` is unused.
- **`src/lib/time.js`**: `excludeId` is unused.
- **`src/pages/HomePage.jsx`**: `ledger`, `reminders`, and `updateNote` are unused.
- **`src/pages/JournalPage.jsx`**: `onOpenLedger` is unused.
- **`src/pages/ProjectsPage.jsx`**: `notes`, `setNotes`, and `pushToast` are unused.
- **`src/pages/NotesPage_ModalSnippet.jsx`**: Entire unused leftover snippet file with multiple undefined variable errors (`showDeleteConfirm`, `notes`, etc.).

### 4. Structure Drift (Components Defined Outside Established Structure)
These files define multiple significant components inline instead of abstracting them into their own files under `src/components` or `src/features`:
- **`src/pages/LedgerPage.jsx`**: Defines `CloseButton`, `ConfirmModal`, `RenameModal`, `NewDecisionModal`, `ReviewModal`, `DecisionDetailModal`, `DecisionCard`, and `SectionDivider` directly inside the page file.
- **`src/pages/CanvasPage.jsx`**: Defines `CanvasBoard` and `URLImage` inline.
- **`src/components/DailyTimeline.jsx`**: Defines `GridSlot` and `SessionItem` inline.
- **`src/components/GlassCard.jsx`**: Defines `GlassCard`, `GlassListItem`, `GlassInput`, `GlassTextarea` all together. While common for UI primitives, it creates structure drift if they grow.
- **`src/components/ui/pill.jsx`**: Groups multiple pill variants.

### Recommended Actions
1. **Refactor inline components** out of `LedgerPage.jsx` and `CanvasPage.jsx` into dedicated feature component files to reduce line count and improve modularity.
2. **Decompose large monoliths** like `LedgerPage.jsx`, `ChronosModal.jsx`, and `NotesPage.jsx` to address complexity creep.
3. **Clean up ghost code** by removing the unused variables flagged by eslint to maintain codebase hygiene.
4. **Delete the leftover file** `src/pages/NotesPage_ModalSnippet.jsx`.
