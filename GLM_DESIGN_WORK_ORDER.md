# MAIA — Design Polish Work Order

You are working on **MAIA**, a personal operating system / knowledge-management desktop app. Solo project, one user (Dušan, a designer-developer), no team, no backend, no users to migrate. Branch `ds/foundation`.

**This run is about design.** The app works. What it isn't yet is *premium*. Screens were built at different times and don't share a visual language. Your job is to make MAIA look and feel like one product designed by one person with taste.

You have a large token budget and hours to spend. **Fan out into parallel agents** (structure in §6) and go deep. Depth over breadth: three surfaces made genuinely beautiful beats twelve surfaces nudged.

---

## 0. READ THIS FIRST — two documents in this repo will mislead you

**`CLAUDE.md` is substantially false.** Written early, never updated. Verified wrong on:

| It claims | Reality |
|---|---|
| Tailwind CSS 3 | **Tailwind 4.3.3** (`@tailwindcss/vite`, `@import 'tailwindcss'`, `@theme` blocks) |
| Tokens `--maia-black`, `--maia-glass-bg`, `--maia-border` | **Zero `--maia-*` variables exist.** `grep -r -- "--maia-" src/` returns nothing |
| Spacing `--space-xs`…`--space-4xl`, fluid `--fluid-*` | **None exist** |
| Fonts: Onest, IBM Plex Mono, Instrument Serif | **Manrope Variable + Roboto Variable** |
| "Tokens live in `src/index.css`" | That's a 16-line import manifest. Real tokens: **`src/styles/tokens.css`** |
| `src/pages/CanvasPage.jsx` | Does not exist |

Correcting `CLAUDE.md` is a deliverable of this run. Trust source over docs, always.

**`FINDINGS.md` was audited and corrected on 2026-09-19.** A previous unsupervised run marked work `fixed (this sprint)` that was never implemented. The status fields are now accurate — read it, it's a genuine map of outstanding debt. Note especially the entry marked **withdrawn**: "framer-motion is unused in the dock" is *wrong*, `motion` is used in 8 places, and acting on it would break every dock animation.

**The lesson from that run, which is now a hard rule for you: never write down that something is done before it is done.** Every claim you make must be backed by evidence you actually produced — a passing test, a grep result, a screenshot. See §7.

---

## 1. VERIFIED GROUND TRUTH

React 19.1 · Vite 7.1 · **Tailwind CSS 4.3** · Framer Motion · TipTap · D3 (SVG, not Three) · Recharts · Radix + base-ui · cmdk · dnd-kit · sonner · Vitest + Testing Library · **Tauri 2**.

Two targets: **Tauri desktop** (primary; notes are markdown files in a user-picked vault) and **web/PWA** (secondary, base path `/MAIA/`). The seam is `isTauri()` from `src/lib/vault.js`.

### The token system — `src/styles/tokens.css`

Read this file end to end before writing a single class. It is a deliberate, well-documented system. **Apply it; do not redesign it. Do not introduce a second palette.**

- **Surfaces / elevation:** `background`, `background-subtle`, `card`, `popover`, `elevated`, `glass`
- **Text ramp (5 steps):** `foreground`, `foreground-secondary`, `muted-foreground`, `subtle-foreground`, `faint-foreground`
- **Lines / overlays:** `border`, `border-subtle`, `border-strong`, `overlay-subtle`, `overlay`, `overlay-strong`
- **Status:** `success`, `warning`, `info`, `intel`, `destructive` (+ `-foreground` pairs)
- **Priority:** `priority-1/2/3` · **Literal white escape hatch:** `pure`
- **Type (7 steps, 12px floor):** `text-xs` → `text-3xl`, line-heights paired. `font-sans` (Manrope) UI, `font-heading` (Roboto), `font-mono` discouraged as UI voice
- **Radius:** `rounded-sm|md|lg|xl|2xl|3xl|4xl` off `--radius: 0.625rem`
- **Spacing:** standard scale + `px-page` (`clamp(1rem, 4vw, 4rem)`) + `dock` / `dock-desktop`
- **Elevation:** `shadow-ambient`, `shadow-raised`, `shadow-overlay`, `shadow-glass`
- **Z-index — named only, never arbitrary:** `z-sticky` 10 · `z-dock` 20 · `z-drawer` 30 · `z-overlay` 40 · `z-dialog` 50 · `z-popover` 60 · `z-tooltip` 70 · `z-toast` 80

Ratchet: `npm run lint:tokens`. **Current: 94 violations / 23 files** — 57 hex, 25 `rgba()`, 17 white/black alpha, 1 `font-mono`. Zero arbitrary z-index/radius/font-size, zero raw zinc. Worst: `styles/components.css` (22), `ProjectIcon.jsx` (14), `GlassSurface.jsx` (11), `KnowledgePanel.jsx` (8), `NotesPage.jsx` (5), the three Ledger charts (4 each).

`src/lib/tokens.js` exists for canvas surfaces (D3/Recharts) that take colour as JS strings: `cssVar()`, `resolveColor()`, `tokenColor()`, `clusterColors()`, `graphTheme()`. Read its header — it documents that `resolveColor` does **not** convert oklch→rgb (Chrome preserves oklch through both `getComputedStyle` and canvas `fillStyle`), so it is not a THREE.Color-safe value. Fine for D3/SVG/Recharts. Use it instead of writing new hexes.

### Component inventory — reuse, don't reinvent

`src/components/composed/`: `AppDialog` `ConfirmDialog` `PromptDialog` `SidePanel` `Menu` `Select` `Field` `EntityForm` `DateTimeField` `PageHeader` `Widget` `Surface` `EmptyState` `ErrorState` `IconButton` `StatusDot`

`src/components/ui/`: mostly **vendored shadcn** (`button`, `dialog`, `command`, `popover`, `select`, `tabs`, `input`, `sonner`…) — regenerated by `shadcn add`, so edits get reverted and the token linter exempts them. MAIA's own (`dock`, `CustomIcon`, `PriorityCheckbox`, `CloseButton`, `portal`) are **not** exempt.

`src/dev/Gallery.jsx` is the component gallery.

Known gaps: `EmptyState`/`ErrorState` are imported only by `GlassErrorBoundary` and `Gallery` — every page hand-rolls its own. `IconButton`'s docstring admits ~14% of 154 buttons have an `aria-label`.

---

## 2. THE DESIGN REFERENCE: Opus and Codex

**Opus** (`src/features/Opus/`, the project command centre) and **Codex** (`src/pages/NotesPage.jsx`, the note library) are the visual target. Every other surface should feel like it belongs to the same app as these two. Open both in the running app and study them before touching anything.

### The Opus vocabulary, extracted from source

**Page shell** — `OpusLayout.jsx:28`
```
w-full px-page py-8 flex flex-col gap-6 bg-transparent min-h-screen
style={{ paddingBottom: 'calc(var(--dock-h) + 2rem)' }}
```
Transparent over the app background, generous `px-page` gutter, `gap-6` rhythm between layers, explicit dock clearance.

**The section card — the single most important pattern** — `KnowledgePanel.jsx:26-42`
```
rounded-2xl bg-card/40 backdrop-blur-xl border border-border shadow-2xl overflow-hidden
  header: flex items-center justify-between px-5 py-4 border-b border-border-subtle
    icon @12px text-subtle-foreground
    h3: text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold
    count badge: text-xs text-subtle-foreground bg-overlay-subtle px-1.5 py-0.5 rounded-full
    action: w-6 h-6 grid place-items-center text-subtle-foreground
            hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors
  body
```
**This is where the premium feel comes from**: translucent card + backdrop blur + hairline border + deep shadow, floating over a near-black ground. Depth through layered translucency, never flat fills.

**Status pill** — `ProjectVitality.jsx:82`
```
flex items-center gap-2 px-2 py-1 rounded-full bg-overlay-subtle border border-border-subtle backdrop-blur-xs
```

**Display title** — `ProjectIdentity.jsx:17-21`
```
font-bold font-sans leading-none
clamp(2.2rem, 3.5vw, 2.75rem), letter-spacing: -0.02em
```

**Layer grid** — `OpusLayout.jsx:40`: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`

**Staggered entrance** — `animate-in fade-in slide-in-from-bottom-4 duration-500`, then `slide-in-from-bottom-8 duration-700 delay-200` for the next layer. Subtle, quick, one direction.

### The Codex vocabulary

**Sticky section header** — `NotesPage.jsx:308`
```
sticky top-0 z-sticky bg-background/80 backdrop-blur-xl flex items-center justify-between
pb-6 border-b border-border-subtle pt-2
```
**Eyebrow label**: `text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold` + count pill.
**Primary action**: solid light button, `h-8 px-3 rounded-lg`, `text-xs font-bold uppercase tracking-wide`, `active:scale-95`.
**Secondary action**: `bg-overlay-subtle hover:bg-overlay border border-border-subtle`.
**Card grid**: `grid gap-4`, cards with title `text-sm font-medium line-clamp-2`, excerpt `text-xs line-clamp-6`, footer meta row pinned `mt-auto pt-3`.

### The distilled design language — what "premium" means here

1. **Near-black ground, translucent cards.** Content floats on `bg-card/40 backdrop-blur-xl` with a hairline `border-border` and a deep shadow. Never a flat mid-grey sheet.
2. **Depth is earned by blur + border + shadow together.** All three, or it reads cheap.
3. **One eyebrow style for every section label**: `text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold`, optionally preceded by a 12px icon.
4. **Counts are pills**, not parentheses: `bg-overlay-subtle px-1.5 py-0.5 rounded-full`.
5. **Type hierarchy is wide** — a `clamp()` display title next to `text-xs` labels. Don't flatten toward the middle.
6. **Restraint with colour.** The palette is achromatic; colour means *status* (priority dots, the green ACTIVE pill), never decoration.
7. **Motion is quick and directional** — 500–700ms, fade + small upward slide, staggered by layer. Nothing bounces.
8. **Generous breathing room**: `px-page` gutters, `gap-6` between sections, `px-5 py-4` card headers.

### ⚠️ Do NOT copy the reference pages' token hygiene

Opus and Codex are the reference for **visual language and rhythm only**. Their own token discipline is poor and you must not propagate it:

- `KnowledgePanel.jsx` — **8 violations**; `NotesPage.jsx` — **5**, including `bg-[#121214]`, `text-[#71717a]` ×2, `shadow-[0_0_15px_rgba(255,255,255,0.1)]`
- Both use raw `bg-black` / `bg-black/80` instead of `bg-background`
- `text-emerald-400`, `text-red-400` instead of `text-success` / `text-destructive`
- `bg-white text-black` for primary buttons instead of `bg-primary text-primary-foreground`
- `text-white` instead of `text-foreground`
- `border-faint-foreground` — a *text* token used as a border

**Part of your job is to lift Opus and Codex themselves onto tokens with zero visual change**, so that "match Opus" and "use tokens" stop being in tension. Do this early — the other surfaces are going to be copied from these, and you want the copy source clean first.

---

## 3. NAMED PROBLEMS (the owner called these out directly)

### 3a. Chronos is a flat grey slab — the worst offender

`src/features/Chronos/ChronosModal.jsx` + `components/` (`MonthCalendar`, `DailyTimeline`, `TaskRow`, `SignalRow`)

**Diagnosed precisely:** Chronos renders inside `AppDialog size="full"`, which is now genuinely full-bleed (`sm:max-w-[calc(100%-2rem)] h-[calc(100dvh-2rem)]`). `DialogContent` paints `bg-popover` = `oklch(0.205 0 0)` — a flat mid-grey. So you get a **near-fullscreen flat grey sheet**.

Then compare surface vocabulary. Opus components use: `bg-overlay-subtle` ×14, `bg-card/40` ×5, `border-border` ×9, `border-border-strong` ×4, `bg-overlay` ×2. Chronos uses, in the entire file: **one** `bg-muted/20`, two `bg-accent`, and some borders. It has essentially no surface vocabulary — just dividers ruled across grey.

**The fix:** give Chronos the Opus card system. The dialog surface should be dark (the app ground), with Tasks, Signals, Calendar and Sessions as *distinct translucent cards* — `rounded-2xl bg-card/40 backdrop-blur-xl border border-border shadow-2xl` — separated by `gap-6`, each with the standard eyebrow header. Stop dividing a grey rectangle with lines; start floating cards on black.

Also still open there (verified): the left column still has large dead space with few tasks; past-month day numbers are near-illegible; weekday headers are tiny and low-contrast; the calendar has no arrow-key navigation (labels are correct now — that part was genuinely fixed).

### 3b. The search palette needs a real redesign

`src/components/CommandPalette.jsx` (+ vendored `src/components/ui/command.jsx` — see caveat)

The last pass improved ordering (notes first, recents on empty query), added a keyboard footer and `⌘K` toggle, and raised the clip height 288px → 480px. It is still not good:

- Same flat `bg-popover` grey as Chronos — no blur, no depth, no relationship to the Opus card language
- **There is still no scroll affordance.** The previous run claimed swapping `no-scrollbar` for `custom-scrollbar` made the bar visible; that's false — `custom-scrollbar` (`src/styles/surfaces.css:17`) is itself `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. Content past 480px is silently hidden. Needs a real affordance (fade mask, count, or an actually visible slim bar)
- Result rows are visually undifferentiated — a note, a navigation target and a destructive-ish action all look identical. No type, no icon language, no secondary metadata (tags, date, project)
- No empty/no-match state worth the name
- Selection highlight is a barely-there background; it should be unmistakable

**Design it properly.** This is the fastest path through the whole app and it should feel like the best part of it. Think: a floating translucent panel in the Opus card idiom, clear row anatomy (icon · title · context · shortcut), obvious selection, grouped with the same eyebrow labels as everywhere else, and a footer that teaches the keys.

⚠️ `src/components/ui/command.jsx` is **vendored shadcn** — `shadcn add command` would overwrite it. Prefer `CommandPalette.jsx` or a wrapper. If you genuinely must edit the vendored file, say so explicitly in your report as a tracked divergence.

### 3c. Everything else, aligned to the reference

In rough priority: **Chronos** (3a) → **Search** (3b) → **Today** (`HomePage`/`TodayGrid`/widgets) → **Ledger** (`LedgerPage.jsx`, 1030 lines, 22 `bg-overlay-subtle` + 18 `bg-overlay` + raw `bg-white`/`bg-black/80`) → **Editor** (`EditorPage.jsx`, raw `bg-black/90`, `bg-black/80`) → **Graph** (`features/Graph/`) → the shared shells (`AppDialog`, `SidePanel`, `Widget`, `GlassCard`, `GlassSurface`).

Today specifically: the layout was fixed (hero header, height-filling grid) but the *widgets* are now tall and internally empty — the dead space moved from the page into the cards. They need real internal density, and the three footer treatments (`MOMENTUM`, `ENTRIES`, `CAPTURE`) are three different things pretending to be the same thing.

### 3d. One verified functional bug, cheap to fix

`src/features/Graph/components/GraphControls.jsx:65` renders `fixed inset-0 z-drawer` — a full-screen invisible overlay at z-30, while the dock is `z-dock` (z-20). **The overlay sits above the dock and swallows every dock click while the Graph page is open**, so you can't navigate away using the dock. Reproduced live. Scope the overlay to the panel, or put it below `z-dock`.

---

## 4. ALSO WORTH DOING (from the corrected FINDINGS.md)

1. **Gate `seedData()`** — `LedgerPage.jsx:539`, reachable from the settings menu in a production build, replaces the entire ledger with 50 fake decisions behind one confirm dialog, no undo. Cheapest real risk in the app. `import.meta.env.DEV`.
2. **`prefers-reduced-motion`** — currently **zero** handling despite heavy Framer Motion. A global media query killing large transforms is an acceptable minimum. This is an accessibility requirement, not a nicety.
3. **`aria-label` on icon-only buttons** — 63 raw `<button>`s across `pages/` + `features/` lack one. Migrate to `composed/IconButton`, which enforces a `label` prop.
4. **`EmptyState` / `ErrorState` adoption** — every page hand-rolls these. A consistent empty state is a big part of feeling finished.
5. **Finish `var(--font-mono)`** — `styles/components.css:50`, `:354` and `KnowledgePanel.jsx:231` still read `font-family: var(--)`, an empty variable name that always falls back.
6. **Arrow-key navigation for the Chronos calendar** — labels are right; movement isn't (42 tab stops).
7. **`src-tauri/target` in eslint `globalIgnores`** — one line, kills ~26 phantom errors.

---

## 5. HARD CONSTRAINTS

- **No TypeScript.** Plain JS/JSX, deliberately. Don't convert.
- **No class components.**
- **No new dependencies without asking.** If you think one is genuinely needed, stop and justify it in your report instead of installing it.
- **No backend, no external DB.**
- **Don't touch, without a specific reason:** `src/lib/vault.js` (conflict guard), `src/hooks/useNotesStore.js`, `src/utils/notify.js` (subtle SW pattern), `src-tauri/` security config, `src/context/DataContext.jsx` migration logic. These were recently hardened against real data-loss and security bugs.
- **Immutability:** never mutate state objects; always spread. `DataContext`'s `toggleTask` has a dense nested `.map` chain that's easy to break.
- **File size:** 200–400 lines typical, 800 hard max. The known-complexity files — `CustomIcon.jsx` (1054), `LedgerPage.jsx` (1030), `NotesPage.jsx` (677), `ChronosModal.jsx` (599), `ProjectIcon.jsx` (524) — may only shrink. Extract into `features/<Feature>/components/`.
- **Don't rewrite working code to "clean it up."** Refactor when you're already in a file for a real reason.

---

## 6. HOW TO FAN OUT

Parallelise by **surface**, because the conflict risk is shared files, not shared concepts. Assign each agent exclusive ownership of its files. Nominate one agent as the **design-system owner**; it goes first and alone.

**Wave 1 — one agent, must finish before the rest start.**
*Design-system owner.* Lift Opus + Codex onto tokens with **zero visual change** (screenshot before/after and diff them). Then extract the shared vocabulary into something reusable — a documented `SectionCard` in `components/composed/`, an eyebrow/`SectionLabel`, a `CountPill` — and add them to `src/dev/Gallery.jsx`. Every later agent consumes these instead of re-deriving the classes. Owns: `features/Opus/**`, `pages/NotesPage.jsx`, `components/composed/**`, `dev/Gallery.jsx`.

**Wave 2 — parallel, after Wave 1 lands.**
- **Agent A — Chronos** (§3a). Owns `features/Chronos/**`. Highest-value visual win.
- **Agent B — Search palette** (§3b). Owns `components/CommandPalette.jsx` (+ wrapper if needed).
- **Agent C — Today** (§3c). Owns `pages/HomePage.jsx`, `features/Today/**`, the three widget components, `composed/Widget.jsx`.
- **Agent D — Ledger + Editor.** Owns `pages/LedgerPage.jsx`, `pages/EditorPage.jsx`, `features/Ledger/**`. Also gates `seedData` (§4.1).
- **Agent E — Graph + shared chrome.** Owns `features/Graph/**`, `components/ui/dock.jsx`, `components/GlassCard.jsx`, `GlassSurface.jsx`. Fixes the dock-click bug (§3d).

**Wave 3 — one agent, after Wave 2.**
*Cross-cutting sweep.* `prefers-reduced-motion`, the `aria-label` pass, `EmptyState`/`ErrorState` adoption where Wave 2 didn't, the `var(--font-mono)` fix, eslint ignores, and the **`CLAUDE.md` correction**. Then a full-app consistency review at 1440×900 and at the 420×480 desktop minimum.

**Rules for every agent:** touch only your files; if you need a change in someone else's, write it in your report instead of reaching across. Commit per surface with a message explaining *why*. Run the full verification (§7) before you call anything done.

---

## 7. VERIFICATION — non-negotiable

```bash
npm run dev                          # http://localhost:5183/MAIA/   (note the /MAIA/ base path)
npx vitest run                       # 100 passing / 100 — must not regress
npx eslint src/                      # 19 errors, 12 warnings — must not increase; drive it down
npm run lint:tokens                  # 94 violations / 23 files — must go DOWN this run
npm run build                        # must exit 0
npx tauri build --debug --no-bundle  # must exit 0
```

**Every one of those numbers must be the same or better when you finish.**

**You are doing design work, so you must look at it.** Screenshot every surface you change — before and after, at 1440×900 and at 420×480. Put them in your report. If your harness can't drive a browser, **say so explicitly** rather than asserting a visual outcome you didn't observe. "It now looks clean" without a screenshot is not a claim you are allowed to make.

**Evidence rules, learned from the last run:**
- Never mark something done before it is done. Write the log entry *after* the change, from the diff.
- Before claiming a fix, re-grep for the thing you claim you fixed. The last run claimed four `var(--)` sites fixed and did one.
- Before claiming a finding, verify it. The last run reported an import as unused that was used in 8 places, and recommended a change that would have broken the dock.
- A commit is not done until the app **runs**. The last run left an uncommitted `ReferenceError: THEME is not defined` that crashed an entire page into the error boundary. Load every page you touched.

Append to `FINDINGS.md` using its existing format (where / what / why it matters / fix / status). Its statuses are currently accurate — keep them that way.

---

## 8. WHAT SUCCESS LOOKS LIKE

Open MAIA and every screen feels like it belongs to Opus. Chronos is a set of floating cards on black, not a grey slab. Search is the nicest thing in the app. The Today widgets are dense and purposeful. Nothing is clipped, nothing is stranded in dead space, every empty state was designed rather than defaulted. The token count went down, not up. Nothing that worked before is broken.

And `FINDINGS.md` tells the truth about all of it.

Depth over breadth. Verify over assert. Screenshot everything.
