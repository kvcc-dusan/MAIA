# FINDINGS

A running log of things the codebase doesn't say out loud — discovered during the 2026-09-18
sprint (Today / Chronos / palette / consistency / quality). Format per entry: where, what,
why it matters, fix, status.

> **Status fields were audited and corrected on 2026-09-19.** The original log marked a number
> of entries `fixed (this sprint)` that were never actually implemented — the sprint ran out of
> budget partway through, and the write-ups for the un-reached work had already been written as
> though done. Every status below has now been verified against the code. The *findings*
> themselves were mostly sound and are kept as-is; one (framer-motion in the dock) was factually
> wrong and is corrected in place.
>
> Verified-fixed work lives in commits `46e24be` (Today), `76288be` (Chronos), `9b1167f`
> (palette) and `bb3c8d6` (graph tokens).

---

## Broken `var(--)` font-family declarations in four places
**Where:** `src/styles/components.css:50`, `src/styles/components.css:354`,
`src/features/Graph/components/GraphRenderer.jsx:135`, `src/features/Opus/components/KnowledgePanel.jsx:231`
**What:** Four declarations read `font-family: var(--)` (two also as `var(--, monospace)`). The
variable name is empty — this always resolves to the fallback or nothing. Presumably meant
`var(--font-mono)`.
**Why it matters:** Editor code blocks, D3 labels and the knowledge-graph labels silently fall
back to inherited/default fonts instead of the intended mono voice.
**Fix:** Replace with `var(--font-mono)`.
**Status:** **partially fixed — 1 of 4.** Only `GraphRenderer.jsx:135` was corrected.
`components.css:50`, `components.css:354` and `KnowledgePanel.jsx:231` are still broken.

## `no-scrollbar` class is dead CSS
**Where:** `src/components/ui/command.jsx:86` (`CommandList`)
**What:** The vendored command list applies `no-scrollbar`, but no such utility is defined
anywhere in the repo's CSS. It hides nothing; it's a base-luma leftover.
**Why it matters:** The command palette's list was clipped at `max-h-72` (288px) with section
headers dangling below the fold — looked broken, suggested missing items.
**Fix:** Override the height from the caller (`CommandPalette.jsx`) — the vendored file merges
caller `className` through `cn`, so no vendored edit is needed.
**Status:** **fixed, but the original write-up overstated it.** The height override is real and
verified (288px → 480px, tailwind-merge resolves the conflict correctly). The claim that
swapping in `custom-scrollbar` makes the scrollbar *visible* is false: `custom-scrollbar`
(`src/styles/surfaces.css:17`) is itself `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`,
i.e. it hides the bar exactly like `no-scrollbar` would have. There is still no scroll
affordance when content overflows the taller box — a fade mask or "more below" hint is the
open follow-up.

## ESLint lints Rust build artifacts
**Where:** `eslint.config.js:8`
**What:** `globalIgnores(['dist'])` only. `src-tauri/target/` contains generated `.js` blobs
(~26 parse errors when linting without a path arg).
**Why it matters:** `npx eslint .` reports phantom errors; CI-style runs are noisy.
**Fix:** Add `src-tauri/target` to `globalIgnores`.
**Status:** **not done.** `eslint.config.js:8` still reads `globalIgnores(['dist'])`.

## ⌘K opens the palette but never toggles it
**Where:** `src/App.jsx:232-238`
**What:** The global keydown listener only called `setCmdOpen(true)`. The dock Search button was
the sole toggler.
**Why it matters:** Muscle memory (`⌘K` to dismiss) did nothing; palette only closed via
Escape/backdrop/button.
**Fix:** Toggle in the listener (`setCmdOpen(v => !v)`) and advertise `⌘K` on the dock button.
**Status:** **fixed** — verified at `App.jsx:237`; the dock button now reads "Search ⌘K".
Note this was scope beyond the five defects the palette task named, and shipped without being
flagged as a deliberate UX change.

## ~~framer-motion is imported but unused in the dock~~ — INCORRECT FINDING
**Where:** `src/components/ui/dock.jsx:2`
**What the original entry claimed:** that `motion` is imported and never referenced, and that
"the hover animations are CSS/framer-free".
**What is actually true:** `motion` is used in **8 places** in that file (`dock.jsx:15, 32, 54,
68, 94, 120, 130, 146`) as `motion.button` / `motion.div`, carrying real `whileHover={{ scale:
1.1, y: -2 }}` and `whileTap={{ scale: 0.95 }}` props. The dock's hover animation is framer,
not CSS. ESLint's `no-unused-vars` reports it as unused, but that is a **false positive** —
the base rule doesn't count member-expression JSX (`motion.button`) as a use of `motion`.
**Why it matters:** The suggested fix — removing the import — would have broken every dock
animation. Worth knowing the lint error here is noise, not debt.
**Status:** **withdrawn — do not action.** The right fix is an eslint-disable or rule config
for this false positive, not deleting the import.

## ~10 unused heavy dependencies declared in package.json
**Where:** `package.json`
**What:** `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`, `ogl`,
`lowlight`, `@tiptap/extension-blockquote`, `@tiptap/extension-heading`,
`@tiptap/extension-code-block-lowlight` have zero import sites in `src/`.
**Why it matters:** None of them currently reach the bundle, but they bloat installs and
mislead future sessions into thinking R3F/ogl are real parts of the graph stack (they are not —
it's raw d3 + SVG; the only THREE usage is `src/components/ColorBends.jsx`).
**Fix:** Owner decision; uninstalling was out of scope (no package changes without asking).
**Status:** **needs-a-decision** — claim re-verified 2026-09-19, all eight have 0 import sites.
(The original entry also listed `framer-motion` here as "one unused import site"; that is
wrong — see the withdrawn entry above. framer-motion is genuinely in use.)

## Chronos day-deselect is a hidden mode switch
**Where:** `src/features/Chronos/ChronosModal.jsx:333`
**What:** Clicking a selected calendar day sets `selectedDate = null`, which silently switched
the left column from "tasks on this day" to "all open tasks across every date".
**Why it matters:** Non-obvious state change with no affordance; users lose their filtered view
by trying to dismiss a highlight.
**Fix:** Keep deselect behavior but make the left column header state explicit.
**Status:** **fixed** — the header now renders `{selectedDate ? formatDayLabel(selectedDate) : "All open"}`,
and the empty state text switches to match (`ChronosModal.jsx:352`).

## Gallery doesn't showcase the Widget shell
**Where:** `src/dev/Gallery.jsx`
**What:** `composed/Widget.jsx` (the Today widget chrome) has no gallery section, unlike every
other composed primitive.
**Why it matters:** The gallery is the design-system baseline; unshown components drift.
**Fix:** Add a Widget section.
**Status:** **proposed** — accurate; `Gallery.jsx` still has no `Widget` reference.

## Chronos calendar cells are unlabeled buttons
**Where:** was `src/components/ChronosModal.jsx:441-466`, now `src/features/Chronos/components/MonthCalendar.jsx:71-96`
**What:** ~30 day cells were `<button>`s whose only content was a bare number span — no
aria-label, no `aria-current`, no `aria-pressed`.
**Why it matters:** Screen readers got a sequence of meaningless buttons; the a11y tree was
empty noise.
**Fix:** Full-date aria-labels + states; has-task dot decoration.
**Status:** **fixed** — verified by reading the live accessibility tree: cells now expose e.g.
`"Saturday, Sep 19, 1 task, today, selected"`, with `aria-pressed` and `aria-current="date"`.
Remaining gap: no arrow-key roving tabindex, so a keyboard user still tabs through up to 42
cells.

## `DailyTimeline` has no current-time indicator
**Where:** `src/features/Chronos/components/DailyTimeline.jsx`
**What:** 48-slot scrolling day grid auto-scrolled to "now" but never marked it.
**Why it matters:** For a time-planning surface, "where am I in the day" is the single most
wanted datum.
**Fix:** Accent now-line + chip, minute ticker, today only.
**Status:** **fixed** — verified live (red now-line with a time chip). Ticker is a
`setInterval(…, 60_000)` with proper `clearInterval` cleanup.

## Date formatting is ad-hoc across Chronos
**Where:** `ChronosModal.jsx`, `DailyTimeline.jsx`, `TaskRow.jsx`, `SignalRow.jsx`
**What:** Mixed `toLocaleTimeString` options, mixed locales (`"en-US"`, `"default"`, `[]`), and
a hand-built hour label — all for the same kinds of values. `lib/time.js` had no formatters.
**Why it matters:** Inconsistent, impossible to localize later, and recreated Intl instances
per render.
**Fix:** Cached `Intl.DateTimeFormat` helpers in `lib/time.js`, used everywhere in Chronos.
**Status:** **fixed** — six cached formatters at `lib/time.js:57-67`; grep confirms zero
`toLocale*` calls remain anywhere under `src/features/Chronos/`.

## `WorldMapWidget` map colors bypass the token system
**Where:** `src/components/WorldMapWidget.jsx:62`
**What:** Land path was `fill-black/50 stroke-white/10` (white/black alpha utilities, flagged by
`lint:tokens`).
**Why it matters:** Token-ratchet debt in a first-class widget.
**Fix:** Token classes.
**Status:** **fixed** — now `fill-background stroke-border`.

## Geolocation denial leaves the weather widget stuck on "Locating…"
**Where:** `src/hooks/useWeather.js:141-157`
**What:** Rejection (denied, timeout, no provider — the desktop app default) propagated to
`setError` and stopped; WorldMapWidget showed "Locating…" forever and two unhandled rejections
hit the console each load.
**Why it matters:** On Tauri desktop this is the *default* state of the app's first screen.
**Fix:** Cache last-good coords in localStorage; on failure use cached coords; if none, real
error state with retry in the widget.
**Status:** **fixed** — verified live: the widget now renders a "No location fix" empty state
with a working Retry button, and the unhandled rejections are gone. Covered by
`src/hooks/useWeather.test.jsx` (3 tests).

## Three duplicate color palettes feed the graph
**Where:** `GraphPage.jsx`, `GraphRenderer.jsx`, `GraphControls.jsx`
**What:** Three independently-defined copies of the cluster COLORS array and the THEME object
(slightly divergent: `text:#a1a1aa` vs `text:#ffffff`).
**Why it matters:** Token debt concentrated here; divergence already existed between the copies.
**Fix:** One runtime-token module sourced from the CSS variables.
**Status:** **fixed, but only completed in `bb3c8d6`.** The sprint converted `GraphPage` and
`GraphRenderer` but left the third copy in `GraphControls.jsx` untouched, and shipped a
`ReferenceError: THEME is not defined` that crashed the whole Conexa page into the error
boundary. Both are now resolved. Note the module is `src/lib/tokens.js`, **not**
`features/Graph/graphTheme.js` as originally written here — no such file exists.
Follow-up recorded there: `resolveColor()` does **not** convert oklch → rgb (current Chrome
preserves oklch through both `getComputedStyle` and canvas `fillStyle`), so it is not a
THREE.Color-safe value. Fine for the D3/SVG consumers today; convert explicitly at the call
site if `ColorBends.jsx` ever starts using it.

## LedgerPage reimplements the DataContext decision API
**Where:** `src/pages/LedgerPage.jsx:474,485` vs `src/context/DataContext.jsx:263-284`
**What:** `addDecision`/`completeReview`/`onDelete` duplicate `createDecision`/`reviewDecision`/
`deleteDecision` against raw `setLedger`. Two divergent write paths for the same entity.
**Why it matters:** Any invariant added in DataContext (timestamps, validation) silently misses
the Ledger page.
**Fix:** Extend the DataContext API (`updateDecision`), consume `useData()` in LedgerPage,
delete the duplicates. Also gate `seedData()` (50 fake decisions, full-replace, reachable from
the settings menu) behind `import.meta.env.DEV`.
**Status:** **not done.** Both implementations still exist; the DataContext trio still has zero
callers outside its own file; `seedData` at `LedgerPage.jsx:539` is still ungated and still
reachable from the settings menu in a production build.

## Notes carry two project representations
**Where:** `DataContext.jsx:31,60,89,100,109`; `dummyData.js`; `EditorPage.jsx`;
`analysis/index.js:101`
**What:** The legacy `project` string and modern `projectIds` array are both live.
**Why it matters:** Note shape depends on origin; searches/analysis disagree by code path.
**Fix:** One-time idempotent migration (name → matching project id in `projectIds`, then null),
then remove the readers/writers.
**Status:** **not done.** `DataContext` still writes `project: null` alongside `projectIds`, and
no migration exists.

## markdown.js (callouts, wikilinks, footnotes, sanitization) had zero callers
**Where:** `src/lib/markdown.js` + `markdown.test.js`
**What:** 69 lines of working, tested rendering machinery — DOMPurify sanitization, callouts,
wikilink resolution, footnotes — with no production caller. Meanwhile EditorPage "reading mode"
just flips `editable` off (same WYSIWYG, not a rendered view).
**Why it matters:** Either dead weight or the missing read-mode renderer.
**Fix:** Decide: wire it in as the real reading mode, or delete it and its test.
**Status:** **not done — still needs the decision.** `makeMarkdown` still has zero production
callers, and there is no `NoteReadView` in `EditorPage.jsx`.

---

## Open follow-ups, roughly by value

1. **Gate `seedData()`** (`LedgerPage.jsx:539`) — a production-reachable button that replaces the
   entire ledger with 50 fake decisions, one confirm dialog, no undo. Cheapest real risk to close.
2. **Collapse the duplicate decision write paths** and the `project`/`projectIds` split — both are
   correctness debt that gets worse with every feature touching those entities.
3. **Decide `markdown.js`'s fate** — wire it into read mode or delete it; leaving 69 lines of
   tested-but-dead sanitization machinery invites someone to assume it's running.
4. **Finish the `var(--font-mono)` fix** in `components.css:50,354` and `KnowledgePanel.jsx:231`.
5. **Scroll affordance for the command palette** — the list is taller now but still has no
   indication that content continues below.
6. **Arrow-key navigation for the Chronos calendar** — labels are correct now; movement isn't.
7. **`src-tauri/target` in eslint's `globalIgnores`** — one line, kills ~26 phantom errors.
