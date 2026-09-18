# FINDINGS

A running log of things the codebase doesn't say out loud — discovered during the 2026-09-18
sprint (Today / Chronos / palette / consistency / quality). Format per entry: where, what,
why it matters, fix, status.

---

## Broken `var(--)` font-family declarations in four places
**Where:** `src/styles/components.css:50`, `src/styles/components.css:354`, `src/features/Graph/components/GraphRenderer.jsx:136`, `src/features/Opus/components/KnowledgePanel.jsx:231`
**What:** Four declarations read `font-family: var(--)` (two also as `var(--, monospace)`). The
variable name is empty — this always resolves to the fallback or nothing. Presumably meant
`var(--font-mono)`.
**Why it matters:** Editor code blocks, D3 labels and the knowledge-graph labels silently fall
back to inherited/default fonts instead of the intended mono voice.
**Fix:** Replace with `var(--font-mono)`.
**Status:** fixed (this sprint)

## `no-scrollbar` class is dead CSS
**Where:** `src/components/ui/command.jsx:86` (`CommandList`)
**What:** The vendored command list applies `no-scrollbar`, but no such utility is defined
anywhere in the repo's CSS (`surfaces.css` only defines `custom-scrollbar`). It hides nothing;
it's a base-luma leftover.
**Why it matters:** The command palette's list is clipped at `max-h-72` with *no* scrollbar —
looks broken, suggests missing items.
**Fix:** Override from the caller (`CommandPalette.jsx`) — the vendored file merges caller
`className` through `cn`, so no vendored edit is needed. Use `custom-scrollbar`.
**Status:** fixed (this sprint)

## ESLint lints Rust build artifacts
**Where:** `eslint.config.js:8`
**What:** `globalIgnores(['dist'])` only. `src-tauri/target/` contains generated `.js` blobs
(~26 parse errors when linting without a path arg).
**Why it matters:** `npx eslint .` reports phantom errors; CI-style runs are noisy.
**Fix:** Add `src-tauri/target` to `globalIgnores`.
**Status:** fixed (this sprint)

## ⌘K opens the palette but never toggles it
**Where:** `src/App.jsx:231-240`
**What:** The global keydown listener only calls `setCmdOpen(true)`. The dock Search button is
the sole toggler.
**Why it matters:** Muscle memory (`⌘K` to dismiss) does nothing; palette only closes via
Escape/backdrop/button.
**Fix:** Toggle in the listener (`setCmdOpen(v => !v)`) and advertise `⌘K` on the dock tooltip.
**Status:** fixed (this sprint)

## framer-motion is imported but unused in the dock
**Where:** `src/components/ui/dock.jsx:2`
**What:** `motion` is imported from framer-motion and never referenced (ESLint error). The
hover animations are CSS/framer-free.
**Why it matters:** Confuses bundle accounting; either the dependency rides the main chunk or
tree-shakes to nothing — either way the import is dead weight.
**Fix:** Remove the import (keep the dependency; it may still be used elsewhere later).
**Status:** fixed (this sprint)

## ~10 unused heavy dependencies declared in package.json
**Where:** `package.json`
**What:** `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`, `ogl`,
`lowlight`, `@tiptap/extension-blockquote`, `@tiptap/extension-heading`,
`@tiptap/extension-code-block-lowlight` have zero import sites in `src/`. Also `framer-motion`
has exactly one (unused) import site.
**Why it matters:** None of them currently reach the bundle, but they bloat installs and
mislead future sessions into thinking R3F/ogl are real parts of the graph stack (they are not —
it's raw d3 + three).
**Fix:** Owner decision; uninstalling was out of scope this sprint (no package changes without
asking).
**Status:** needs-a-decision

## Chronos day-deselect is a hidden mode switch
**Where:** `src/components/ChronosModal.jsx:350-351` (pre-sprint numbering)
**What:** Clicking a selected calendar day sets `selectedDate = null`, which silently switches
the left column from "tasks on this day" to "all open tasks across every date".
**Why it matters:** Non-obvious state change with no affordance; users lose their filtered view
by trying to dismiss a highlight.
**Fix:** Keep deselect behavior but make the left column header state explicit ("All open
tasks" vs "Tasks · Sep 18").
**Status:** fixed (this sprint)

## Gallery doesn't showcase the Widget shell
**Where:** `src/dev/Gallery.jsx`
**What:** `composed/Widget.jsx` (the Today widget chrome) has no gallery section, unlike every
other composed primitive.
**Why it matters:** The gallery is the design-system baseline; unshown components drift.
**Fix:** Add a Widget section.
**Status:** proposed

## Chronos calendar cells are unlabeled buttons
**Where:** `src/components/ChronosModal.jsx:441-466` (pre-sprint)
**What:** ~30 day cells are `<button>`s whose only content is a bare number span — no
aria-label, no `aria-current`, no `aria-pressed`, not a `role="grid"`.
**Why it matters:** Screen readers get a sequence of meaningless buttons; the a11y tree is
empty noise.
**Fix:** Full-date aria-labels + states; has-task dot decoration.
**Status:** fixed (this sprint)

## `DailyTimeline` has no current-time indicator
**Where:** `src/components/DailyTimeline.jsx`
**What:** 48-slot, ~1920px-tall scrolling day grid auto-scrolls to "now" but never marks it.
**Why it matters:** For a time-planning surface, "where am I in the day" is the single most
wanted datum.
**Fix:** Accent now-line + chip, minute ticker, today only.
**Status:** fixed (this sprint)

## Date formatting is ad-hoc across Chronos
**Where:** `ChronosModal.jsx:204,220,413,414`, `DailyTimeline.jsx:90,371,448`,
`TaskRow.jsx:44,62`, `SignalRow.jsx:33,52`
**What:** Mixed `toLocaleTimeString` options (`hour: 'numeric'` vs `'2-digit'`), mixed locales
(`"en-US"`, `"default"`, `[]`), and a hand-built hour label — all for the same kinds of values.
`lib/time.js` has no formatters.
**Why it matters:** Inconsistent, impossible to localize later, and recreates Intl instances
per render.
**Fix:** Cached `Intl.DateTimeFormat` helpers in `lib/time.js`, used everywhere in Chronos.
**Status:** fixed (this sprint)

## `WorldMapWidget` map colors bypass the token system
**Where:** `src/components/WorldMapWidget.jsx:59`
**What:** Land path is `fill-black/50 stroke-white/10` (white/black alpha utilities, flagged by
`lint:tokens`).
**Why it matters:** Token-ratchet debt in a first-class widget; also the only Today-surface
violations.
**Fix:** Token classes (`fill-overlay-strong` / `stroke-border` or equivalents).
**Status:** fixed (this sprint)

## Geolocation denial leaves the weather widget stuck on "Locating…"
**Where:** `src/hooks/useWeather.js:117-165`
**What:** Rejection (denied, timeout, no provider — the desktop app default) propagates to
`setError` and stops; WorldMapWidget shows "Locating…" forever and two unhandled rejections hit
the console each load. Every 10-min refresh re-prompts.
**Why it matters:** On Tauri desktop this is the *default* state of the app's first screen.
**Fix:** Cache last-good coords in localStorage; on failure use cached coords; if none, real
error state with retry in the widget.
**Status:** fixed (this sprint)

## Three duplicate color palettes feed the graph
**Where:** `GraphPage.jsx:12-29`, `GraphRenderer.jsx:8-16`, `GraphControls.jsx:8-13`
**What:** Three independently-defined copies of the cluster COLORS array and the THEME object
(slightly divergent: `text:#a1a1aa` vs `text:#ffffff`).
**Why it matters:** Token debt concentrated here (31 of 124 violations); divergence already
exists between the copies.
**Fix:** One `features/Graph/graphTheme.js` sourced from runtime CSS variables (`lib/tokens.js`).
**Status:** fixed (this sprint)

## LedgerPage reimplements the DataContext decision API
**Where:** `src/pages/LedgerPage.jsx:474-501` vs `src/context/DataContext.jsx:263-284`
**What:** `addDecision`/`completeReview`/`onDelete` duplicate `createDecision`/`reviewDecision`/
`deleteDecision` against raw `setLedger`. Two divergent write paths for the same entity.
**Why it matters:** Any invariant added in DataContext (timestamps, validation) silently misses
the Ledger page.
**Fix:** Extend the DataContext API (`updateDecision`), consume `useData()` in LedgerPage,
delete the duplicates. Also gate `seedData()` (50 fake decisions, full-replace, reachable from
the settings menu) behind `import.meta.env.DEV`.
**Status:** fixed (this sprint)

## Notes carry two project representations
**Where:** `DataContext.jsx:31,60,89,100,109,128` write `project: null` + `projectIds`;
`dummyData.js:111` and `EditorPage.jsx:68` still write the legacy name string;
`analysis/index.js:101` and `EditorPage.jsx:32,111-114` still read it.
**What:** The legacy `project` string and modern `projectIds` array are both live.
**Why it matters:** Note shape depends on origin; searches/analysis disagree by code path.
**Fix:** One-time idempotent migration (name → matching project id in `projectIds`, then null),
then remove the readers/writers.
**Status:** fixed (this sprint)

## markdown.js (callouts, wikilinks, footnotes, sanitization) had zero callers
**Where:** `src/lib/markdown.js` + `markdown.test.js`
**What:** 69 lines of working, tested rendering machinery — DOMPurify sanitization, callouts,
wikilink resolution, footnotes — with no production caller. Meanwhile EditorPage "reading mode"
just flips `editable` off (same WYSIWYG, not a rendered view), and highlights/footnotes don't
exist in the edit path.
**Why it matters:** Either dead weight or the missing read-mode renderer. Decision (owner-
approved): wire it in as the real reading mode.
**Status:** fixed (this sprint — `NoteReadView` in EditorPage)
