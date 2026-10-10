# MAIA — Master Work Order

You are working on **MAIA**, a personal operating system / knowledge-management desktop app. Solo project, one user (Dušan), no team, no backend, no users to migrate. Repo is at the path you've been given, on branch `ds/foundation`.

You have a very large token budget and roughly 6 hours. **Use them on depth, not breadth.** Read whole files before changing them. Verify every change by running it. Prefer three surfaces fixed properly over twelve touched superficially.

---

## 0. READ THIS FIRST: `CLAUDE.md` IN THIS REPO IS WRONG

The repo contains a `CLAUDE.md` with project instructions. **Large parts of it are factually false** — it was written early and never updated. It has been independently verified wrong on these points:

| `CLAUDE.md` claims | Actual verified reality |
|---|---|
| Tailwind CSS 3 | **Tailwind 4.3.3** (`@tailwindcss/vite`, `@import 'tailwindcss'`, `@theme` blocks) |
| Tokens named `--maia-black`, `--maia-glass-bg`, `--maia-border`, `--maia-ring` | **Zero `--maia-*` variables exist.** `grep -r -- "--maia-" src/` returns nothing |
| Spacing `--space-xs`…`--space-4xl`, fluid `--fluid-3xs`…`--fluid-3xl` | **None exist.** Removed in an earlier sprint |
| Fonts: Onest, IBM Plex Mono, Instrument Serif | **Manrope Variable + Roboto Variable** (`src/index.css:7-8`) |
| "Design tokens live in `src/index.css`" | `index.css` is a **16-line import manifest**. Real tokens live in **`src/styles/tokens.css`** |
| `src/pages/CanvasPage.jsx` (~588 lines) | **File does not exist** |
| `ChronosModal.jsx` ~1911 lines | **644 lines** |
| `LedgerPage.jsx` ~912 lines | **1030 lines** |

**Trust the source, never the docs.** Everything in section 1 below has been verified against the actual code as of this handoff. When `CLAUDE.md` and the code disagree, the code wins.

**Deliverable at the end of your run:** a corrected `CLAUDE.md`. That's a real task, not an afterthought — every future AI session on this repo is primed by that file.

The parts of `CLAUDE.md` that ARE still correct and binding:
- No TypeScript. Plain JS/JSX throughout. This is deliberate — do not convert.
- No class components.
- No backend, no external DB. localStorage + (in the desktop build) a markdown vault on disk.
- Don't install packages without asking. If you believe a dependency is genuinely necessary, stop and write the justification in your report instead of adding it.
- Comment *why*, not *what*.

---

## 1. VERIFIED GROUND TRUTH

### Stack
React 19.1 · Vite 7.1 · **Tailwind CSS 4.3** · Framer Motion · TipTap (editor) · D3 + Three.js (knowledge graph) · Recharts · Radix + base-ui primitives · cmdk (command palette) · dnd-kit (Today grid) · sonner (toasts) · Vitest + Testing Library · **Tauri 2** desktop shell.

Two build targets:
- **Tauri desktop** — the primary target. Notes are real markdown files in a user-picked vault folder.
- **Web/PWA** (GitHub Pages, base path `/MAIA/`) — secondary. localStorage only.

The seam between them is `isTauri()` from `src/lib/vault.js`. Follow that pattern for anything filesystem-adjacent: Tauri gets the real implementation, web falls back to localStorage, Tauri imports are always **dynamic** (`await import(...)`) so the web bundle never pulls in Tauri code.

### The design system — read `src/styles/tokens.css` end to end before writing any styles

This is the single most important file for the UI work, and it is **good**. It is a deliberate, documented system. Your job is to *apply it consistently*, not to redesign it. Do not introduce a second palette. Do not add a competing scale.

Real token namespaces (all Tailwind v4 `@theme` mappings, used as normal utility classes):

**Surfaces / elevation ramp:** `background`, `background-subtle`, `card`, `popover`, `elevated`, `glass`
**Text ramp (5 steps):** `foreground`, `foreground-secondary`, `muted-foreground`, `subtle-foreground`, `faint-foreground`
**Lines / overlays:** `border`, `border-subtle`, `border-strong`, `overlay-subtle`, `overlay`, `overlay-strong`
**Status accents:** `success`, `warning`, `info`, `intel`, `destructive` (+ matching `-foreground`)
**Priority:** `priority-1`, `priority-2`, `priority-3`
**Escape hatch for literal white:** `pure`

So you write `bg-card`, `text-muted-foreground`, `border-border-subtle`, `bg-overlay-subtle`, `text-priority-1` — never `bg-zinc-800`, never `text-white/60`, never a hex.

**Type scale (7 steps, 12px floor):** `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` — each with a paired line-height already defined. Nothing goes below `text-xs`. Fonts: `font-sans` (Manrope) for UI, `font-heading` (Roboto) for headings, `font-mono` is **discouraged as a UI voice** (the token linter flags it).

**Radius:** `rounded-sm|md|lg|xl|2xl|3xl|4xl` (monotonic scale off `--radius: 0.625rem`).

**Spacing:** standard Tailwind scale, plus `px-page` (a `clamp(1rem, 4vw, 4rem)` page gutter) and `dock`/`dock-desktop` for dock height.

**Elevation:** `shadow-ambient`, `shadow-raised`, `shadow-overlay`, `shadow-glass`.

**Z-index — named utilities, never arbitrary:** `z-sticky` (10) · `z-dock` (20) · `z-drawer` (30) · `z-overlay` (40) · `z-dialog` (50) · `z-popover` (60) · `z-tooltip` (70) · `z-toast` (80). Toast deliberately sits above dialog.

**Motion:** `--ease-maia` / `--ease-out`.

There is a token ratchet script: `npm run lint:tokens`. **Current baseline: 124 violations across 24 files** — 77 hardcoded hex, 27 `rgba()` literals, 20 white/black alpha utilities, and zero of everything else (no raw zinc, no arbitrary z-index/radius/font-size). The remaining debt is concentrated in canvas/chart code where colors are passed as JS strings to D3/Three/Recharts rather than as classes: `src/styles/components.css` (22), `GraphPage.jsx` (15), `ProjectIcon.jsx` (14), `GlassSurface.jsx` (11), `GraphControls.jsx` (8), `GraphRenderer.jsx` (8), `KnowledgePanel.jsx` (8).

**Driving that number down is a legitimate, measurable win.** The right fix for the canvas/chart cases is a small `src/lib/tokens.js` that reads the CSS custom properties at runtime (`getComputedStyle(document.documentElement).getPropertyValue('--color-priority-1')`) and hands real color strings to the libraries — one helper, used everywhere, instead of 77 scattered hexes. The script's own header comments say this was the intended plan.

### Component inventory — REUSE THESE, DO NOT REINVENT

Before you write any new component, check whether one of these already does it. A recurring problem in this codebase is pages hand-rolling what a primitive already provides.

`src/components/composed/` — the app-level primitives:
`AppDialog` · `ConfirmDialog` · `PromptDialog` · `SidePanel` · `Menu` · `Select` · `Field` · `EntityForm` · `DateTimeField` · `PageHeader` · `Widget` · `Surface` · `EmptyState` · `ErrorState` · `IconButton` · `StatusDot`

`src/components/ui/` — low-level atoms. Most are vendored shadcn (`button`, `dialog`, `command`, `popover`, `select`, `tabs`, `input`, `sonner`, …) and are **regenerated by `shadcn add`, so edits there get reverted** — the token linter deliberately exempts them. MAIA's own hand-rolled ones (`dock`, `CustomIcon`, `PriorityCheckbox`, `CloseButton`, `portal`) are NOT exempt and should reach zero violations.

`src/dev/Gallery.jsx` is a component gallery — useful to see what exists and how it's meant to look.

**Known adoption gaps you should close:**
- `EmptyState` and `ErrorState` exist but are imported by only `GlassErrorBoundary.jsx` and `Gallery.jsx`. Every page hand-rolls its own empty state instead (e.g. `OutcomeDistribution.jsx:36-40` renders a bare `<div>No reviews yet</div>`).
- `IconButton`'s own docstring admits only ~14% of MAIA's 154 buttons have an `aria-label`. There are 63 raw `<button>` elements across `pages/` + `features/` without one.
- `ProjectsPage.jsx:143` and `GraphControls.jsx:69` hand-roll modal/drawer overlays instead of using `SidePanel`/`AppDialog`, losing focus-trap and Escape handling.

### State

`src/context/DataContext.jsx` (317 lines) is the single source of truth. Entities: **notes, projects, tasks, reminders, sessions, ledger**.

- Notes go through `useNotesStore()` — localStorage on web, markdown vault on desktop.
- Everything else is `useLocalStorage(STORAGE_KEYS.X, [])`.
- `useLocalStorage` was recently hardened: it flushes pending debounced writes on unmount and `beforeunload`, backs up corrupt JSON to `<key>.corrupt.<ts>`, and returns a third element `[state, setState, writeError]` surfacing quota/write failures. **Don't regress that.**
- `DataContext` contains one-time migration logic for a legacy `maia.journal` key. **Don't break it.**

### Recently hardened — treat as load-bearing, don't casually refactor

The last few sprints fixed real data-loss and security bugs. Read the git log. Specifically, leave these alone unless you have a concrete reason:

- `src/lib/vault.js` — conflict guard (compares on-disk content against a baseline before overwriting, throws `VaultConflictError` rather than clobbering an external edit), duplicate-id reassignment, `watchVault()` fs watcher.
- `src/hooks/useNotesStore.js` (252 lines) — conflict resolution keeps both versions, deleted-file detection, extras-merge for not-yet-flushed notes, Tauri `onCloseRequested` flush.
- `src/utils/notify.js` — browser notifications + Web Audio + service-worker task scheduling. The SW communication pattern is subtle. Don't touch without understanding it.
- `src-tauri/` — CSP is now explicit, `fs:scope` is `[]` with runtime-only grants via the `allow_vault_scope` command + `tauri-plugin-persisted-scope`. Project assets are plain files in `<vault>/Opus/<Project>/assets/` (no dot paths: the fs scope does not match them).
- `src/lib/backup.js` — export/import of all entities to JSON.

### Current measurable baseline

```
npx vitest run        84 passing / 84 total, 14 files
npx eslint src/       19 errors, 12 warnings
npm run lint:tokens   124 violations across 24 files
npm run build         exits 0 — main chunk 2,378 kB (731 kB gzip)
npx tauri build --debug --no-bundle    exits 0
```

**Every one of these numbers should be the same or better when you finish. None may regress.**

The 19 ESLint errors are pre-existing and worth clearing as part of the code-quality pass:
- `ProjectsPage.jsx:33,36` — `notes` / `setNotes` destructured but never used
- `ResourcesPanel.jsx:28` — unused `e` param
- `lib/time.js:23` — unused `excludeId`
- `KnowledgePanel.jsx:81` — useless escape `\[`
- `ProjectVitality.jsx:5`, `ProjectIcon.jsx:7,390,393` — `react-refresh/only-export-components` (files export both components and constants; fix by splitting constants into their own module, e.g. `src/lib/projectIcons.js`)
- `utils.test.js:10` — constant binary expression
- plus a handful more unused vars

### Known bug worth fixing early (cheap, visible)

`src/hooks/useWeather.js:121` — geolocation rejection has no fallback. On denial (and the desktop app has no geolocation provider at all, so this is the *default* state) the Today widget sits on "Locating…" forever and throws two unhandled errors into the console on every load. Give it a sane fallback (last known coords in localStorage, or a configurable default location) and a real error state.

---

## 2. THE WORK

Priority order. Do them in this sequence — the design-system pass in #4 is much cheaper once #1–#3 have settled the layouts.

### Task 1 — Fix the Today screen

`src/pages/HomePage.jsx` · `src/features/Today/TodayGrid.jsx` · `src/features/Today/widgets.js` · `src/components/WorldMapWidget.jsx` · `FocusWidget.jsx` · `QuickCaptureWidget.jsx` · `src/components/composed/Widget.jsx`

**Verified defects — look at it yourself at 1440×900 before changing anything:**

1. **~45% of the viewport is dead space.** The grid is `lg:grid-cols-5` with `auto-rows-min`, so the three widgets collapse into one short row at the top, then `mt-auto` slams the greeting to the bottom. The entire middle of the page is empty black. This is the single worst thing about the app's first impression.
2. **The greeting block collides with the dock.** The greeting + Dostoevsky quote sit bottom-left; the dock is centered and overlaps them at common window widths. The quote's second line runs under the dock.
3. **Widget internals are inconsistently dense.** `WorldMapWidget` shows a clipped map with a timestamp; `FocusWidget` has three items then a large gap then a `MOMENTUM` footer; `QuickCaptureWidget` is nearly empty with a barely-visible `CAPTURE` affordance. Three different internal rhythms in one row.
4. **Footer labels are inconsistent.** `MOMENTUM`, `ENTRIES`, `CAPTURE` are tiny uppercase low-contrast text doing three different jobs (a link? a label? a button?).
5. There's no page header — an `Edit` button floats alone in the top-right with nothing anchoring it.

**What "fixed" means.** This is a dashboard for one person's day. It should feel calm, dense enough to be informative, and it should *fill the window* at any reasonable size. Concretely: decide a real vertical layout strategy (the widgets should grow to fill available height, or the grid should be genuinely responsive with the greeting integrated rather than orphaned at the bottom), give every widget one consistent internal structure (header / body / optional footer, one rhythm), resolve the dock collision properly (the dock is fixed and ~68px tall on desktop — `--dock-h-desktop`; content needs to reserve that space), and make the empty states real (`EmptyState` exists — use it).

You have latitude on the visual solution. You do not have latitude on: keeping the drag-to-reorder edit mode working, keeping the widget registry extension point in `widgets.js` intact (including the `select` prop-picking mechanism — read its comment, it exists for a real reason), and keeping layout persistence + `reconcileLayout` working.

### Task 2 — Fix the Chronos modal

`src/components/ChronosModal.jsx` (644 lines) · `src/components/DailyTimeline.jsx` (482) · `TaskRow.jsx` · `SignalRow.jsx` · `src/components/ChronosModal.test.jsx` (8 tests — keep them passing)

**Verified defects:**

1. **Same dead-space disease.** Left column is Tasks + Signals; with a couple of tasks and no signals, ~55% of that column is empty black.
2. **Calendar day cells have no accessible names.** Reading the a11y tree of the open modal returns ~30 consecutive unlabeled `button` elements. A screen reader gets nothing. Every day cell needs a label ("Thursday, September 18", plus state — selected, has tasks).
3. **The day numbers are barely legible** — very low contrast against the surface, while the selected day is a high-contrast white pill. The contrast ratio between "normal day" and "selected day" is enormous and everything in between is unreadable.
4. **The sessions timeline is cramped and truncated.** It sits under the calendar in a fixed 420px right column, showing ~4 hours (08:00 PM–11:00 PM) with no current-time indicator and no way to see the rest of the day.
5. **The right column is fixed at 420px** (`lg:grid-cols-[minmax(0,1fr)_420px]`) and has to hold both a month calendar and a day timeline. It's the wrong allocation — the left column has spare room it isn't using.
6. **Date formats are inconsistent** — the calendar header says "Friday, Sep 18" while a task row says "10:49 PM" with no date. There's a `src/lib/time.js`; centralize formatting there.
7. `size="full"` on the `AppDialog` renders as a large centered card with big margins — either it should be genuinely full-bleed or it shouldn't claim to be full.

**What "fixed" means.** Chronos is the time/planning surface: tasks, signals (reminders), sessions, and a calendar. It should read as one coherent tool rather than three panels sharing a box. Rebalance the columns to the actual content weight, make the calendar legible and accessible, give the timeline enough room to be useful (and a now-indicator), and unify the date/time formatting.

`ChronosModal.jsx` is 644 lines and is on the repo's known-complexity list. **Extract as you go** — `features/Chronos/components/` is the right home, matching the existing `features/{Opus,Graph,Ledger,Today}/` convention. `DailyTimeline`, `TaskRow`, `SignalRow` already live as siblings in `components/` and should move with it. Do not let this file grow.

### Task 3 — Fix the search / command palette

`src/components/CommandPalette.jsx` · `src/components/ui/command.jsx` (vendored cmdk wrapper — see the caveat below) · wired in `src/App.jsx`

**Verified defects:**

1. **The list is clipped at 288px with the scrollbar hidden.** `CommandList` has `max-h-72 no-scrollbar`. The result: the "Navigate" group header renders at the very bottom edge with *none of its items visible*, and there is no scrollbar to hint that more exists. It looks broken. This is the worst of the three surfaces' bugs because it makes working features look absent.
2. **It's a command palette pretending to be search.** The dock button is labeled "Search", but notes are the *last* group, below Actions and Navigate, and they're clipped off (see #1). Searching for a note — the most likely reason to open it — is the least reachable thing in it.
3. **No keyboard affordances.** No `⌘K` hint on the trigger, no `↵ to open / esc to close` footer, no visible indication of the selected row beyond a subtle background.
4. **Fixed narrow width, positioned at `top-1/3`** — feels arbitrarily placed and cramped on a 1440px window.
5. Only the first 50 notes are listed (`notes.slice(0, 50)`) with no indication that the list is truncated.

**What "fixed" means.** Opening it and typing a note title should find that note, fast, with the result visible without scrolling. Groups should be ordered by likely intent. The list needs enough height (and a visible scroll affordance) that no section is silently clipped. Add the keyboard hints. Consider surfacing recent notes when the query is empty rather than a static action list.

⚠️ **`src/components/ui/command.jsx` is vendored shadcn.** Running `shadcn add command` later would overwrite it. Prefer putting MAIA-specific behavior in `CommandPalette.jsx`, or in a wrapper, rather than editing the vendored file. If you genuinely must edit it, say so clearly in your report so it's a known, tracked divergence.

### Task 4 — UI/UX consistency pass: clean, minimal, coherent

Only after 1–3 are settled. The goal is that MAIA reads as **one app designed by one person**, not a collection of screens built at different times.

- **Drive `npm run lint:tokens` down.** Build the `src/lib/tokens.js` runtime-token-reader described in section 1 and route the canvas/chart colors through it. Report the before/after number.
- **Adopt the primitives.** Replace hand-rolled empty states with `EmptyState`, hand-rolled error states with `ErrorState`, hand-rolled overlays with `SidePanel`/`AppDialog`. Grep for the patterns rather than eyeballing.
- **Accessibility, concretely:** `aria-label` on icon-only buttons (start with the 63 raw `<button>`s and the ~30 unlabeled Chronos calendar cells); visible `focus-visible` rings everywhere; verify Escape and focus-trap work in every dialog; add `prefers-reduced-motion` handling — there is currently **zero** in the codebase despite heavy Framer Motion use (a global media query that kills large transforms is an acceptable minimum).
- **Rhythm and hierarchy:** one spacing scale, one set of section-header treatments, one card anatomy. Right now section labels appear as tiny uppercase tracked text in some places and normal-weight text in others.
- **Responsive:** the desktop window's minimum is **420×480** (`src-tauri/tauri.conf.json`). Check the app actually survives that, and at 1440×900, and at 2560×1440 — the dead-space problem gets worse on large displays.

### Task 5 — Code logic + optimization pass

- **Clear the 19 ESLint errors** (list in section 1).
- **Bundle:** main chunk is 2,378 kB / 731 kB gzip. `GraphPage` already code-splits (20 kB chunk) but Three.js, D3 and Recharts are still eager in the main bundle. Dynamic-import them at their use sites. This is the single biggest measurable perf win available and it's low-risk.
- **The Graph feature** (`features/Graph/`) runs a force simulation that `.restart()`s on any `nodes`/`links` reference change, with no node cap or LOD. Memoize the node/link identity first — that's likely the real cost, not the force algorithm.
- **Dead code:** `src/hooks/useSize.js` (27 lines) is imported nowhere. `src/lib/markdown.js` (69 lines — DOMPurify sanitization, callouts, wikilink resolution, footnotes) has **zero callers** — `grep -rn "makeMarkdown" src/` returns only its own definition and its test file. Decide: wire it into a real read-mode renderer, or delete it and its test. Don't leave it.
- **Duplicate logic:** `LedgerPage.jsx:562` reimplements id generation via `Math.random().toString(36).substring(7)` instead of `uid()` from `src/lib/ids.js`. `DataContext.jsx:263-284` exports `createDecision`/`reviewDecision`/`deleteDecision` that have **zero callers** — `LedgerPage.jsx:473-496` reimplements all three against `setLedger` directly. Two divergent implementations of the same writes; collapse to one.
- **Field drift:** notes have both a legacy `project` string and a `projectIds` array. `moveNoteToProject` (`DataContext.jsx:86-114`) writes `project: null` and populates `projectIds`; but `dummyData.js:104-113` and the journal migration still set `project`, and `lib/analysis/index.js:100-102` still branches on it. Pick one representation, migrate, delete the other.
- **Tests:** 84 passing now. The highest-value untested surfaces are `DataContext.jsx` CRUD paths (only 3 tests for 317 lines of the app's state core) and `EditorPage.jsx`. Add tests for what you change — every bug you fix should get a test that would have caught it.

### Task 6 — Insight log (a real deliverable, not a footnote)

As you work, keep a running `FINDINGS.md` in the repo root. Every time you discover something the codebase's owner doesn't know, append an entry:

```
## <short title>
**Where:** path/file.jsx:LINE
**What:** what's actually happening
**Why it matters:** the consequence, concretely
**Fix:** what you did, or what you'd do — with an effort estimate (S/M/L)
**Status:** fixed | proposed | needs-a-decision
```

Prioritize: data-loss risks, security issues, things that are silently broken (features that look present but do nothing), and architectural decisions that will hurt later. The bar: would this change what he builds next? If yes, write it down.

Separately, end the run with a **prioritized list of what to do next**, ordered by (impact × cheapness), with honest effort estimates. Be opinionated. "Here are 40 things" is useless; "here are the 6 things that matter, in this order, and here's why the rest can wait" is what's wanted.

---

## 3. HOW TO WORK

**Verify everything you claim.** The commands:

```bash
npm run dev                          # dev server → http://localhost:5183/MAIA/  (note the /MAIA/ base path)
npx vitest run                       # full test suite — must stay at 84+ passing
npx eslint src/                      # must not exceed 19 errors; drive it down
npm run lint:tokens                  # token ratchet — currently 124; drive it down
npm run build                        # web build must exit 0
npx tauri build --debug --no-bundle  # desktop build must exit 0
```

**Look at the UI.** You are doing design work. Screenshot the pages you change, at 1440×900 and at the 420×480 minimum, before and after. If your harness can't drive a browser, say so explicitly in your report rather than asserting a visual result you didn't see — do not claim "now it looks clean" on faith.

**Work in phases, commit per phase.** One coherent commit per task above, with a message that explains *why*, not just what. Do not produce one enormous commit at the end. If a phase turns out bigger than expected, commit the working part and note what's left.

**Don't rewrite working code to "clean it up."** The owner's standing instruction. Refactor when you're already in a file for a real reason, or when a file is on the known-complexity list and you're adding to it. Extraction is welcome; speculative restructuring is not.

**Immutability is non-negotiable.** Never mutate state objects in place — always spread into new ones. `DataContext`'s `toggleTask` (`:217-260`) has a dense nested `.map` chain that's easy to break this way.

**File hygiene:** many small files over few large ones. 200–400 lines typical, 800 hard max. New sub-components go in `features/<Feature>/components/` or alongside their page. The known-complexity files — `CustomIcon.jsx` (1054), `LedgerPage.jsx` (1030), `NotesPage.jsx` (677), `ChronosModal.jsx` (644), `ProjectIcon.jsx` (524) — must only shrink.

**If you hit something ambiguous,** make the reasonable call, note the assumption in `FINDINGS.md`, and keep going. Don't stall. The exceptions where you should stop and ask instead: installing a dependency, changing the data model in a way that needs a migration, or anything that would touch the vault-writing path in a way that could lose a note.

**Report honestly.** If a test fails, say so with the output. If you skipped something, say what and why. If you couldn't verify a claim, label it unverified. A report that overstates what happened is worse than one that admits a gap.

---

## 4. WHAT SUCCESS LOOKS LIKE

At the end of 6 hours, the owner should be able to open MAIA and find that:

- The Today screen fills the window and looks deliberate.
- Chronos reads as one tool, and its calendar is legible and keyboard/screen-reader accessible.
- Search finds notes instantly, with nothing clipped.
- The app looks like one coherent product across every screen.
- Nothing that worked before is broken — same or better on all five baseline numbers.
- `CLAUDE.md` is true.
- `FINDINGS.md` tells him things he didn't know, and the next-steps list tells him where to spend the following session.

Depth over breadth. Verify over assert. Leave it better and leave a map.
