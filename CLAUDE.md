# MAIA — Claude Code Instructions

## What is MAIA

Personal operating system / knowledge management app. Built by Dušan as a solo project.
Think Notion + Obsidian + calendar — glass aesthetic, offline-first, PWA.

## Stack

- **React 19** + **Vite 7** — no Next.js, no SSR
- **Tailwind CSS 3** — primary styling, no CSS modules
- **Framer Motion** — animations
- **TipTap** — rich text editor
- **D3 + Three.js** — knowledge graph visualization
- **Recharts** — charts
- **Radix UI** — accessible primitives (no full Radix import, cherry-picked)
- **Lucide React** — icons (plus custom SVG system in `CustomIcon.jsx`)
- **Context API** — global state (no Redux, no Zustand)
- **localStorage** — all persistence (no backend, no DB)
- **Vitest + Testing Library** — tests (run with `npm test`)
- **GitHub Pages** — deployment via `npm run deploy`, base path `/MAIA/`

## Project Structure

```
src/
├── App.jsx               # routing + global modal state
├── main.jsx              # entry, SW registration
├── index.css             # design tokens (CSS vars) + global styles
│
├── pages/                # route-level views (one component per page)
├── components/           # shared components + ui/ primitives
│   └── ui/               # low-level atoms: button, card, badge, dock, etc.
├── features/             # self-contained feature modules
│   ├── Opus/             # AI assistant feature
│   ├── Graph/            # knowledge graph (D3 + Three.js)
│   └── Ledger/           # decision ledger
├── context/
│   └── DataContext.jsx   # global state: notes, projects, tasks, ledger, reminders
├── hooks/                # custom hooks (useLocalStorage, useSignals, useWeather…)
├── lib/                  # pure utilities (utils.js, constants.js, time.js, ids.js)
│   └── analysis/         # signal extraction engine (velocity, staleness, clusters)
└── utils/                # app-level utilities (notify.js, dummyData.js)
```

## Design System — Glass UI

MAIA has a signature glass aesthetic. Key patterns:

```jsx
// Glass panel
<div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[24px]" />

// or use the utility class
<div className="glass-panel" />
```

Custom tokens live in `src/index.css` as CSS variables:
- Colors: `--maia-black`, `--maia-midnight`, `--maia-card`, `--maia-border`, `--maia-ring`
- Glass: `--maia-glass-bg`, `--maia-glass-bg-strong`, `--maia-glass-border`
- Spacing: `--space-xs` through `--space-4xl`, fluid variants `--space-fluid-*`
- Type: `--font-sans` (Onest), `--font-mono` (IBM Plex Mono), `--font-serif` (Instrument Serif)
- Fluid text: `--fluid-3xs` through `--fluid-3xl` (responsive clamp values)

Priority colors via `getPriorityColor()` in `src/lib/utils.js` → neon: blue, orange, green.

## Global State (DataContext)

`src/context/DataContext.jsx` is the single source of truth.

Entities:
- **notes** — `{ id, title, content, tags[], links[], createdAt, project, projectIds[] }`
- **projects** — `{ id, name, status, createdAt }`
- **tasks/reminders** — `{ id, title, description, priority, dueDate, ... }`
- **ledger** — `{ id, title, stakes, outcome, decision, ... }`
- **sessions** — focus/work sessions

All data persists to localStorage. DataContext includes migration logic for legacy data shapes — don't break it.

## Key Constants (src/lib/constants.js)

- `TASK_PRIORITIES` — priority levels enum
- `SIGNAL_PRIORITIES` — signal levels enum
- `STORAGE_KEYS` — all localStorage key names
- `INPUT_CLASS` — reusable input className string

## Routing

Handled in `App.jsx` via simple conditional rendering (no React Router). Pages are imported directly; `GraphPage` is lazy-loaded via `React.lazy()`.

Modal state also lives in `App.jsx` — modals like `ChronosModal`, `DecisionLedger`, `CreateProjectModal` are mounted at app root level.

## Known Complexity Problems (don't make worse)

| File | Lines | Issue |
|------|-------|-------|
| `src/components/ChronosModal.jsx` | ~1911 | Monolith — task/event/signal/session UI all in one |
| `src/pages/LedgerPage.jsx` | ~912 | Inline modal + card components that should be extracted |
| `src/pages/NotesPage.jsx` | ~624 | Growing, watch it |
| `src/pages/CanvasPage.jsx` | ~588 | Konva canvas logic accumulating |

If touching these files: extract, don't add. New sub-components go in `features/` or alongside the page.

## Conventions

- **Components**: PascalCase, `.jsx` extension
- **Hooks**: `use` prefix, `.js` extension
- **Constants**: SCREAMING_SNAKE_CASE
- **Utilities**: camelCase functions
- **No TypeScript** — plain JS/JSX throughout
- **No class components**
- **Functional components + hooks only**
- **Tailwind first** — no inline styles unless unavoidable (canvas, Three.js)
- **`cn()` utility** from `src/lib/utils.js` for conditional classNames (wraps `tailwind-merge`)

## Dev Commands

```bash
npm run dev        # start dev server (localhost:5173)
npm run build      # production build
npm run deploy     # build + push to GitHub Pages
npm test           # Vitest
npx eslint src/    # lint
```

## Notifications / Audio

`src/utils/notify.js` handles browser notifications + Web Audio API sound effects + task scheduling via service worker. Don't touch without understanding the SW communication pattern.

## Icons

Two systems coexist:
1. **Lucide React** — general icons
2. **`CustomIcon.jsx`** (84KB) — MAIA-specific SVG icons, accessed by name prop

When adding icons, prefer Lucide unless a custom MAIA icon exists for the context.

## Do Not

- Install packages without asking
- Add a backend or external DB — localStorage only
- Break the DataContext migration logic
- Add class components
- Add TypeScript without asking (it's intentionally plain JS)
- Add comments explaining *what* the code does — only *why* if non-obvious
