# Maia Design System

> Calm, dark, premium. A "Glass" aesthetic over pitch black — for a personal knowledge OS that moves at the speed of thought.

## What is Maia?

**Maia** is a React-based personal knowledge management and operating system — a single-user "second brain" that unifies notes, tasks, events, projects, decisions, and a graph view into one calm, dark-glass interface. It is a progressive web app (PWA) designed as a desktop pill-dock experience with a full mobile tab-bar fallback.

Core product surfaces (pages):

| Surface | Path | Purpose |
|---|---|---|
| **Today (Home)** | `HomePage` | Greeting, world map with weather, Focus widget, Quick Capture |
| **Codex** | `NotesPage` | All notes / overview |
| **Opus** | `ProjectsPage` | Projects & next actions |
| **Conexa** | `GraphPage` | D3-powered knowledge graph |
| **Ledger** | `LedgerPage` | Decision ledger |
| **Editor** | `EditorPage` | TipTap-powered rich-text note editor |
| **Canvas** | `CanvasPage` | Konva-powered freeform canvas |
| **Chronos** | modal | Task / event management hub |

All surfaces live behind a single **floating pill-dock** (`Dock`) on desktop and a **bottom tab bar** on mobile, with a global **Command Palette** (`⌘K`) for search and actions.

## Sources

- **GitHub repo**: `kvcc-dusan/MAIA` (branch: `main`)
- **Key references**:
  - `src/index.css` — design tokens (`:root`), glass utilities, TipTap prose styles
  - `tailwind.config.cjs` — color / font / spacing / fluid scales
  - `src/components/GlassSurface.jsx` — the foundational backdrop-blur + SVG-turbulence glass panel
  - `src/components/GlassCard.jsx` — `GlassCard` / `GlassListItem` / `GlassInput` / `GlassTextarea` variants
  - `src/components/ui/` — shadcn-style primitives (`button`, `badge`, `card`, `pill`, `dock`)
  - `src/components/CommandPalette.jsx` — `⌘K` overlay
  - `src/pages/HomePage.jsx` — dashboard composition

## Index

- `README.md` — this file
- `colors_and_type.css` — CSS custom properties (tokens + semantic text roles)
- `assets/` — logos (`maia-logo.svg`, `maia-logo.png`, `maia-app-logo.png`, `maia-logo-large.png`)
- `fonts/` — web fonts are loaded from Google Fonts CDN (Onest, IBM Plex Mono) — no local font files
- `preview/` — design-system preview cards (type, color, components, brand)
- `ui_kits/maia-app/` — interactive high-fidelity recreation of the Maia desktop app
- `SKILL.md` — agent-skill manifest (for use inside Claude Code)

---

## Visual Foundations

### Mood
Pitch-black, slow, quiet, deliberate. Maia wants you to feel a **zen state** — not a spreadsheet. Surfaces float on black. Content is never "boxed in" — it's **revealed through glass**. Motion is gentle and confident (200–500ms, ease-out). There are no exclamations, no rainbow accents, no filler content. The default typography is a **cold, technical monospace** (IBM Plex Mono) paired with a **warm, humanist sans** (Onest) for prose and headings.

### Color

- **Base background: pitch `#000000`**. Not `#0a0a0a`, not charcoal — pure black. This is non-negotiable; the glass effects rely on it.
- **Foreground is a zinc scale**: `fg → #fafafa`, `fg-1 → #e4e4e7` (body), `fg-2 → #a1a1aa` (secondary), `fg-3 → #71717a` (labels), `fg-4 → #52525b` (placeholder). No warm grays.
- **Accents are semantic, never decorative**: emerald (active/growth), amber (attention/focus), rose (critical/deletion), sky (links/references), violet (AI / intelligence / blockquotes). Use them sparingly — usually as a single 8–16px swatch: a dot, a tiny border-left on a callout, a tag background, a chevron. Never as page-wide gradients.
- **Imagery vibe**: cool, twilight, and monochromatic. The world-map widget is lit by real sun position against a dim earth. No warm golden-hour photography. No grain.
- **Transparency palette**: layers are built from `white/5`, `white/10`, `white/20` (borders and hover states) and `black/40`, `black/80` (glass fills). All live combinations of these over pitch black.

### Type

- **Sans**: Onest (400, 600) — UI prose, headings, body copy
- **Mono**: IBM Plex Mono (400, 500, 600, 700) — labels, metadata, timestamps, code, and much of the dashboard chrome. The mono voice is a defining Maia signature.
- **Default body uses mono** (`font-family: var(--font-mono)` on `body`). Rich-text (TipTap / `.prose`) switches to sans for reading comfort.
- **Signature label**: micro (`--fluid-3xs`, 8–10px), **UPPERCASE**, `tracking: 0.15em`, `font-weight: 700`, color `muted-foreground`. Used everywhere for card titles, footers, toggle affordances ("MOMENTUM", "ENTRIES", "TODAY'S FOCUS").
- **Fluid scale**: 9 tiers from `--fluid-3xs` (8–10px) to `--fluid-3xl` (40–64px), each a `clamp()` bridging 375 → 1440px. Never hard-code px for text at runtime — use the scale.
- **Tracking**: negative (`-0.02em`) on display headings; positive and wide on micro-labels; neutral on body. Number-heavy UI uses `font-variant-numeric: tabular-nums`.

### Backgrounds
- **Body: solid `#000`**. No images, no patterns, no gradients.
- **Cards: thick glass** — `bg-zinc-900/40` + `backdrop-blur-xl` + `border-white/5` + `shadow-2xl`. The full `GlassSurface` variant also overlays an SVG `feTurbulence` + `feDisplacementMap` filter to simulate physical glass distortion — heavy but distinctive; reserve for hero/canvas elements, not every row.
- **Optional glow**: the signature `withGlow` GlassSurface renders an animated `ColorBends` shader (emerald/blue/white lattice) beneath the glass — the brand's single "living" moment.
- **Full-bleed imagery**: only on hero surfaces (world map, graph canvas). Never behind text blocks.

### Borders & Corners
- **Borders**: `0.5px` (half-pixel, rendered via `border-white/5` or `border-white/10`) — barely there. Use `border-white/20` for active/focus states.
- **Corner radii**:
  - `rounded-xl` / `--radius-lg` (16px) for inner elements, inputs, list rows, dock-icons
  - `rounded-2xl` / `--radius-2xl` (24px) for cards, widgets, the dock itself, the command palette
  - `rounded-[20px]` specifically for `GlassSurface`
  - `rounded-full` for tags, status indicators, and dot pulses
- **Never**: colored left-border accent stripes (avoid this trope). Exception: TipTap blockquote uses a 3px violet left border — that's it.

### Shadows & Elevation
- Three tiers: `shadow-sm` (barely-there), `shadow-lg` (dock / cards), `shadow-2xl` (modals / command palette).
- **Signature "glass rim"** on `GlassSurface`: a double inner box-shadow (`0 1px 0 inset rgba(255,255,255,0.10)` + `0 0 0 1px inset rgba(255,255,255,0.05)`) plus a deep outer drop. This produces a top-edge highlight + subtle bezel that reads as "thick glass."
- No neon glows. No colored shadows. All shadows are pure black at varying opacity.

### Motion
- **Ease**: always `ease-out` (or the `cubic-bezier(0.2, 0.8, 0.2, 1)` equivalent). Never linear, never ease-in-out.
- **Duration**: 200ms (hover / color), 300ms (layout), 500ms (entrances).
- **Framer Motion primitives** on the dock: `whileHover={{ scale: 1.1, y: -2 }}`, `whileTap={{ scale: 0.95 }}`. Subtle lift, never bounce.
- **Modals**: `animate-in fade-in zoom-in-95 duration-200` (Tailwind Animate).
- **Toasts**: slide-in from bottom, fade-in, auto-dismiss at 2.2s.
- **No parallax, no spring physics, no scroll-linked animation.** The only exception is `ColorBends`, which drifts on a long loop under `GlassSurface withGlow`.

### Interaction States
- **Hover**: raise background alpha by one step (`bg-white/5 → bg-white/10`), or lighten text to `white`. Do **not** darken colors; Maia is already dark.
- **Press/active**: scale `0.95` (Framer) or switch to the next-darker surface. No color change.
- **Focus**: rings are explicitly **removed** globally (`:focus, :focus-visible { outline: none; box-shadow: none }`). Focus is communicated through background or text brightness, not a ring. (This is Maia's choice — replicate it, don't fight it.)
- **Disabled**: `opacity-20` + `cursor-not-allowed`.
- **Selection**: `background: #14532d; color: #e5fde8;` — a dim emerald.

### Blur & Transparency
- `backdrop-blur-xl` is used broadly for any "floating over content" surface — dock, modals, command palette, popovers, toasts.
- `backdrop-blur-sm` on softer elements (list row glass).
- Transparency is **stacked with intention**: a modal uses `bg-black/80 + backdrop-blur-sm` for its scrim, and the modal body itself is `bg-black/80 + backdrop-blur-xl`. This dual blur gives depth.

### Layout rules
- **Fixed**: a single floating dock, bottom-centered on desktop (`fixed bottom-4`) with a mobile full-width tab bar below `md:`. Respects `env(safe-area-inset-bottom)`.
- **Pages scroll internally**; `body` has `overflow: hidden`. Only panels scroll.
- **Container**: no max-width on main surfaces — content stretches to edges with `--space-fluid-page` padding. Modals cap at `max-w-5xl` or `600px` (command palette).
- **Grid**: dashboard is a 1-column mobile / 2-column desktop split, left aligned for greetings, right aligned for widget stack.

---

## Content Fundamentals

### Voice & Tone
Maia is a **quiet companion**. It speaks in micro-labels, not sentences. Copy is terse, lowercase-or-mono-uppercase, and never cheerful. It trusts the user.

- **Never** "Welcome!" or "Great job!"
- **Rarely** full sentences; usually 1–4 words. UI labels, not captions.
- **Second-person is implicit** — Maia talks *to* the user but rarely says "you." It says "Today's Focus," not "Your Tasks for Today."
- **First-person plural / first-person singular is absent.** Maia is not a brand-voice mascot.
- **Greeting on Home** uses the user's name directly — `"Good morning, Dušan."` — then a rotating italic quote. That's the only sentence on the page.

### Casing
- **UPPERCASE + tracking-widest + bold** for micro-labels and card titles: `TODAY'S FOCUS`, `MOMENTUM`, `ENTRIES`, `SESSIONS`.
- **Title Case** for page-level nav: `Today`, `Opus`, `Codex`, `Conexa`, `Ledger`, `Chronos`.
- **sentence case** for prose and placeholders: `"What's on your mind…"`.
- **lowercase** acceptable for small secondary metadata (`3d idle`, `+2 more`).

### Punctuation
- Em-dash (`—`) as the signature separator: `Journal — Apr 21`, `Search, Navigate, Act`.
- Ellipsis (`…`) — the real character, never `...` — for placeholders.
- Smart quotes (`'` and `"`) in prose.
- No trailing periods on labels or card titles.

### Naming conventions (product vocabulary)
Maia rebrands common nouns into calm, classical names. Respect them:

| What it is | Maia name | Meaning |
|---|---|---|
| Home / dashboard | **Today** | the single-screen "now" view |
| Notes | **Codex** | the library |
| Projects | **Opus** | a work in progress |
| Graph | **Conexa** | connections |
| Decisions | **Ledger** | a record of what was chosen |
| Tasks / calendar hub | **Chronos** | time |
| Tags | **Signals** | ambient tag velocity / staleness |
| Canvas | **Canvas** | freeform |

Use these names in any new copy. "Tasks" is acceptable inside Chronos, but the top-level surface is Chronos.

### Emoji
**Never in UI.** Maia's source code uses emoji only as section-header comments inside CSS (`/* 🎨 */`, `/* 🌑 */`). No emoji in labels, buttons, toast messages, empty states, or prose. Use Lucide icons instead.

### Example strings (lift these directly)
- Placeholder: `What's on your mind…`
- Empty state: `No focus tasks.` / `No entries yet today.` / `No momentum data yet.`
- Button copy: `Capture`, `Entries`, `Momentum`
- Command palette footer: `Search, Navigate, Act` / `ESC to close`
- Toast: `Note created` (with a small emerald dot before)
- Commands: `New Project`, `New Note`, `Go to Opus`, `Go to Conexa`

---

## Iconography

**Primary system: [Lucide](https://lucide.dev) via `lucide-react`** (already a dependency). All dock, inline, and button icons come from Lucide.

- **Stroke**: 1.8px default; 2.2px for active state (visually "heavier")
- **Size**: 18–20px in the dock, 12–16px inline, 10px for micro-affordances inside buttons (e.g. the arrow inside `Capture →`)
- **Color**: inherits `currentColor` — always `text-muted-foreground` (zinc-500) off-state, `text-white` or `text-foreground` active

**Canonical dock icons** (from `src/App.jsx`):
`CalendarDays` (Today) · `Sparkles` (Opus) · `Library` (Codex) · `Globe` (Conexa) · `Scale` (Ledger) · `Hourglass` (Chronos) · `Search`

**Secondary system: custom SVG icon library** in `src/assets/icons/` — organized into `Arrow/`, `Calendar/`, `Communication/`, etc. These are bespoke, filled-or-line mono SVGs at 16/24 grid, usually 220–900 bytes each. They're used for editor toolbars and secondary UI where Lucide doesn't have a precise match. For new designs, prefer Lucide; reach for the custom set only when a specific shape (e.g. `Arrow_Reload_01`) is needed.

**Emoji**: never used as iconography.
**Unicode**: `✕` (close), `→` (inline nav), `—` (separator), `…` (truncation). That's it.

**In this design system**: we link Lucide from CDN (via `lucide.dev`) — no SVGs copied. If running offline, `npm install lucide-react` in the host project.

---

## Font substitution notes

The production app loads **Onest** and **IBM Plex Mono** from the Google Fonts CDN — no local `.ttf` / `.woff` files exist in the repo. This design system matches that: `colors_and_type.css` imports both from Google Fonts.

No substitution was necessary; both fonts are the originals.

If you need offline/embedded fonts for export (PPTX, PDF), download them from Google Fonts directly and drop them in `fonts/` — the @import in `colors_and_type.css` is the only change needed.

---

## UI Kits

- **`ui_kits/maia-app/`** — Interactive recreation of the Maia desktop "Today" experience plus Command Palette. Shows Dock, Greeting, FocusWidget, QuickCaptureWidget, WorldMap placeholder, and `⌘K`.

---

## Caveats

- **`WorldMapWidget`** (D3 + topojson + real-time sun position) is complex; the UI kit shows a **stylized placeholder** that matches the visual language but is not the real D3 map.
- **`ColorBends`** (the animated shader backdrop for `GlassSurface withGlow`) uses `@react-three/fiber` + shaders. The UI kit uses a static conic-gradient stand-in — the real thing takes 3D context and isn't worth pulling in for a static preview.
- **Custom SVG icon set** (`src/assets/icons/`) is NOT imported here — there are 280+ icons and nearly all are replaced by Lucide in practice. Browse them directly in the GitHub repo if you need a specific shape.
