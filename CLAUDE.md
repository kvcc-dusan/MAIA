# MAIA — Claude Code Instructions

Verified against source 2026-09-19. When this file and the code disagree, **the code wins** — and fix this file.

## What is MAIA

Personal operating system / knowledge-management app. Solo project (Dušan), no team, no backend. Think Notion + Obsidian + calendar — glass aesthetic, offline-first. Two build targets:

- **Tauri 2 desktop** — the primary target. Notes are real markdown files in a user-picked vault folder.
- **Web/PWA** (GitHub Pages, base path `/MAIA/`) — secondary. localStorage only.

The seam is `isTauri()` from `src/lib/vault.js`. Anything filesystem-adjacent follows the pattern: Tauri gets the real implementation, web falls back to localStorage, Tauri imports are always **dynamic** (`await import(...)`) so the web bundle never pulls in Tauri code.

## Stack

- **React 19** + **Vite 7** — no Next.js, no SSR, no React Router (conditional rendering in `App.jsx`)
- **Tailwind CSS 4.3.3** — CSS-first config (`@tailwindcss/vite`, `@import 'tailwindcss'`, `@theme` blocks). There is **no tailwind.config.js**.
- **Framer Motion** — dock animations and motion.* components (wrapped in `<MotionConfig reducedMotion="user">`)
- **TipTap** — editor
- **D3** (SVG) — knowledge graph + knowledge panel. NOT Three.js for the graph.
- **Recharts** — Ledger charts
- **base-ui + Radix** primitives, **cmdk** (command palette), **dnd-kit** (Today grid), **sonner** (toasts)
- **Vitest + Testing Library** (`npx vitest run`)
- **localStorage** (`DataContext`) + markdown vault (`useNotesStore`) — no backend, no DB

## The design system — `src/styles/tokens.css`

**Read `src/styles/tokens.css` end to end before writing any style.** It is a deliberate, documented system; apply it, don't redesign it, never introduce a second palette.

- `src/index.css` is a **16-line import manifest** — tokens do NOT live there.
- There are **zero `--maia-*` variables**, no `--space-*` / `--fluid-*` scales, and the fonts are **Manrope Variable (font-sans) + Roboto Variable (font-heading)** — not Onest/IBM Plex/Instrument Serif.
- Raw custom properties live in the `.dark` block (`--background`, `--priority-1`, …); `@theme inline` mirrors them as Tailwind utilities (`bg-card`, `text-muted-foreground`, `border-border-subtle`, `bg-overlay-strong`, `text-priority-1`, `z-dock`…). The `--color-*` aliases are compile-time only — at runtime read the raw `.dark` names.
- **`src/lib/tokens.js`** is the runtime bridge for canvas surfaces (D3/Recharts) that take color as JS strings: `cssVar()`, `resolveColor()`, `tokenColor()`, `clusterColors()`, `graphTheme()`. Note its header caveat: `resolveColor` does NOT convert oklch→rgb, so it is not THREE.Color-safe.
- Type: 7 steps, `text-xs` (12px) floor. `font-mono` is discouraged as a UI voice.
- Z-index: named utilities only — `z-sticky` 10 · `z-dock` 20 · `z-drawer` 30 · `z-overlay` 40 · `z-dialog` 50 · `z-popover` 60 · `z-tooltip` 70 · `z-toast` 80.
- **Ratchet: `npm run lint:tokens`** counts hardcoded hexes/rgba/white-black-alpha/etc. across `src/`. The number must only go down. `src/components/ui/*` (vendored shadcn) is exempt; MAIA's own files are not.

## Components — reuse, don't reinvent

- **`src/components/composed/`** — MAIA's app-level primitives: `AppDialog` `ConfirmDialog` `PromptDialog` `SidePanel` `Menu` `Select` `Field` `EntityForm` `DateTimeField` `PageHeader` `SectionCard` `SectionBits` (SectionLabel/CountPill) `Widget` `Surface` `EmptyState` `ErrorState` `IconButton` `StatusDot`. Every page should consume these — hand-rolled empty states, overlays without focus-trap, and bespoke eyebrows are recurring regressions.
- **`src/components/ui/`** — mostly **vendored shadcn** (`button`, `dialog`, `command`, `popover`, `select`, `tabs`, …). Running `shadcn add <name>` regenerates them, so **hand edits get reverted** and the token linter exempts them. MAIA's own files there (`dock.jsx`, `CustomIcon.jsx`, `PriorityCheckbox.jsx`, `CloseButton.jsx`, `portal.js`) are NOT exempt.
- `src/dev/Gallery.jsx` (`?ui=gallery` in dev) is the living component gallery.

## State

- `src/context/DataContext.jsx` — single source of truth for **projects, tasks, reminders, sessions, ledger** via hardened `useLocalStorage` (unload flush, corrupt-JSON backup, write errors). Contains one-time migration logic (legacy `maia.journal`) — don't break it.
- Notes go through `src/hooks/useNotesStore.js` — localStorage on web, markdown vault on desktop, with conflict resolution and a fs watcher. Recently hardened against data loss; change only with a concrete reason.
- Other load-bearing, recently-hardened files: `src/lib/vault.js` (conflict guard, watcher), `src/utils/notify.js` (subtle service-worker scheduling), `src-tauri/` security config (explicit CSP, runtime-scoped fs).

## Feature map

```
src/
├── App.jsx                    # routing (conditional render) + global modal state + dock items
├── pages/                     # HomePage(Today) NotesPage(EditorPage) ProjectsPage(Opus) LedgerPage
├── components/
│   ├── composed/              # app primitives (see above)
│   ├── ui/                    # vendored shadcn + MAIA's own dock/CustomIcon/etc.
│   ├── Chronos-era shared     # ProjectIcon, GlassSurface/Card, WorldMap/Focus/QuickCapture widgets
│   └── …
├── features/
│   ├── Chronos/               # ChronosModal + components/{MonthCalendar,DailyTimeline,TaskRow,SignalRow,…}
│   ├── Today/                 # TodayGrid + widgets.js registry (id/defaultSpan/canGrow/minHeight/select)
│   ├── Graph/                 # GraphPage (lazy route) + components + useGraphSimulation
│   ├── Ledger/                # chart components (page still in pages/LedgerPage.jsx)
│   └── Opus/                  # OpusLayout + project panels (Execution, Nodes, Assets, Uplinks…)
├── context/DataContext.jsx
├── hooks/                     # useLocalStorage, useNotesStore, useWeather, useSignals, useHomeGreeting…
├── lib/                       # time.js formatters, tokens.js, vault.js, backup.js, analysis/
└── styles/                    # tokens.css (the system), base/surfaces/components/home css
```

## Conventions (binding)

- **No TypeScript** — plain JS/JSX, deliberate. **No class components.**
- **No new dependencies without asking.**
- **No backend / external DB.**
- Comment *why*, not *what*.
- Tailwind first; inline styles only for canvas/SVG/Three where required.
- `cn()` from `src/lib/utils.js` for conditional classes.
- File hygiene: 200–400 lines typical, 800 hard max. Complex files (`CustomIcon.jsx` ~1054, `LedgerPage.jsx` ~1030, `NotesPage.jsx` ~677, `ProjectIcon.jsx` ~524) may only shrink; extract to `features/<Feature>/components/`.
- Immutability in state updates — always spread, never mutate (`DataContext.toggleTask`'s nested map chain is easy to break).
- Never claim work is done without evidence (test run, grep, screenshot).

## Dev commands

```bash
npm run dev        # http://localhost:5183/MAIA/  (note the /MAIA/ base path; port is strict)
npm run build      # web build
npm run deploy     # build + push to GitHub Pages
npx vitest run     # tests
npx eslint src/    # lint (src-tauri/target is ignored)
npm run lint:tokens            # token ratchet — count must go down
npx tauri build --debug --no-bundle  # desktop build
```

## Icons

Lucide React for general icons; `CustomIcon.jsx` (large, name-keyed MAIA SVG set) where a MAIA-specific icon exists. Prefer Lucide otherwise.

## Notifications / Audio

`src/utils/notify.js` — browser notifications + Web Audio + service-worker task scheduling. The SW communication pattern is subtle; don't touch without understanding it.
