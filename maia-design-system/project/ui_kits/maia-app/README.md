# Maia — App UI Kit

High-fidelity recreation of the Maia personal-knowledge app: a calm, dark, glassmorphic environment with a central floating dock and 5 core surfaces.

## Components
- `Dock.jsx` — floating pill dock with tooltip, icons, + search. Mobile tab bar variant.
- `Widgets.jsx` — `WorldMapCard`, `FocusCard`, `CaptureCard` (glass cards used on Home).
- `CommandPalette.jsx` — `⌘K` palette for nav + note search.
- `Pages.jsx` — `HomePage`, `OpusPage`, `CodexPage`, `ConexaPage`, `LedgerPage`.

## Visual rules
- Zinc-950 base, glass cards at `bg-card/80` + `blur(16px)`.
- Aurora accents as page backdrop (violet + sky), far away, very low opacity.
- Uppercase micro-labels (`11 / 700 / .15em`) as the app's voice.
- Mono for data, captured text, tabular counts; Onest for everything else.
- Motion: 200–300ms ease-out. Scale 0.95 on press, 1.05 on hover for interactive icons.

## Interactions
- `⌘K` opens palette; arrows navigate; enter activates; esc closes.
- Capture a note → appears immediately in today's Entries popup on the Home card.
- Dock icons route between pages; active state = white icon + `bg-white/10`.

## Source
Recreated from [kvcc-dusan/MAIA](https://github.com/kvcc-dusan/MAIA) — not production code, cosmetically faithful only.
