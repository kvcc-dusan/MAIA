# State of MAIA

**Date:** 2026-09-18 · **Branch:** `ds/foundation` · **Method:** 7 parallel audit agents (shell, notes/vault, data, Tauri, features, code health, design) + direct runtime and build verification.

Every `file:line` below was re-checked by hand. Anything not independently confirmed is marked **(unverified)**.

---

## Verdict

**MAIA is closer than the code health suggests, and further than the demo suggests.**

The structure is genuinely good: Tauri compiles clean in 15s, 50/50 tests pass, the vault adapter is real, the composed-primitives layer exists, the Ledger decision→review→outcome loop actually closes, and every Opus panel reads real state. This is not a prototype wearing a costume.

What's missing is the boring, unglamorous layer that separates "impressive" from "trustworthy": **the app loses data quietly.** Five of six entities can drop their last second of changes on quit. Quota exhaustion is a `console.warn`. Corrupt storage is discarded without a backup. Highlight marks and footnotes are destroyed on every save cycle. There is no export path — none, for any entity.

You can't daily-drive something you can't trust with a decision you typed thirty seconds ago.

The second problem is that **`CLAUDE.md` is substantially fiction**, which means every AI-assisted session on this repo starts by being misinformed about the styling system, the token names, the fonts, and the file layout.

Fix the persistence layer and the docs, and MAIA is usable. Both are small. Neither is interesting. That's the job.

---

## P0 board — the sprint

These block daily use. Ordered by (damage × cheapness to fix).

| # | Issue | Where | Effort |
|---|-------|-------|--------|
| 1 | **`CLAUDE.md` is wrong about the entire styling system** — wrong Tailwind major, token names that don't exist, wrong fonts, wrong file layout, a page that was deleted | `CLAUDE.md` | S |
| 2 | **`useLocalStorage` cancels its own pending write on unmount** — no unload flush, no Tauri close hook. Quit within 1s of any change to tasks/projects/ledger/reminders/sessions = silently lost | `src/hooks/useLocalStorage.js:24-41` | S |
| 3 | **Quota exhaustion silently drops writes** — `console.warn` only; UI keeps showing "saved" for data that never persisted | `src/hooks/useLocalStorage.js:32-35` | S |
| 4 | **No export/backup path for anything** — projects, tasks, ledger, reminders, sessions live only in localStorage, one browser-data-clear from total loss | *(nothing exists)* | M |
| 5 | **Conditional hooks in the note editor** — `useCallback` called inline inside conditionally-rendered JSX props. Live Rules-of-Hooks violation in the most-used component | `src/pages/EditorPage.jsx:112-113` | S |
| 6 | **Highlight marks destroyed on every save** — Highlight is a toolbar feature; `tiptap-markdown` has no serializer for it, so marked text writes to disk as plain text | `src/components/EditorRich.jsx:172` | S |
| 7 | **Wikilinks go nowhere** — `App.jsx:262` passes `onOpenInternalLink`, `EditorPage` never destructures it. `[[Links]]` are decorative styling only | `src/pages/EditorPage.jsx:10`, `src/App.jsx:262` | S–M |
| 8 | **`csp: null` + `fs:scope: $HOME/**`** — write/remove/rename over the entire home directory with no content-security-policy | `src-tauri/tauri.conf.json:23-25`, `src-tauri/capabilities/default.json:20` | M |
| 9 | **Base64 assets share the quota with all app state** — 5MB/file, no total cap, written into `maia.projects`. A few screenshots poison writes for *every* entity | `src/features/Opus/components/AssetsPanel.jsx:29-42` | M |
| 10 | **Externally-deleted notes vanish silently** — no toast, no dialog; if open in the editor, the next edit recreates the file with no warning | `src/lib/vault.js:24-53`, `src/hooks/useNotesStore.js:47-56` | M |

---

## Ground truth (measured, not estimated)

```
npx eslint src/          21 errors, 12 warnings (33 problems, 1 auto-fixable)
npm test -- --run        50/50 passing, 9 files, 0 failures
npm run lint:tokens      124 violations / 24 files
                         (77 hex, 27 rgba, 20 white/black alpha,
                          0 arbitrary z-index / radius / font-size)
npx tauri build --debug  EXIT 0 — Finished in 15.05s, binary produced
npm run build            EXIT 0 — main chunk 2,368.95 kB (728 kB gzip)
```

Runtime console on load: SW script fetch failure + two unhandled geolocation rejections.

---

## Lane 1 — Shell & navigation

**Broken**
- **[P0] SW registered unconditionally, including in Tauri** — `src/main.jsx:31-35`. `vite.config.js:13` explicitly comments that the desktop build "must not register a service worker (stale-cache hell inside the webview)" and disables VitePWA via `disable: isTauri`, but `main.jsx` registers `/sw.js` anyway with no guard. `isTauri()` already exists at `src/lib/vault.js:9`. **S**
- **[P1] Two service workers collide in the web build** — `vite-plugin-pwa` generates its own `dist/sw.js` + injects `dist/registerSW.js`, **overwriting `public/sw.js`**. Verified: `dist/sw.js` is workbox output, not the 9-line stub. The `notificationclick` handler in `public/sw.js` is silently destroyed in production. Meanwhile `main.jsx` hand-registers `/sw.js` against base `/MAIA/`, producing the console error. **S**

**Missing**
- **[P1] No Escape/back affordance off `editor`/`overview`/`projects`** — `src/App.jsx:217-282`. `onBack` is wired only for `NotesPage` (`:240`). No router means mouse back/forward and Escape do nothing; the dock is the only exit. **S–M**

**Risks**
- **[P2] Restored `currentNoteId` isn't validated against `notes`** — `src/App.jsx:65-70`. `currentNote` falls back to `null` at `:93-96`, so it's contained, but a deleted-note reload renders `EditorPage` with `note={null}` instead of redirecting home.

**Ideas**
- **[P2] `MobileTabBar` is fully built but unused by the desktop target** — `src/components/ui/dock.jsx:78-152`.

---

## Lane 2 — Notes / Editor / vault (the core loop)

**Broken**
- **[P0] Highlight marks silently dropped on save** — `src/components/EditorRich.jsx:172`. Confirmed: no `highlight` serializer exists in `tiptap-markdown`. Fix: register a `==text==` mark spec. **S**
- **[P0] `src/lib/markdown.js` is entirely dead code** — 69 lines: DOMPurify sanitization, wikilink resolution, callouts (`> [!info]`), image-size shorthand (`![alt](url|640x320)`), footnotes. `grep` for `makeMarkdown` returns **only its own definition and its test file**. None of those features exist anywhere in the running app, and `markdown.test.js` tests code nothing calls. **M** — wire it into a real read mode, or delete it and its test.
- **[P0] Wikilinks are decoration, not links** — `src/components/EditorRich.jsx:112-146` applies a ProseMirror `Decoration.inline` for styling with no click handler. `App.jsx:111` defines `openInternalByTitle` and passes it at `:262`; `EditorPage`'s signature is `({ note, updateNote, projects = [] })` — **the prop is silently discarded**. **S–M**
- **[P0] Footnotes aren't in the edit path** — `markdown-it-footnote` is wired into the dead `markdown.js:32`; TipTap's schema has no footnote node. `[^1]` syntax opens as inert literal text and can be mangled by nearby edits. **M**
- **[P1] `beforeunload` flush is async and unawaitable** — `src/hooks/useNotesStore.js:132-138` + `WRITE_DEBOUNCE_MS = 1000` at `:16`. Tauri native close may not fire it at all. **M** — use `onCloseRequested`.

**Half-built**
- **[P1] Failed vault writes only retry if the user edits that note again** — `src/hooks/useNotesStore.js:88-99`. On error the item returns to `pendingRef` but no retry timer is scheduled from inside `flush`. Unmounted drive + no further edit = the change sits in memory forever, `console.error` only. **S–M**
- **[P1] External changes picked up on window focus only** — `src/hooks/useNotesStore.js:73-79`. No `watch`/`watchImmediate` from `@tauri-apps/plugin-fs` anywhere. Obsidian or iCloud editing while MAIA is foregrounded goes unnoticed. Silent last-writer-wins, no merge, no diff warning. **M**
- **[P2] "Reading mode" only flips `editable`** — `src/pages/EditorPage.jsx:96-104`. Not a rendered preview, just non-editable WYSIWYG.

**Missing**
- **[P0] No handling for a note file deleted out from under the app** — `src/lib/vault.js:24-53`, `src/hooks/useNotesStore.js:47-56`. Clean notes just disappear from the list on next focus reload. **M**
- **[P1] No write-failure UI at all** — `console.error` only at `vault.js:70,88` and `useNotesStore.js:96`. Full disk or revoked permission produces zero user signal. `meta.error` is already plumbed at `useNotesStore.js:141` — just surface it. **S**

**Risks**
- **[P1] Frontmatter parser is hand-rolled regex, not YAML** — `src/lib/noteFile.js:33-59`. Matches single-line `key: value` only. Obsidian's standard block form (`tags:\n  - foo`) fails to parse and silently yields empty fields. For an explicitly Obsidian-interop vault, this is a real interop bug. **M**
- **[P2] ID collisions drop the losing note** — `src/lib/vault.js:33-40`. `uid()` is 7-char base36 (`src/lib/ids.js:2`); collision odds at realistic vault sizes are ~1e-5, so the **ID space is fine** — the bug is the *handling*: `nextMap.set` overwrites and the other note's content silently leaves the list with only a `console.warn`. Fix the collision path, not the generator. *(Corrects the agent's "plausible at hundreds of notes" claim — the math doesn't support that.)*

---

## Lane 3 — Data layer & persistence

**Broken**
- **[P0] Pending write cancelled on unmount** — `src/hooks/useLocalStorage.js:24-41`. The cleanup `clearTimeout` fires on unmount, not just on the next change, and there's no `beforeunload` flush (`grep` confirms the only one in `src/` is notes-only at `useNotesStore.js:139`). Last ~1s of *every* non-note entity is lost on quit. **S**
- **[P0] Quota exhaustion silently drops writes** — `src/hooks/useLocalStorage.js:32-35`. **S–M**
- **[P0] Base64 assets in the shared quota key** — `src/features/Opus/components/AssetsPanel.jsx:29-42` → `project.assets` → `STORAGE_KEYS.PROJECTS`. **M**
- **[P1] Dead duplicate ledger API** — `src/context/DataContext.jsx:263-284` defines and exports `createDecision`/`reviewDecision`/`deleteDecision`; **zero callers outside the file** (verified). `src/pages/LedgerPage.jsx:473-496` reimplements all three against `setLedger` directly. Two divergent implementations of the same writes. **S**

**Half-built**
- **[P1] Only one legacy shape is migrated** — `src/context/DataContext.jsx:16-39` handles `maia.journal` → notes and nothing else. No backfill for fields added later to tasks (`desc`, `status`, `schedule` at `:177-194`); pre-existing records read `undefined` forever. **M**
- **[P1] Five of six entities never touch the vault** — `src/hooks/useNotesStore.js` gives notes a real `status`/`error`/`reload` contract; `projects`, `tasks`, `reminders`, `ledger`, `sessions` (`DataContext.jsx:14,42,45-47`) are plain `useLocalStorage`. On the primary desktop target, most of your data isn't in the vault at all. **L**

**Missing**
- **[P0] No export/backup path anywhere** — nothing across `src/` beyond the one-way, one-time notes migration in `vault.js` and a per-asset download. **M**
- **[P1] Corrupt JSON discarded without backup** — `src/hooks/useLocalStorage.js:12-19` falls back to `initial`; the raw string is never stashed. Unrecoverable. Fix: write `<key>.corrupt.<ts>` before resetting. **S**

**Risks**
- **[P1] Note→project relationship has two live representations** — `moveNoteToProject` (`DataContext.jsx:86-114`) writes `project: null` and populates `projectIds`, while `dummyData.js:104-113` and the journal migration (`:24-33`) still set the legacy `project` string, and `src/lib/analysis/index.js:100-102` still branches on `n.project`. Note shape now depends on origin. **S–M**
- **[P2] `dummyData.js:64-76` omits `assets: []`** that `createProject` always sets (`DataContext.jsx:150-165`) — `AssetsPanel` sees `undefined` for sample projects.
- **[P2] `TASK_PRIORITIES` / `SIGNAL_PRIORITIES` are an identical alias** — `src/lib/constants.js:1-9`. Either diverge them or collapse them.

---

## Lane 4 — Tauri desktop path

**Good news first:** `npx tauri build --debug` exits 0 in 15.05s and produces `src-tauri/target/debug/app`. Product metadata and the full icon set are real, not scaffolding. The desktop path works.

**Risks**
- **[P0] `csp: null` + `$HOME/**` fs scope** — `src-tauri/tauri.conf.json:23-25`, `src-tauri/capabilities/default.json:20`. Granted permissions include `fs:allow-write-text-file`, `fs:allow-remove`, `fs:allow-rename`, `fs:allow-mkdir` across the entire home directory, with CSP injection disabled. Any script injected into the webview has an unrestricted filesystem bridge. Fix: explicit CSP + runtime `fs.scope.allow` narrowed to the picked vault. **M**
- **[P1] Debounced write loss on crash/force-quit** — same root cause as lane 2/3.
- **[P1] Duplicate-ID load drops a note** — `src/lib/vault.js:37-39`.

**Missing**
- **[P1] No filesystem watcher** — `src/hooks/useNotesStore.js:74-80` is focus-only. **M**
- **[P1] No conflict handling / mtime check before overwrite** — `src/lib/vault.js:57-74`. **M**

**Half-built**
- **[P1] No updater or signing** — no `tauri-plugin-updater` dep, no pubkey. Fine for local use; blocks any distribution. **M**

**Ideas**
- **[P2] No native menu, tray, or global shortcut** — `src-tauri/src/lib.rs` registers only fs/dialog/log. Cmd+N, tray quick-capture. **M**
- **[P2] No writability check on the picked vault folder** — `src/lib/vault.js:11-13`; a read-only mount only fails at first `saveNote`. **S**

---

## Lane 5 — Opus / Graph / Ledger

**These are real, not demos.** Every Opus panel reads live `DataContext` state and calls real mutations (`addTask`, `updateTask`, `deleteTask`, `setNextAction`, `updateProject`). The Ledger lifecycle genuinely closes: create at `LedgerPage.jsx:475` (`status:"open"`) → `ReviewModal` (`:150-215`) → `completeReview` (`:485-492`) sets `outcome`/`outcomeStatus`/`reviewedAt` → `CalibrationChart` and `OutcomeDistribution` consume it.

**Half-built**
- **[P1] `seedData()` ships in production and nukes the ledger** — `src/pages/LedgerPage.jsx:539`, reachable from the settings menu at `:737`. Generates 50 `Math.random()` decisions and calls `setLedger(newDecisions)` — a full replace. One confirm dialog, no snapshot, no undo. Gate behind `import.meta.env.DEV`. **S**
- **[P2] Graph has no node-count guard or LOD** — `src/features/Graph/pages/GraphPage.jsx:180-220`, `src/features/Graph/hooks/useGraphSimulation.js:20-40`. The simulation `.restart()`s on any `nodes`/`links` reference change; memoize identity before optimizing forces. **M**

**Risks**
- **[P1] Asset dataURLs** — `src/features/Opus/components/AssetsPanel.jsx:29-44`. Confirmed persisted (see lane 3).

**Note on the uncommitted work:** the `ExecutionPanel.jsx` diff (776 lines changed) is a **finished refactor, not abandoned WIP** — it replaces a hand-rolled `createPortal` menu with composed `Menu.Context`/`Popover`, adds `p1/p2/p3` sorting (`PRIORITY_ORDER`, line 24), a structured composer, inline-edit popover, and a `ConfirmDialog`-backed "Clear completed". All handlers wire to real `useData()` mutations. The `SCHEDULES` addition in `src/lib/constants.js` supports it. **Recommend committing it.**

---

## Lane 6 — Code health & architecture

**Broken**
- **[P0] Conditional hooks** — `src/pages/EditorPage.jsx:112-113`. Verified via ESLint: 2 `react-hooks/rules-of-hooks` errors. The `useCallback`s are inline in JSX props inside conditionally-rendered markup. **S**

**Missing (tests)**
- **[P1] `src/lib/vault.js` has zero tests** — the disk I/O boundary for the primary target. Highest-value gap in the repo. **M**
- **[P1] `src/hooks/useNotesStore.js` (145 lines) untested.** **M**
- **[P1] `DataContext.jsx` (317 lines) has 3 tests** — CRUD paths are the highest-risk untested surface. **M**
- **[P2] `EditorPage.jsx` untested** — a test would have caught the hooks bug. **[P2]** `useWeather.js` untested.

**Half-built**
- **[P2] Dead props suggesting abandoned wiring** — `OpusLayout.jsx:20` (`onDeleteProject` unused), `FocusWidget.jsx:13` (`onOpenPulse` unused), `ResourcesPanel.jsx:28`.

**Risks**
- **[P2] Dead hook** — `src/hooks/useSize.js` (27 lines) imported nowhere. Delete.
- **[P2] `LedgerPage.jsx:562` reimplements ID generation** via `Math.random().toString(36).substring(7)` instead of `uid()` from `src/lib/ids.js`.
- **[P2] `ProjectIcon.jsx` mixes component + constant exports** — 3× `react-refresh/only-export-components` (lines 7, 390, 393); breaks Fast Refresh. Split constants into `src/lib/projectIcons.js`. **S**

**Extraction targets** (ideas, all P2/M): `CustomIcon.jsx` (1054) → data-driven `ui/icons/`; `LedgerPage.jsx` (1030) → move the four inline modals/cards to the existing `features/Ledger/components/`; `NotesPage.jsx` (677) → new `features/Notes/components/`; `ChronosModal.jsx` (644) → `features/Chronos/`. `DailyTimeline.jsx` (482) is well-scoped — leave it.

---

## Lane 7 — Design system & UX

**Missing**
- **[P0] `EmptyState`/`ErrorState` primitives are never used by real pages** — the only importers are `GlassErrorBoundary.jsx` and `dev/Gallery.jsx`. Everything else hand-rolls, e.g. `src/features/Ledger/components/OutcomeDistribution.jsx:36-40` renders a bare `<div>No reviews yet</div>`. **M**
- **[P0] Icon-only buttons lack accessible names** — `src/components/composed/IconButton.jsx:10-12` admits in its own docstring that only ~14% of MAIA's 154 buttons have an `aria-label`. Concrete case: `src/pages/EditorPage.jsx:85-90`, icon-only toggle with `title` but no `aria-label`. 63 raw `<button>` matches without one across `pages/` + `features/`. **M**
- **[P1] Zero `prefers-reduced-motion` handling** — no hits for `useReducedMotion` or the media query anywhere, despite heavy Framer Motion use. **S–M**
- **[P1] Hand-rolled overlays bypass the primitives** — `src/pages/ProjectsPage.jsx:143` and `src/features/Graph/components/GraphControls.jsx:69` implement custom modal/drawer overlays instead of `composed/SidePanel` / `composed/AppDialog`, losing focus-trap and Escape handling. **M**

**Risks**
- **[P1] `maia-design-system/` at repo root is empty** — contains only `.DS_Store` files and an empty `project/` folder. Either it's an abandoned export or a placeholder; either way it misleads about where the real design system lives (`src/styles/tokens.css`). Delete it. **S**

**Token debt** is concentrated in canvas/chart code where literal colors feed SVG/Recharts props rather than Tailwind classes: `src/styles/components.css` (22), `GraphPage.jsx` (15), `ProjectIcon.jsx` (14), `GlassSurface.jsx` (11), `GraphControls.jsx` (8), `GraphRenderer.jsx` (8), `KnowledgePanel.jsx` (8). The ratchet already fully fences arbitrary font-size, radius and z-index — this is the remaining tail, not a systemic problem.

**Ideas**
- **[P2] Extend `lint-tokens.mjs` to ratchet `aria-label` / `IconButton` adoption**, turning the 14% number into an enforced trend. **S**
- **[P2] Add `Widget`, `EntityForm`, `DateTimeField`, `Surface` to `dev/Gallery.jsx`** — present in `composed/` but absent from the gallery. **S**

---

## Performance

- **Main JS chunk is 2,368.95 kB (728 kB gzip).** `GraphPage` does code-split correctly (20.20 kB chunk), but Three.js, D3 and Recharts remain eager in the main bundle. On desktop this is a startup-time cost rather than a bandwidth one, but it's the single biggest easy win: dynamic-import the chart and 3D libraries at their use sites. **M**

---

## Corrections to `CLAUDE.md`

The instructions file is materially wrong, and every AI session on this repo is primed with it. Verified against source:

| `CLAUDE.md` claims | Reality |
|---|---|
| Tailwind CSS 3 | **Tailwind 4.3.3** — `@tailwindcss/vite`, `@import 'tailwindcss'` |
| Tokens `--maia-black`, `--maia-glass-bg`, `--maia-border`, `--maia-ring`… | **Zero `--maia-*` variables exist** anywhere in `src/` |
| Spacing `--space-xs`…`--space-4xl`, fluid `--fluid-3xs`…`--fluid-3xl` | **None exist** |
| Fonts: Onest / IBM Plex Mono / Instrument Serif | **Manrope + Roboto** (`src/index.css:7-8`) |
| "Design tokens live in `src/index.css`" | `index.css` is a **16-line import manifest**; real tokens are shadcn-style `--color-*` in `src/styles/tokens.css` |
| `src/pages/CanvasPage.jsx` (~588 lines) | **Does not exist** |
| `ChronosModal.jsx` ~1911 lines | **644** |
| `LedgerPage.jsx` ~912 lines | **1030** |
| `NotesPage.jsx` ~624 lines | **677** |

Corrected complexity table:

| File | Lines | Issue |
|------|-------|-------|
| `src/components/ui/CustomIcon.jsx` | 1054 | Monolith icon switch — make data-driven or split per family |
| `src/pages/LedgerPage.jsx` | 1030 | Inline modals/cards belong in `features/Ledger/components/` |
| `src/pages/NotesPage.jsx` | 677 | Growing, watch it |
| `src/components/ChronosModal.jsx` | 644 | Already extracted DailyTimeline/TaskRow/SignalRow; consider `features/Chronos/` |
| `src/components/ProjectIcon.jsx` | 524 | Mixes component + constant exports, breaks Fast Refresh |
| `src/components/DailyTimeline.jsx` | 482 | Well-scoped, lowest priority |

**`HEALTH_REPORT.md`: delete it.** Dated 2024-05-22, overstates `ChronosModal` by >60%, and recommends decomposing a file that no longer exists. Once `CLAUDE.md`'s table is corrected it's redundant, and a stale health report is worse than none — it sends readers hunting for deleted files. *(Your call; flagging rather than acting.)*

---

## Repo hygiene

- `test_output.txt`, `test_debug.txt` — untracked scratch files at repo root.
- `Icon\r` — a tracked macOS custom-folder-icon artifact.
- `maia-design-system/` — empty, see lane 7.
- `src/lib/markdown.js` + `src/lib/markdown.test.js` — dead module and its test.
- `src/hooks/useSize.js` — dead hook.

---

## Suggested sequencing

**Sprint A — stop losing data (all S, one M).** P0 items 1, 2, 3, 5, 6 + the corrupt-JSON backup + surfacing `meta.error`. This is a day of work and it is the difference between a demo and an app you trust.

**Sprint B — close the vault loop.** Export/backup (P0 #4), deleted-file handling (#10), fs watcher, write-failure UI, mtime conflict guard, `onCloseRequested` flush.

**Sprint C — lock the desktop down.** Explicit CSP, runtime-scoped fs permissions, assets to disk instead of base64.

**Sprint D — the tail.** 21 lint errors, primitive adoption, aria-labels, bundle splitting, extraction of the monoliths.

Commit the `ExecutionPanel` refactor before any of this — it's finished and it's blocking a clean tree.
