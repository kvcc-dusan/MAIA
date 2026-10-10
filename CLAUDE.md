# MAIA — Claude Code Instructions

Verified against source 2026-10-09. When this file and the code disagree, **the code wins** — and fix this file.

## What is MAIA

Personal operating system / knowledge-management app. Solo project (Dušan), no team, no backend. Think Notion + Obsidian + calendar — offline-first, mid-migration to the kvcc-arc design system (see below). Two build targets:

- **Tauri 2 desktop** — the primary target. Notes are real markdown files in a user-picked vault folder.
- **Web/PWA** (GitHub Pages, base path `/MAIA/`) — secondary. localStorage only.

The seam is `isTauri()` from `src/lib/vault.js`. Anything filesystem-adjacent follows the pattern: Tauri gets the real implementation, web falls back to localStorage, Tauri imports are always **dynamic** (`await import(...)`) so the web bundle never pulls in Tauri code.

## Stack

- **React 19** + **Vite 7** — no Next.js, no SSR, no React Router (conditional rendering in `App.jsx`)
- **Tailwind CSS 4.3.3** — CSS-first config (`@tailwindcss/vite`, `@import 'tailwindcss'`, `@theme` blocks). There is **no tailwind.config.js**. In MAIA's own files Tailwind is for **layout** (flex, grid, gap, sizing); colour, radius and type utilities must resolve to kvcc-arc tokens via `@theme inline`. Arc components style themselves with **CSS modules** — never Tailwind-restyle them.
- **Framer Motion** — dock animations and motion.* components (wrapped in `<MotionConfig reducedMotion="user">`). Arc components need **`motion`** (the renamed package, `motion/react`) plus `@/lib/motion-tokens`; until both are installed and approved, they can't be added.
- **TipTap** — editor
- **D3** (SVG) — knowledge graph + knowledge panel. NOT Three.js for the graph. Charts are Arc `line-chart`/`bar-chart`/`donut-chart`/`gauge` (CSS-variable colours).
- **base-ui + Radix** primitives, **cmdk** (command palette), **dnd-kit** (Today grid), **sonner** (toasts)
- **Vitest + Testing Library** (`npx vitest run`)
- **localStorage** (`DataContext`) + markdown vault (`useNotesStore`) — no backend, no DB

## The design system — kvcc-arc

MAIA's design system is **kvcc-arc** (Dušan's fork of Arc, uiarc.dev, MIT). `src/styles/tokens.css` is no longer the system; it is a shrinking **bridge** (see below). Before writing any UI, **load the `kvcc-arc` skill and follow it.** It has three parts; use all three:

1. **Component registry** — self-hosted shadcn registry at `https://kvcc-arc-registry.netlify.app`, registered in `components.json` as `"@kvcc": "https://kvcc-arc-registry.netlify.app/r/{name}.json"`. Base: `npx shadcn@latest add @kvcc/arc-foundation` (lands `src/components/arc/foundation.css` + `src/lib/motion-tokens`). Components: `npx shadcn@latest add @kvcc/<id>`. MAIA has `tsx: false`, so installs must come out as `.jsx`/`.js` — check every install.
2. **The skill** — `~/.claude/skills/kvcc-arc`. Rules and selection live in `references/`: `rules.md` (colour, type, shape, motion, touch, menus, charts, tables, destructive actions), `components.md` (which item for which job), `component-index.md` (107 components, 22 blocks), `extensions.md` (`app-shell`, `settings-page`, `ai-chat`), `checklist.md` (pre-finish grep sweeps).
3. **Source repo (read-only, never edit)** — `/Users/dusankvcc/Desktop/Atrium/Claude Code/kvcc-arc`. Component source + docs in `registry/components/<id>/`, extensions in `kvcc/extensions/<id>/`, tokens in `registry/foundation.css`. Read an item's source and docs before using it.

**Rules of thumb (binding):**
- Look for an existing `@kvcc` item first. Hand-build only when nothing fits, then follow `rules.md` with semantic tokens only (`--surface`, `--foreground`, `--text-secondary`, `--border`, `--accent`, `--danger`, …). No raw hex, no `--neutral-*`, no Tailwind colour classes.
- Compose Arc components through their documented props. **Never restyle their internals**; `className` only for layout.
- Arc hard rules that bite MAIA's legacy code: weights 400/500 only, sentence case, no uppercase/eyebrows/em dashes in UI copy, no glass/blur/glow/gradients, cards on a 1px border (shadows only on floating layers), radii 18/26/34, 44px touch targets, motion via `motion-tokens` with a reduced-motion branch.
- Free-set gaps (no dock, week calendar, data grid): MAIA's Chronos calendar/timeline, Today dnd grid, D3 graph and TipTap editor stay hand-built — to `rules.md`, not the old look.

**Theming:** `data-theme="light|dark"` and `data-accent` (MAIA uses `neutral`) on `<html>`, set before first paint. Follows `prefers-color-scheme` with a saved user toggle. Overrides go in a theme layer after `foundation.css`, never in `foundation.css` itself.

**`src/styles/tokens.css` — the bridge.** It maps MAIA's legacy names (shadcn-style `--card`, `--muted-foreground`, `--priority-1`, the `@theme inline` utilities like `bg-card`, `text-muted-foreground`, `z-dock`) onto Arc semantic tokens, so unmigrated code picks up the new look. Watch the collision: shadcn's `accent` means *hover surface*, Arc's `--accent` means *brand colour*. The bridge only shrinks; new code uses Arc tokens directly. Until step 2 lands it still holds the old dark-only `.dark` palette (Manrope/Roboto).
- `src/index.css` is the import manifest — tokens do NOT live there.
- **`src/lib/tokens.js`** is the runtime bridge for canvas surfaces (D3/Recharts) that take colour as JS strings: `cssVar()`, `resolveColor()`, `tokenColor()`, `clusterColors()`, `graphTheme()`. It must read Arc names (`--series-1..4` for chart series). Header caveat: `resolveColor` does NOT convert oklch→rgb, so it is not THREE.Color-safe.
- Z-index: named utilities (`z-sticky` 10 · `z-dock` 20 · `z-drawer` 30 · `z-overlay` 40 · `z-dialog` 50 · `z-popover` 60 · `z-tooltip` 70 · `z-toast` 80) stay unless Arc's foundation defines its own layering.
- **Ratchet: `npm run lint:tokens`** counts hardcoded hexes/rgba/white-black-alpha/etc. across `src/`. The number must only go down (baseline 17 on 2026-10-09). Vendored code is exempt: `src/components/ui/*` shadcn files and `src/components/arc/**` (`@kvcc` installs). MAIA's own files are not.

## Migration status (kvcc-arc) — one step per pass, stop for review in `npm run tauri dev`

Plan: `~/.claude/plans/pasted-content-id-cf4c-migrate-goofy-pebble.md`. Branch: `ds/kvcc-arc`.

- [x] **Step 1 — this file.** kvcc-arc declared as the system.
- [x] **0. Safety** — WIP committed on `ds/foundation` (`8d3b921`), branch `ds/kvcc-arc`.
- [x] **1. Foundation** (`8b3d116`) — `@kvcc` registered, `arc-foundation` + `button` canary, `motion`, Geist + Inter, theme boot in `public/theme-boot.js` (external because CSP is `script-src 'self'`), theme API in `src/lib/theme.js`, `components/arc/` exempt from lint:tokens and eslint.
- [x] **2. Token bridge** (`a23a376`) — `tokens.css` aliases legacy names onto Arc; `bg-accent` = hover surface, Arc's accent = `bg-brand`/`text-brand`; glass/blur neutralised; `lib/tokens.js` on Arc names. Leftovers for page passes: cards using `shadow-lg/xl/2xl` (now floating shadow), `backdrop-blur-*` classes (blur 0), `GlassCard`/`GlassSurface` raw colours, uppercase/bold labels, h1–h4 in Geist below 30px, D3/Recharts must `subscribe()` to redraw on theme change.

**shadcn CLI gotcha:** with `tsx: false`, `shadcn add @kvcc/<id>` converts `.tsx`→`.jsx` fine but **crashes on `.css` files** ("Unexpected token"). Workaround: after the add, write each `.css` / `.module.css` by hand from the registry JSON's `content` field (`https://kvcc-arc-registry.netlify.app/r/<id>.json`). Also install the item's npm `dependencies` yourself if the crash skipped them. **Second trap:** because MAIA's `components.json` style is `base-luma` (base-ui), the converter rewrites Radix `asChild` into base-ui `render={...}` or drops it, which silently breaks Radix-based Arc items (was: dialog, drawer, tooltip). After every add, run `grep -rn "render=" src/components/arc` and compare `asChild` counts against the registry source; if they differ, re-convert the `.tsx` from the registry JSON with esbuild (`loader: 'tsx', jsx: 'preserve'`) and point `@/lib/motion-tokens` at `../lib/motion-tokens`.
- [x] **3. Primitives** (`2e60947` display, `c0a58d5` overlays, inputs commit after) — `composed/*` on Arc items, APIs frozen. Exceptions: `Menu` stays on Base UI styled to the Arc menu spec (Arc menus are items-array only, no compound/submenu API); Chronos's chromeless `AppDialog` (`showCloseButton={false}`) is a small Radix shell on Arc tokens. Base UI portals inside Radix modals need `pointer-events: auto` (Radix sets `body { pointer-events: none }`). Open: Arc calendar is Sunday-first (no week-start prop), DateTimeField is now two fields, `IconButton` still on `ui/tooltip`, Gallery Menus section crashes (`Menu.Label` outside `Menu.Group`, pre-existing).
- [x] **4. Shell + pages** (`3e771fe` shell; pages `422b5be` Notes/Editor, `5a9d2cb` Today, `f621c7a` Ledger, `dc3a9a0` Graph, `c4a6364` Chronos; `df36d7f` shared cleanup) — `MaiaShell` (Arc `app-shell`) owns the page h1, so pages render h2 and below; it overrides Arc's scrolling-document layout with structural selectors in `MaiaShell.module.css` (ask kvcc-arc for a fixed-viewport prop). Ledger charts moved from Recharts to Arc bar/donut/line charts (Recharts is now unused in `src/`, still in `package.json`; removal needs Dušan's yes). Arc charts, the world map and Graph follow the theme via CSS variables or `subscribe` from `lib/theme.js`. **Open:** `ui/PriorityCheckbox.jsx` (20px target, glow, own focus ring) needs a rebuild; deletes in Chronos rows still act on first click (rules want a confirm); sonner toasts stay (Arc toast has no imperative API); Chronos session resize is pointer-only. **Waits for step 5 (Opus):** `ProjectsPage`, Opus panels, `ProjectIcon`, `CreateProjectModal`, `GlassSurface` (11 lint hits), `--dock-h*` tokens (`OpusLayout` still uses them). **Unused, deletion needs approval:** `ui/dock.jsx`, `GlassCard.jsx`, `dottedBg` in `lib/theme.js`, `getSessionBlockClass`/`getSessionSwatchClass` in `lib/sessionColors.js`, `styles/home.css` (empty). Lint:tokens is 14.
- [x] **5. Opus redesign** (data `250bdad` + `abee6f0`; shell `8f3b6e0`; tabs: Record `394715a`, Tasks `142eea7`, Overview `74a653d`, Library `5d1660a`, Roadmap `204b5a9`, Board `e0ce378`) — Opus is `OpusLayout` (header + Arc tabs: Overview, Board, Tasks, Roadmap, Record, Library); tab files in `src/features/Opus/tabs/`, tab-to-tab links with filters via `OpusNavContext` (`useOpusNav().navigate('tasks', { status })`). Weekly report dialog saves a Codex note tagged `#report`. **Data model:** tasks and projects are normalized on read and on write, never bulk-migrated. `src/features/Opus/lib/taskModel.js` is the ONE status-transition rule (`applyTaskPatch`; write status via `updateTask(id, { status })`, never set `done`/`doneAt` by hand; `done` is a mirror of `status === 'done'`; `completedAt` is read-only legacy). Task `estimate` is S/M/L. Projects carry `workstreams`, `decisions`, `questions`, `milestones` (status), `startDate`, `targetDate`, `phase`, `nextMeeting`, with CRUD in `context/useProjectCollections.js`; project decisions are NOT the Ledger decisions. `maia.activity` is an append-only log capped at 3000 (`useActivityLog`), included in backups. Metrics group by UTC day (known limit: 00:00 to 02:00 local lands on the previous day). kvcc-arc `line-chart` has gap support (`values[key] === null`); the live registry still serves the old one until Dušan redeploys. `EntityForm` takes `inPanel` when it lives in a SidePanel. **Open:** `ui/PriorityCheckbox.jsx` rebuild; Arc segmented-control is 36px on touch; Chronos row deletes act on first click; favicon lookups send link hostnames to Google (Library); `useTaskActions.updateTask` logs order-only changes as activity. **Deleted (Dušan approved):** `GlassSurface`, `ColorBends`, `MilestonesList`, `ui/dock`, `GlassCard`, `styles/home.css`, `dottedBg`, the session-colour Tailwind class maps, `fade`/`ICON_PRESETS`, the `--dock-h*` tokens, and the Recharts package. **Also uninstalled:** `three`, `ogl`, `postprocessing`, `@react-three/fiber`, `@react-three/postprocessing` (no THREE surface left in the app). Lint:tokens is 14.
- [x] **6. Today deleted, Obsidian-style shell, Codex tabs** (`9f1deb8` Today gone; `1fb7fbb` shell; Codex tabs after) — Dušan's decision: the app will be driven by Claude over MCP, so there is no Today page. Shell = top bar across the window (Tauri overlay title bar `titleBarStyle: Overlay`, traffic lights inset, `data-tauri-drag-region`, back/forward from `useNavHistory`), 48px icon rail (Opus, Codex, Conexa, Ledger | Chronos, Search | theme), collapsible secondary sidebar that pages fill via `<ShellSidebar>` (Opus: project list; Codex: note list) and top-bar slot via `<ShellTopBar>` (Codex: tab strip). Codex = one page with tabs (`maia.codex.tabs`): Codex cards view, notes, new-tab page (New note ⌘N, New journal, Codex, Go to file ⌘O). The app reopens on the last page (`maia_current_view`, default Opus); Opus selection is `maia_current_project`. The vault is flat (top-level `.md` only), so the Codex sidebar is a list until the storage step adds folders.
- [ ] **7. Opus = the project hub** — spec: `~/.claude/plans/opus-hub-spec.md` (nine hub pages + Core tab for MAIA-native pieces; hub runs from `projecthub/out-test`, preview config `hub`). Then **8. Storage as files** (`<vault>/Opus/<project>/…`, notes-style, UI first, storage second; activity as hidden jsonl).
- [x] **5. Opus redesign** (data `250bdad` + `abee6f0`; shell `8f3b6e0`; tabs: Record `394715a`, Tasks `142eea7`, Overview `74a653d`, Library `5d1660a`, Roadmap `204b5a9`, Board `e0ce378`) — Opus is `OpusLayout` (header + Arc tabs: Overview, Board, Tasks, Roadmap, Record, Library); tab files in `src/features/Opus/tabs/`, tab-to-tab links with filters via `OpusNavContext` (`useOpusNav().navigate('tasks', { status })`). Weekly report dialog saves a Codex note tagged `#report`. **Data model:** tasks and projects are normalized on read and on write, never bulk-migrated. `src/features/Opus/lib/taskModel.js` is the ONE status-transition rule (`applyTaskPatch`; write status via `updateTask(id, { status })`, never set `done`/`doneAt` by hand; `done` is a mirror of `status === 'done'`; `completedAt` is read-only legacy). Task `estimate` is S/M/L. Projects carry `workstreams`, `decisions`, `questions`, `milestones` (status), `startDate`, `targetDate`, `phase`, `nextMeeting`, with CRUD in `context/useProjectCollections.js`; project decisions are NOT the Ledger decisions. `maia.activity` is an append-only log capped at 3000 (`useActivityLog`), included in backups. Metrics group by UTC day (known limit: 00:00 to 02:00 local lands on the previous day). kvcc-arc `line-chart` has gap support (`values[key] === null`); the live registry still serves the old one until Dušan redeploys. `EntityForm` takes `inPanel` when it lives in a SidePanel. **Open:** `ui/PriorityCheckbox.jsx` rebuild; Arc segmented-control is 36px on touch; Chronos row deletes act on first click; favicon lookups send link hostnames to Google (Library); `useTaskActions.updateTask` logs order-only changes as activity. **Deleted (Dušan approved):** `GlassSurface`, `ColorBends`, `MilestonesList`, `ui/dock`, `GlassCard`, `styles/home.css`, `dottedBg`, the session-colour Tailwind class maps, `fade`/`ICON_PRESETS`, the `--dock-h*` tokens, and the Recharts package. **Orphaned packages still installed (ask before removing):** `three`, `ogl`, `postprocessing`, `@react-three/fiber`, `@react-three/postprocessing` (their only user, ColorBends, is gone). Lint:tokens is 1 (a legitimate `font-mono` for code blocks in `EditorRich.module.css`).

Every pass: `npm run lint:tokens`, `npx vitest run`, `npm run build`, plus the `checklist.md` sweeps over changed files. Then report what to check: light + dark, narrow window, keyboard.

## Components — reuse, don't reinvent

- **`src/components/arc/`** — vendored `@kvcc` installs (CSS-module components). Regenerated by `shadcn add`; never hand-edit. First choice for any UI.
- **`src/components/composed/`** — MAIA's app-level primitives: `AppDialog` `ConfirmDialog` `PromptDialog` `SidePanel` `Menu` `Select` `Field` `EntityForm` `DateTimeField` `PageHeader` `SectionCard` `SectionBits` (SectionLabel/CountPill) `Widget` `Surface` `EmptyState` `ErrorState` `IconButton` `StatusDot`. Being rebuilt on Arc items (step 3) **with their public APIs frozen**, so consumers don't change. Every page should consume these — hand-rolled empty states, overlays without focus-trap, and bespoke eyebrows are recurring regressions.
- **`src/components/ui/`** — legacy: mostly **vendored shadcn** (`button`, `dialog`, `command`, `popover`, `select`, `tabs`, …), shrinking to zero as pages migrate. Don't add new usages. Running `shadcn add <name>` regenerates them, so **hand edits get reverted** and the token linter exempts them. MAIA's own files there (`dock.jsx`, `CustomIcon.jsx`, `PriorityCheckbox.jsx`, `CloseButton.jsx`, `portal.js`) are NOT exempt. Deleting any of them needs Dušan's yes.
- `src/dev/Gallery.jsx` (`?ui=gallery` in dev) is the living component gallery.

## State

- `src/context/DataContext.jsx` — single source of truth for **projects, tasks, reminders, sessions, ledger** via hardened `useLocalStorage` (unload flush, corrupt-JSON backup, write errors). Contains one-time migration logic (legacy `maia.journal`) — don't break it.
- Notes go through `src/hooks/useNotesStore.js` — localStorage on web, markdown vault on desktop, with conflict resolution and a fs watcher. Recently hardened against data loss; change only with a concrete reason.
- Other load-bearing, recently-hardened files: `src/lib/vault.js` (conflict guard, watcher), `src/utils/notify.js` (subtle service-worker scheduling), `src-tauri/` security config (explicit CSP, runtime-scoped fs).

## Feature map

```
src/
├── App.jsx                    # routing (conditional render: codex | projects | graph | ledgerPage) + global modals
├── pages/                     # NotesPage + EditorPage (inside Codex tabs) ProjectsPage(Opus) LedgerPage
├── components/
│   ├── composed/              # app primitives (see above)
│   ├── ui/                    # vendored shadcn + MAIA's own dock/CustomIcon/etc.
│   ├── shell/                 # MaiaShell (top bar, icon rail, sidebar slot), ShellContext portals
│   └── …
├── features/
│   ├── Chronos/               # ChronosModal + components/{MonthCalendar,DailyTimeline,TaskRow,SignalRow,…}
│   ├── Codex/                 # CodexPage: tab strip, new-tab page, NotesSidebar, codexTabs reducer
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
npm run tauri dev  # desktop app in dev mode (hot reload) — the review surface; starts Vite itself, so don't run `npm run dev` alongside
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
