# MAIA Sprint — Tasks 1–6 of GLM_MASTER_PROMPT (Today, Chronos, Palette, Consistency, Quality, Docs)

All facts below were verified against source by three exploration agents + direct reads. Baselines to confirm at start: vitest 84/84, `npx eslint src/` 19e/12w, `lint:tokens` 124/24 files, build 2,378 kB main chunk, `tauri build --debug --no-bundle` exit 0. None may regress; drive each down where the task says to.

## Phase 0 — Baseline + FINDINGS.md (no commit yet)
- Run all five baseline commands, record numbers.
- Start `FINDINGS.md` (repo root) with discoveries already made: broken `var(--)` font-family at `components.css:50,354`, `GraphRenderer.jsx:136`, `KnowledgePanel.jsx:231` (`var(--, monospace)`); dead `no-scrollbar` class in `ui/command.jsx:86`; ESLint lints `src-tauri/target` (config only ignores `dist`); `⌘K` listener only opens, never toggles (`App.jsx:231-240`); framer-motion imported-but-unused in `dock.jsx:2`; ~10 unused heavy deps (`@react-three/fiber`, `postprocessing`, `ogl`, `lowlight`, 3 tiptap extensions…) — report only, do NOT uninstall; Chronos day-click deselect is a hidden mode switch (tasks-on-day → all-open-tasks); Gallery lacks a Widget section.
- Start dev server (`npm run dev` → http://localhost:5183/MAIA/), screenshot Today/Chronos/Palette at 1440×900 and 420×480 (before shots).

## Phase 1 — Task 1: Today screen (commit 1)
**Decision (user-approved): hero header + filling grid.**
- `TodayGrid.jsx`: merge the floating Edit row into a real page header (eyebrow `TODAY · Thu, Sep 18` + greeting h1 + quote subline + Add-widget/Edit controls right-aligned — `isEditing` state stays local). Match `PageHeader`/`PageTitle` treatments (eyebrow style, `font-heading text-3xl`).
- Grid fills height: root becomes `flex flex-col` with header `flex-none`, grid `flex-1 min-h-0` + `auto-rows-fr` (rows share leftover height; `min-h-64` floors keep small windows sane; page still scrolls at 420×480 via HomePage root scroller).
- Dock clearance: bottom padding reserving `calc(var(--dock-h-desktop) + 1.5rem)` on `md+` (token exists at `tokens.css:103`, currently unused by Today) so the quote/grid never run under the floating dock.
- Widget anatomy: one rhythm via `Widget.jsx` (header/body/optional footer — already the shell); unify the three footer labels to one treatment (text-xs uppercase tracked muted); make actionable footers real labeled buttons (`CAPTURE`, `MOMENTUM` already buttons — add aria-labels).
- Empty states: `EmptyState inline` in FocusWidget (no tasks) and QuickCapture entries popover (no entries).
- Wire the dead `onOpenPulse` prop in FocusWidget (session chip click → open Chronos).
- `WorldMapWidget`: replace `fill-black/50 stroke-white/10` with token classes.
- `useWeather.js` fix: cache last-good coords under new `STORAGE_KEYS.WEATHER_COORDS`; on denial/timeout/unavailable use cached coords; if none, set a real error state (widget renders `EmptyState` "Weather unavailable" with retry) instead of eternal "Locating…"; no unhandled rejections. Add `useWeather.test.js`.
- **Invariants:** dnd-kit sensors (Pointer distance:4 + KeyboardSensor), `select` prop-picking, `reconcileLayout` + `maia.today.layout` shape `[{id, span}]`, single shared clock, Base-UI collision-aware popover in QuickCapture, `home.css` cqw greeting exception respected.
- Verify: screenshots 1440×900 + 420×480, vitest, eslint, lint:tokens.

## Phase 2 — Task 2: Chronos (commit 2)
- **Extract:** move `ChronosModal.jsx` → `features/Chronos/ChronosModal.jsx`; `DailyTimeline/TaskRow/SignalRow` → `features/Chronos/components/`; extract the month calendar into `features/Chronos/components/MonthCalendar.jsx` so the modal shrinks (<644). Update imports (App.jsx, test file, any siblings).
- **Layout:** rebalance `lg:grid-cols-[minmax(0,1fr)_420px]` → right-heavy (e.g. `lg:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)]`); make `size="full"` genuinely near-full-bleed — first grep other `size="full"` consumers; if only Chronos, fix the variant in `AppDialog.jsx` (it should mean full), else override via ChronosModal's existing `className` override path.
- **Calendar a11y + legibility:** every day cell gets `aria-label` ("Thursday, September 18" + ", N tasks" + ", selected"), `aria-pressed` for selected, `aria-current="date"` for today; add has-tasks dot (reuse existing `tasksByDate`); fix contrast — normal days `text-foreground-secondary`, past `text-faint-foreground`, keep white selected pill.
- **Timeline:** add a now-indicator (accent line + time chip at `minutes/30*SLOT_HEIGHT`, minute ticker, today only); keep all drag/create/resize interactions and `SLOT_HEIGHT` mechanics untouched.
- **time.js:** add cached-`Intl` formatters (`formatTime`, `formatDayLabel`, `formatMonthYear`, `formatMonthDay`) and replace every ad-hoc `toLocale*` in the four Chronos files (fixes the `numeric` vs `2-digit` inconsistencies); remove unused `excludeId` param.
- Left column: real `EmptyState inline` for no-tasks/no-signals; consistent section headers.
- **Tests:** keep all 8 ChronosModal tests passing (they pin: dialog role, "Chronos", Close button, Tasks/Signals headings, Add Task/Add Signal/Delete Task/Mark-as-done aria-labels, "New Task"/"Title*"/"Create Task"/"Cancel"/"Give the task a title."); add a test asserting day cells have accessible names.

## Phase 3 — Task 3: Command palette (commit 3)
All changes in `CommandPalette.jsx` + `App.jsx` — **vendored `ui/command.jsx` untouched** (its `CommandList` already merges caller `className` through `cn`, so `max-h-72` is overridable).
- List height + scroll affordance: `<CommandList className="max-h-[min(56vh,30rem)] custom-scrollbar">` (twMerge drops `max-h-72`; `custom-scrollbar` is the repo's real styled-scrollbar utility — `no-scrollbar` is dead CSS).
- Group order by intent: Notes first, Navigate second, Actions third. Empty query → "Recent" group (5 latest notes by updatedAt/createdAt) + Navigate + Actions; typed query → full note results via cmdk filtering.
- Truncation honesty: keep `slice(0,50)` cap but render a disabled footer row "Showing 50 of N notes — keep typing to narrow" when truncated.
- Keyboard hints: footer bar inside the palette (`↵ open · ↑↓ navigate · esc close`); `⌘K` added to the dock Search tooltip; make the global listener toggle (`setCmdOpen(v => !v)`).
- Width: `CommandDialog className="sm:max-w-xl"`; strengthen selected-row state (`data-selected:bg-overlay`).
- Add `CommandPalette.test.jsx` (portal mock pattern from ChronosModal.test.jsx): finds a note by title, truncation row appears with >50 notes, hints render.

## Phase 4 — Task 4: Consistency pass (commit 4)
- **`src/lib/tokens.js`** runtime reader: `cssVar(name)` reads `.dark`/`:root` custom props via `getComputedStyle` (NOT the compile-time-only `--color-*` aliases) with a Map cache; `resolveColor(css)` converts any oklch color to an `rgb()` string via a probe element — required because THREE.Color and some canvas paths can't parse oklch. Export composed constants (`graphTheme()`, `clusterColors()`, alpha helper).
- **Route the 124 violations through it:** GraphPage + GraphRenderer + GraphControls (dedupe their three copies of COLORS/THEME into one `features/Graph/graphTheme.js`), KnowledgePanel, ProjectIcon (picker palette from chart/priority tokens), GlassSurface (box-shadow stack → `shadow-glass` + token vars), `lib/theme.js`, components.css (callout borders → `var(--info)` etc.; fix both `var(--)` → `var(--font-mono)`), EditorRich inline `#0044FF`, Ledger charts, NotesPage/LedgerPage arbitrary hex utilities. Report before/after count.
- **Primitive adoption:** `EmptyState` at NotesPage:520, LedgerPage:830+838, ProjectsPage:172, OutcomeDistribution:36, KnowledgePanel:51, GraphControls:230, EditorPage:176, GraphPage:298.
- **aria-label sweep:** all ~60 unlabeled raw `<button>`s in pages/features + components (NotesPage 14, LedgerPage 23, ProjectsPage 6, GraphControls 3, etc.).
- **prefers-reduced-motion:** global kill-switch media query in styles + pause ColorBends autorotation via matchMedia; remove the dead framer-motion import in dock.jsx.
- **Overlays:** Escape handling for GraphControls drawer backdrop and ProjectsPage mobile backdrop.
- Responsive screenshots at 420×480 / 1440×900 / 2560×1440 for the main pages; fix what breaks.

## Phase 5 — Task 5: Code logic + optimization (commit 5)
- **ESLint → 0 errors in src/**: the full verified list (ProjectsPage unused notes/setNotes, ResourcesPanel `e`, time.js `excludeId`, KnowledgePanel escape, ProjectVitality/ProjectIcon `only-export-components` via splitting constants into `lib/projectIcons.js`, utils.test constant binaries, FocusWidget onOpenPulse [now wired], dock motion import [removed P4], DataContext parseContentMeta import, GraphControls showSignals/setShowSignals, OutcomeDistribution cn/total, OpusLayout onDeleteProject, vite.config no-undef) + add `src-tauri/target` to eslint globalIgnores.
- **Bundle:** `React.lazy(ColorBends)` inside GlassSurface (drops three from main — it rides the Today/Projects path); lazy the three recharts chart components in JudgmentOverview (drops recharts); lazy KnowledgePanel at its Opus import site (drops full-d3). Measure and report chunk sizes before/after. Leave d3-geo/WorldMapWidget and tiptap/EditorPage static (note as next-step).
- **Graph:** memoize node/link identity feeding `useGraphSimulation` so `.restart()` fires only on real data change (the actual cost per the work order).
- **Dead code:** delete `src/hooks/useSize.js`.
- **markdown.js → read mode (user-approved):** new `NoteReadView` component rendering notes through `makeMarkdown` (DOMPurify + callouts + wikilinks + footnotes); EditorPage's reading mode uses it instead of just flipping `editable`; wikilink clicks route to the existing internal-link open path.
- **Ledger dedup:** extend DataContext's decision API (`updateDecision`, keep `createDecision/reviewDecision/deleteDecision`), make LedgerPage consume `useData()` for these writes, delete its local reimplementations; `seedData()` gated behind `import.meta.env.DEV`; `Math.random` slug → `uid()`.
- **Field drift:** canonicalize `projectIds` — one-time idempotent normalization in DataContext (legacy `project` name → matching project's id in `projectIds`, then null; no auto-create); remove readers (analysis/index.js:101 branch, EditorPage header chip → derive from projectIds, EditorPage:68 → use `moveNoteToProject`); dummyData stops writing the name string.
- **Tests:** add DataContext CRUD suite (decision lifecycle, moveNoteToProject, toggleTask auto-promotion, legacy-project migration), plus the Phase 1–3 test files. Suite must end ≥84 passing.

## Phase 6 — Task 6: Docs + final verification (commit 6)
- Rewrite `CLAUDE.md` truthful: Tailwind 4.3.3 CSS-first, real token namespaces from `tokens.css`, Manrope/Roboto fonts, real file tree, corrected complexity table with current line counts, `lint:tokens`/tauri commands, the binding conventions (no TS, no class components, no new deps without asking, comment why).
- Finalize `FINDINGS.md` + an opinionated prioritized next-steps list (~6 items with effort, e.g. remaining token tail, tiptap code-split, vault tests for remaining entities, uid collision hardening).
- Full final baseline run of all five commands; compare to Phase 0.

## Working rules
- Commit per phase with why-focused messages; re-run vitest/eslint/lint:tokens before each commit.
- Immutability in all state writes (especially `toggleTask`'s nested map chain); no vault-write-path changes beyond what's listed (none planned); no package installs or removals.
- Screenshot-verify every visual claim at 1440×900 + 420×480; anything unverifiable gets labeled as such in the report.
- If time runs short: Phase 4 shrinks in breadth (tokens.js + worst-offender files first), Phase 5 keeps ESLint+bundle+dedup over extras; report gaps honestly.