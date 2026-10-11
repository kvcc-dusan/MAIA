# MAIA: Claude Code instructions

Verified against source 2026-10-10. When this file and the code disagree, the code wins, and this file gets fixed.

## What MAIA is

Personal operating system and knowledge app for Dušan. Solo project, no team, no backend, offline-first. Two targets:

- **Tauri 2 desktop**: the primary target. Notes are plain Markdown files in a user-picked vault folder. Opus projects and tasks are Markdown files in the same vault.
- **Web/PWA** (GitHub Pages, base `/MAIA/`): secondary. localStorage only. `vite.config.js` uses base `/` for Tauri builds.

The seam is `isTauri()` in `src/lib/vault.js`. Filesystem-adjacent code follows one pattern: Tauri gets the real implementation, web falls back to localStorage, and Tauri imports are always dynamic (`await import(...)`) so the web bundle never pulls Tauri code in.

Pages (`PAGES` in `src/App.jsx`): `codex`, `projects` (Opus), `graph` (Conexa). Chronos, Settings, the command palette and vault setup are layers, not pages. The app reopens on the last page (`maia_current_view`, default `projects`). The legacy values `overview` and `editor` map to `codex`.

## Stack (versions from `package.json`)

- React 19.1, Vite 7.1. No Next.js, no SSR, no React Router (page switch in `App.jsx`). No class components.
- Tailwind CSS 4.3 via `@tailwindcss/vite`, CSS-first (`@import 'tailwindcss'`, `@theme` blocks). There is no `tailwind.config.js`. In MAIA's own files Tailwind is for layout. Colour, radius and type must resolve to kvcc-arc tokens. Arc components style themselves with CSS modules: never Tailwind-restyle them.
- Editor: TipTap 2.26.1 (`@tiptap/*`), `tiptap-markdown` 0.8, `markdown-it` 14 with the footnote, mark and task-lists plugins, `lowlight`, `dompurify`, `@tiptap/suggestion` (link suggest). KaTeX 0.19 and mermaid 12 load lazily.
- Graph: D3 7.9 (2D, SVG). 3D view: `three` 0.186.1, `3d-force-graph` 1.80, `three-spritetext` 1.10, lazy-loaded only when the 3D view opens.
- Motion: `framer-motion` 12 (`MotionConfig reducedMotion="user"` in `App.jsx`). `motion` 14 (`motion/react`) is used by Arc components and the Opus board. Both are installed.
- Primitives: `@base-ui/react` 1.6 (`Menu`), Radix packages (dialog, popover, select, tabs, tooltip, dropdown-menu, context-menu and more), `cmdk` (command palette via `ui/command.jsx`), `@dnd-kit` (Opus board only), `sonner` (toasts).
- Data and MCP: `yaml` 2.9 (frontmatter), `zod` 4 and `@modelcontextprotocol/sdk` 1.x (the `mcp/` server).
- Desktop: `@tauri-apps/api`, `plugin-dialog`, `plugin-fs` (2.x), `src-tauri/`. Icons: `lucide-react` (see Conventions). Tests: Vitest 4, jsdom 27, Testing Library.
- Gone: Recharts (Ledger charts are Arc charts), the Today dnd grid, the dock, ColorBends. The unused Manrope and Roboto fontsource packages were removed.

## Feature map

```
src/
├── App.jsx                 routing (PAGES: codex | projects | graph) and global layers
│                           (Chronos, Settings, command palette, vault setup, confirm dialogs), MotionConfig
├── pages/
│   ├── ProjectsPage.jsx    Opus host (renders OpusLayout)
│   ├── NotesPage.jsx       note list inside Codex (Load sample data lives here)
│   └── EditorPage.jsx      note editor inside Codex: rich mode (EditorRich), source mode (SourceEditor),
│                           checkRoundTrip from editor/roundTripSafe.js
├── features/
│   ├── Codex/              CodexPage, codexTabs.js + useCodexTabs.js (tabs in maia.codex.tabs),
│   │                       components/ (NotesSidebar as a file tree, TreeRow, CodexTabStrip, NewTabPage,
│   │                       MoveNoteDialog), properties/ (the Properties panel), folderTree.js, backlinks.js
│   ├── Graph/              Conexa: pages/GraphPage.jsx, GraphRenderer (2D D3), Graph3DRenderer (3D, lazy),
│   │                       hooks/, lib/ (graphForces, graphGroups, colorConvert, viewPrefs)
│   ├── Opus/               OpusLayout.jsx, tabs/ (ten tabs), kit/ (shared primitives), components/, lib/
│   │                       (taskModel, metrics, report, activityLog, projectModel, docModel, people), OpusNavContext.jsx
│   ├── Chronos/            ChronosModal.jsx (a modal), components/ (MonthCalendar, DailyTimeline, TaskRow, SignalRow, ChronosForms)
│   ├── Settings/           SettingsDialog.jsx, sections/ (Appearance, Vault, Data, About, OpusFolderGroup)
│   └── Notes/components/   NoteCard
├── components/
│   ├── shell/              MaiaShell, RailButton, ShellContext (ShellSidebar and ShellTopBar portals), VaultMenu
│   ├── composed/           MAIA app primitives (see Components)
│   ├── arc/                vendored @kvcc installs
│   ├── ui/                 legacy shadcn plus MAIA's own: CustomIcon, PriorityCheckbox, CloseButton, portal
│   └── EditorRich.jsx, SourceEditor.jsx, CommandPalette.jsx, VaultSetup.jsx
├── editor/                 TipTap extensions, one file per feature (see Editor)
├── lib/                    vault.js, vaultLoad.js, vaultFolders.js, vaultFiles.js, noteFile.js, frontmatterProps.js,
│                           noteTags.js, stableId.js, opusFiles/, tokens.js, theme.js, closeFlush.js, backup.js,
│                           opusSafetyBackup.js, openFile.js, time.js
├── hooks/                  useNotesStore, useOpusStore (+ opus/), useLocalStorage, useNavHistory, useDebounced, useLongPress
├── context/                DataContext.jsx, useActivityLog.js, useTaskActions.js, useProjectCollections.js
├── styles/                 tokens.css (legacy-name bridge), base.css, surfaces.css, components.css
├── utils/notify.js         notifications, Web Audio, service-worker scheduling
└── dev/Gallery.jsx         component gallery at ?ui=gallery (dev only)
mcp/                        stdio MCP server (see MCP server)
src-tauri/                  Tauri 2 shell, capabilities, CSP
```

## Editor (`src/editor/`)

TipTap layer. `extensions.js` assembles the list, `src/components/EditorRich.jsx` mounts it, `src/components/SourceEditor.jsx` is the source mode.

- One file per feature: `table.js` (+ `tableCommands.js`, `tableMenu.js`, `tableMarkdown.js`), `callout.js` (+ `calloutTypes.js`, `calloutView.js`), `taskStatus.js`, `wikiLink.js`, `embeds.js` (+ `embedProvider.js`), `image.js`, `refLinks.js`, `entities.js`, `footnotes.js`, `math.js` (+ `mathView.js`, `katexLoader.js`, lazy), `mermaid.js` (lazy), `htmlRaw.js` and `obsidianComment.js` (raw nodes), `rawNode.js`, `softBreak.js`, `markdownIt.js`, `markdownHighlight.js`, `plainText.js`, `linkSuggest*.js` (the link suggest popup).
- `rawNode.js` writes source back exactly as read (`state.text()` would escape it). `strictLinkify.js`: only explicit schemes auto-link; markdown-it's fuzzy linkify turned `odoo.com` and `CLAUDE.md` into links on save.
- `roundTripSafe.js`: a note with syntax the editor cannot keep intact opens in source mode. Its list is empty now; the content fingerprint catches any other change on save. Add a feature's fixture to its own test, not here.
- Obsidian parity: `docs/obsidian-parity.md` (about 200 inputs against TipTap 2.26.1, harness `scripts/obsidian-parity.test.js`).

## Notes (vault)

- `loadVault` in `src/lib/vault.js` reads ALL `.md` files recursively, like Obsidian. `vaultLoad.js` keeps an mtime+size cache, so only changed files are read; reads run 8 at a time (cloud drives). `vaultFiles.js` lists folders with the same limit. Loading never writes.
- `vaultFolders.js` skips names starting with `.`, `node_modules`, and `Opus/` and `_backups/` at the vault root. Only `.md` files count. `watchVault` applies the same rules, debounces 400 ms, and drops MAIA's own write echoes. It needs `tauri-plugin-fs` built with its `watch` feature in `src-tauri/Cargo.toml` (without it every call fails with "Command watch not found" and edits from Obsidian only appear when the window regains focus; `src/lib/tauriWatch.test.js` guards this). An open note adopts an outside change through the sync effect in `EditorPage.jsx`.
- `note.folder` comes from the file location ("" is root) and is never written to frontmatter. `notesMeta.folders` lists every folder, empty ones included. `createFolder` validates the path and runs `mkdir -p`. Moving a note is `updateNote(id, { folder })`. No folder rename or delete yet.
- Minimal footprint (`noteFile.js`, `frontmatterProps.js`): a file keeps the keys, order, quoting and line endings it had (`frontmatterKeys`, `frontmatterRaw`, `frontmatterLayout`, `frontmatterExtra`, all read-time, never written as keys). MAIA never adds `id`, `createdAt` or `links` to a foreign note. `title` is written only when it no longer equals the file name. A key the file lacked is added only once it has a real value. Notes MAIA creates still get `id`, `title`, `createdAt`.
- Id-less foreign files get `stableId(relPath)` and `createdAt` from file mtime. Known limit: renaming such a file changes its id on the next load, so tabs and pins that point at the old id drop.
- `note.tags` is the frontmatter `tags` property only. Inline `#tags` are not copied into it.
- The Properties panel edits one key at a time through `setFrontmatterProperty`, `removeFrontmatterProperty`, `renameFrontmatterProperty`. Values it cannot represent (block scalars, maps, comments) and unreadable blocks are left untouched (`UNSUPPORTED_HINT`). Patches merge over the stored note in `updateNote`, so removals keep empty `frontmatterRaw` and `frontmatterExtra` objects instead of deleting them.
- `useNotesStore.js` is localStorage on web and the vault on desktop, with conflict resolution and a watcher. It was recently hardened against data loss: change it only with a concrete reason. `vault.js` holds the conflict guard (`VaultConflictError`) and the watcher.
- Vault access: `fs:scope` in `src-tauri/capabilities/default.json` is empty. The picked folder is granted at runtime through the `allow_vault_scope` command. Recent vaults: max 5.

## Opus (projects and tasks)

`ProjectsPage.jsx` renders `OpusLayout.jsx`. Ten tabs in `tabs/`: Overview, Board, Tasks, Roadmap, Decisions, Questions, Documents, Notes, Weekly report, Core (Core composes `LibraryTab`). Tab-to-tab links with filters go through `OpusNavContext` (`useOpusNav().navigate('tasks', { status })`). Spec: `~/.claude/plans/opus-hub-spec.md`. Hub reference: `/Users/dusankvcc/Desktop/Atrium/Claude Code/projecthub/out-test`.

Data model:
- `src/features/Opus/lib/taskModel.js` is the ONE status-transition rule (`applyTaskPatch`). Write status with `updateTask(id, { status })`. Never set `done` or `doneAt` by hand: `done` mirrors `status === 'done'`, and `completedAt` is read-only legacy.
- Tasks and projects are normalized on read and on write, never bulk-migrated.
- Task `estimate` is S/M/L. Task `owner` chips and avatars show only when a project has more than one person (`showOwners`). `schedule` and `isNextAction` stay in the data; the Tasks tab does not show them.
- Projects carry `headline`, `focus`, `workstreams`, `decisions`, `questions`, `milestones` (with status), `startDate`, `targetDate`, `phase`, `nextMeeting`. CRUD lives in `context/useProjectCollections.js`. Project decisions are NOT the Ledger decisions.
- Documents are vault notes with `kind` and `status` (optional `workstreamId`, `owner`) in frontmatter. Plain linked notes are the Notes tab.
- Activity: `maia.activity` (localStorage) is append-only, capped at 3000 (`ACTIVITY_CAP` in `features/Opus/lib/activityLog.js`), and included in backups.
- Metrics group by UTC day. Known limit: 00:00 to 02:00 local lands on the previous day.
- Ledger: there is no Ledger page (project decisions live in Opus). `maia.ledger` and the `ledger` state stay in DataContext and in backups.
- Shared kit `features/Opus/kit/` (PageBar, FilterChips, ListRow, MetricTile, GroupCard, marks, format, estimates). Use it before adding a primitive.
- Known duplication: `workstreamColor` is in `kit/format.js` and `tabs/TasksTab.jsx`. Estimate options and due-date helpers are also in `components/board/model.js` and `components/tasks/taskDisplay.js`. Fold them into the kit.

### Storage as files (Tauri with a vault)

Layout (from the header of `src/lib/opusFiles/index.js`):
- `<vault>/Opus/<Project>/project.md`, `tasks/`, `decisions/`, `questions/`, `assets/`, `activity.jsonl`
- `Opus/_inbox/tasks/` and `Opus/_inbox/activity.jsonl` for items with no project
- `Opus/_backups/backup-<ts>.json` (safety backups before an import)
- `Opus/_trash/<date>/<Project|_inbox>/<kind>/<file>` (items deleted through MCP, never loaded)

One file per item, YAML frontmatter. Tasks reference workstreams by NAME and milestones by TITLE.

Code: `src/lib/opusFiles/` (pure readers and writers, `opusFs.js` is the Tauri adapter), `src/hooks/useOpusStore.js` and `src/hooks/opus/` (diff by item id, debounced per-item writes, watcher, conflict copy, one-time migration). Web and no-vault mode stay on localStorage.

Rules that matter:
- A file that fails to parse is reported (Settings, `OpusFolderGroup.jsx`) and NEVER overwritten.
- An untouched file is never rewritten. Names are never renamed by the app, and new files never replace existing ones.
- `Load sample data` is hidden in file mode (`canLoadSamples = opusMeta.mode !== 'files'` in `NotesPage.jsx`). It would replace real files.
- Backup import writes `Opus/_backups/backup-<ts>.json` first.
- `_inbox`, `_backups` and `_trash` are reserved folder names (`names.js`). The loader and the watcher skip `_trash`.
- **No dot paths anywhere** (`.maia-assets`, `.backup-*`). Tauri's fs scope does not match leading-dot components, so such paths cannot be read or written.
- Assets are plain files in `Opus/<Project>/assets/`, any type, up to 250 MB each (`MAX_DISK_FILE_BYTES`, `features/Opus/components/library/assetRules.js`). They are listed from the folder with no metadata record. Asset changes never cause project or task writes.
- Legacy base64 assets (`maia.projectAssets`, browser `project.assets`) are copied into `assets/` once (`maia.assetsMigrated`). Legacy data is never deleted.
- Activity in file mode: one `activity.jsonl` per project (JSON Lines, oldest first, capped at 3000 per file, same guarded writes and debounce as items). A malformed line is warned about, skipped and kept in the file. An external change is folded in without dropping unflushed local edits (`hooks/opus/opusMerge.js`). `maia.activity` is copied in once (`maia.activityMigrated`), never deleted; the web build keeps using it.
- Not verified in a real Tauri window: all file mode. The tests use an in-memory fs.
- Chronos sessions and reminders stay in localStorage.

## MCP server (`mcp/`)

Full tool list, register commands and safety notes: `mcp/README.md`. Summary:
- stdio server: `node mcp/server.js` or `npm run mcp`. `MAIA_VAULT` is required and must exist; `Opus/` is created if missing (`mcp/config.js`).
- 28 tools. Reads: `list_projects`, `get_project`, `list_tasks`, `get_task`, `list_decisions`, `list_questions`, `list_activity`, `list_notes`, `read_note`, `list_trash`, `get_agenda`. Writes: `create_project`, `update_project`, `add_workstream`, `add_milestone`, `create_task`, `update_task`, `add_decision`, `update_decision`, `add_question`, `update_question`, `answer_question`, `create_note`, `weekly_report`. Deletes: `delete_task`, `delete_decision`, `delete_question` (registered in a loop in `mcp/tools/trash.js`), plus `restore_from_trash`.
- Deletes MOVE the file to `Opus/_trash/`. Nothing is erased. No project, note or asset delete tool exists.
- Every write appends an activity entry with `actor: "claude-mcp"` (`mcp/writer.js`) to the project's `activity.jsonl` or `_inbox/activity.jsonl`.
- Unparsable files appear in the `list_projects` warnings and are never overwritten. Untouched files are not rewritten.
- `weekly_report` uses the app's own generator. `save: true` creates the `#report` note once.
- The server reuses the app's codecs in `src/lib/opusFiles` and `applyTaskPatch`. A change to those affects MCP too.
- Tests: `mcp/mcp.test.js`, `mcp/mcp2.test.js`, `mcp/safety.test.js`.

## Design system: kvcc-arc

MAIA's design system is kvcc-arc (Dušan's fork of Arc, uiarc.dev, MIT). Before writing any UI, load the `kvcc-arc` skill and follow it. It has three parts, use all three:

1. **Registry.** `components.json` registers `"@kvcc": "https://kvcc-arc-registry.netlify.app/r/{name}.json"`. Foundation: `npx shadcn@latest add @kvcc/arc-foundation` (lands `src/components/arc/foundation.css` and `src/components/arc/motion-tokens.js`). Components: `npx shadcn@latest add @kvcc/<id>`. MAIA has `tsx: false`, so check every install comes out as `.jsx`/`.js`.
2. **Skill.** `~/.claude/skills/kvcc-arc`. `references/rules.md` (colour, type, shape, motion, touch, menus, charts, tables, destructive actions), `components.md`, `component-index.md`, `extensions.md`, `checklist.md`.
3. **Source repo, read-only.** `/Users/dusankvcc/Desktop/Atrium/Claude Code/kvcc-arc`: `registry/components/<id>/`, `kvcc/extensions/<id>/`, `registry/foundation.css`.

Rules of thumb (binding):
- Look for an existing `@kvcc` item first. Hand-build only when nothing fits, then follow `rules.md` with semantic tokens only (`--surface`, `--foreground`, `--text-secondary`, `--border`, `--accent`, `--danger`). No raw hex, no `--neutral-*`, no Tailwind colour classes.
- Compose Arc components through their documented props. Never restyle internals. `className` is for layout only.
- Arc hard rules that bite legacy code: weights 400/500 only, sentence case, no uppercase or eyebrows, no em dashes in UI copy, no glass, blur, glow or gradients, cards on a 1px border (shadows only on floating layers), radii 18/26/34, 44px touch targets, motion through the motion tokens with a reduced-motion branch.
- Free-set gaps: Chronos calendar and timeline, the Opus board, the D3 graph and the TipTap editor stay hand-built, following `rules.md`.

### shadcn CLI gotchas (`@kvcc` installs)

- With `tsx: false`, `shadcn add @kvcc/<id>` converts `.tsx` to `.jsx` fine, but crashes on `.css` files ("Unexpected token"). Workaround: write each `.css` / `.module.css` by hand from the `content` field of `https://kvcc-arc-registry.netlify.app/r/<id>.json`. If the crash skipped the item's npm dependencies, install them yourself.
- `components.json` style is `base-luma` (base-ui). The converter rewrites Radix `asChild` into base-ui `render={...}` or drops it, which silently breaks Radix-based Arc items (dialog, drawer and tooltip were hit). After every add, run `grep -rn "render=" src/components/arc` and compare `asChild` counts with the registry source. If they differ, re-convert the `.tsx` from the registry JSON with esbuild (`loader: 'tsx', jsx: 'preserve'`) and point `@/lib/motion-tokens` at `../lib/motion-tokens`. There is no `src/lib/motion-tokens`; the file is `src/components/arc/lib/motion-tokens.js`.
- Never hand-edit `src/components/arc/`. `shadcn add` regenerates it. The hand-written CSS from the workaround above is the one exception.
- Base UI portals inside Radix modals need `pointer-events: auto` (Radix sets `body { pointer-events: none }`).

### Theming

- `data-theme="light|dark"` and `data-accent` (MAIA uses `neutral`) on `<html>`, set before first paint by `public/theme-boot.js`. It is an external script because the CSP is `script-src 'self'`. Keep it in sync with `src/lib/theme.js` (`getTheme`, `resolveTheme`, `setTheme`, `subscribe`). Follows `prefers-color-scheme` with a saved user toggle. **Black** is a variant of dark: `data-theme="dark"` plus `data-variant="black"`, with its palette in `src/styles/theme-black.css` (imported after `foundation.css`, never edit foundation). `resolveTheme` returns `dark` for it, so every dark rule, chart and canvas keeps working; `resolveVariant` says `black`. The Settings choice is System / Light / Dark / Black.
- Overrides go in a theme layer after `foundation.css`, never inside `foundation.css`.
- Canvas and chart code (D3, Arc charts, Graph) follows the theme through CSS variables or `subscribe()` from `lib/theme.js`. Subscribe to redraw on theme change.

### Token bridge

- `src/styles/tokens.css` maps MAIA's legacy names (shadcn-style `--card`, `--muted-foreground`, `--priority-1`, and the `@theme inline` utilities such as `bg-card` and `text-muted-foreground`) onto Arc semantic tokens. It owns no colours. It holds the layout and z-index values. It only shrinks; new code uses Arc tokens directly.
- Collision: shadcn's `accent` means hover surface; Arc's `--accent` means brand colour. `bg-accent` is the hover surface. Brand is `bg-brand` and `text-brand`.
- Glass and blur are neutralised in the bridge (blur is 0).
- `src/index.css` is the import manifest. Tokens do not live there.
- Z-index named utilities: `z-sticky` 10, `z-dock` 20 (the name stays; the dock is gone), `z-drawer` 30, `z-overlay` 40, `z-dialog` 50, `z-popover` 60, `z-tooltip` 70, `z-toast` 80. They stay unless Arc's foundation defines its own layering.
- `src/lib/tokens.js` is the runtime bridge for canvas code: `cssVar()`, `resolveColor()`, `tokenColor()`, `clusterColors()`, `graphTheme()`. Chart series colours come from Arc's `--series-1..4` (`tokens.css` maps `--chart-*` onto them). `resolveColor` does NOT convert oklch to rgb, so it is not THREE.Color-safe. The 3D graph converts colours in `src/features/Graph/lib/colorConvert.js`.

### Token ratchet

- `npm run lint:tokens` (`scripts/lint-tokens.mjs`) counts legacy patterns: zinc utilities, white/black alpha, hex, `rgba()`, legacy fluid type, arbitrary z-index, arbitrary radius and font size, `font-mono`. The count must only go down (baseline 1: a `font-mono` in `EditorRich.module.css`). It only counts git-tracked files, so run it again after committing new files. Colour-conversion code and its tests (`lib/tokens.js`, `lib/contrast.test.js`, the Graph `colorConvert` files) are exempt in `ALLOW`.
- Current count: 7 hits in 3 files (measured 2026-10-10: `src/lib/contrast.test.js` 4, `src/features/Graph/components/GraphControls.a11y.test.jsx` 2, `src/components/EditorRich.module.css` 1). The earlier note said 1; that was stale.
- Exempt (the script's ALLOW list): `src/components/ui/CustomIcon.jsx`, `src/styles/tokens.css`, `src/lib/tokens.js` and its test, the Graph colour converter (`colorConvert.js` and its test, `Graph3DRenderer.test.jsx`), `src/components/arc/`, and the vendored shadcn files in `src/components/ui/`. MAIA's own files in `ui/` are not exempt.

## Migration status (kvcc-arc)

One step per pass, then stop for review in `npm run tauri dev`. Plan: `~/.claude/plans/pasted-content-id-cf4c-migrate-goofy-pebble.md`. Branch `ds/kvcc-arc`. Commit history is in `git log`.

- **Done:** 0 safety branch; 1 foundation (`@kvcc` registered, arc-foundation, button canary, motion, Geist and Inter, theme boot); 2 token bridge; 3 primitives (`composed/*` on Arc items, public APIs frozen; `Menu` stays on Base UI styled to the Arc menu spec, because Arc menus take an items array only); 4 shell and pages; 5 Opus redesign; 6 Today removed, Obsidian-style shell, Codex tabs (Dušan's decision: the app is driven by Claude over MCP, so there is no Today page); 7 Opus as the project hub; 7b Ledger page removed (data kept); 8 storage as files (phases 1 and 2); 9 nested vault notes; 10 MCP v2 (recoverable deletes, `weekly_report`).
- **Open:**
  - `ui/PriorityCheckbox.jsx` is still on the legacy look and is used by Chronos `TaskRow.jsx`. Rebuild it on Arc.
  - Favicon lookups in `features/Opus/components/library/LinkRow.jsx` send each link's hostname to `google.com/s2/favicons`. Decide before shipping.
  - `sonner` toasts stay: Arc's toast has no imperative API.
  - Arc calendar is Sunday-first (no week-start prop). Chronos's calendar is hand-built.
  - `IconButton` is still on `ui/tooltip`.
  - The Gallery Menus section crashes (`Menu.Label` outside `Menu.Group`, pre-existing).
- **Deleted (approved):** `GlassCard`, `GlassSurface`, `ColorBends` (and its CSS), the manrope/roboto fontsource packages, `ui/dock`, `styles/home.css`, `dottedBg`, session colour class maps, `--dock-h*` tokens, Recharts, the old Opus record and task-band pieces, `LedgerPage`. Legacy names still in use: `GlassSkeleton.jsx`, `GlassErrorBoundary.jsx`.

## Components

- `src/components/arc/`: vendored @kvcc installs. First choice for any UI.
- `src/components/composed/`: MAIA's app primitives, public APIs frozen: `AppDialog`, `ConfirmDialog`, `PromptDialog`, `SidePanel`, `Menu`, `Select`, `Field`, `EntityForm` (takes `inPanel` inside a SidePanel), `DateTimeField`, `PageHeader`, `SectionCard`, `SectionBits`, `Surface`, `EmptyState`, `ErrorState`, `IconButton`, `StatusDot`. Pages use these. Hand-rolled empty states, overlays without a focus trap and bespoke eyebrows are recurring regressions.
- `src/components/ui/`: legacy. Mostly vendored shadcn. Don't add new usages. `shadcn add` regenerates those files, so hand edits are reverted. MAIA's own files there (`CustomIcon.jsx`, `PriorityCheckbox.jsx`, `CloseButton.jsx`, `portal.jsx`) are not exempt. Deleting any of them needs Dušan's yes.

## Shell and Conexa

- `MaiaShell` renders the page title as a visually hidden h1, so pages render h2 and below.
- Top bar across the window: Tauri overlay title bar (`titleBarStyle: "Overlay"`), traffic lights inset, `data-tauri-drag-region`, back and forward from `useNavHistory`.
- 48px icon rail: Opus, Codex, Conexa | Chronos, Search | theme, plus Settings. A collapsible sidebar that pages fill with `<ShellSidebar>` (Opus: project list; Codex: file tree) and the top-bar slot with `<ShellTopBar>` (Codex: tab strip).
- Codex new-tab page: New note (Cmd+N), New journal, Codex, Go to file (Cmd+O).

## State and data layer

- `src/context/DataContext.jsx` is the single source of truth for projects, tasks, reminders, sessions and ledger, via the hardened `useLocalStorage` (unload flush, corrupt-JSON backup, write errors). It contains a one-time migration from legacy `maia.journal`. Don't break it.
- Immutability: always spread, never mutate. `DataContext.toggleTask`'s nested map chain is easy to break.
- localStorage keys to know: `maia_current_view`, `maia.codex.tabs`, `maia.activity` (+ `maia.activityMigrated`), `maia.assetsMigrated`, `maia.notesMigrated`, `maia.ledger`.
- `src-tauri/`: explicit CSP in `tauri.conf.json`, runtime-scoped fs. Don't loosen either without a reason.
- `src/utils/notify.js` (browser notifications, Web Audio, service-worker task scheduling): the SW pattern is subtle. Don't touch it without understanding it.

## Conventions (binding)

- No TypeScript: plain JS/JSX, deliberate. No class components. Functional components, arrow functions.
- No new dependencies without asking. No backend, no external DB.
- Comment the *why*, not the *what*.
- Tailwind for layout. Inline styles only for canvas, SVG and three.js. `cn()` from `src/lib/utils.js` for conditional classes.
- File size: 200 to 400 lines typical, 800 hard max. The big ones may only shrink and should be extracted into `features/<Feature>/components/`: `components/ui/CustomIcon.jsx` (1054 lines), `pages/NotesPage.jsx` (428).
- Icons: Lucide React by default. `CustomIcon.jsx` (name-keyed MAIA SVG set) only where a MAIA-specific icon exists.
- Never claim work is done without evidence (a test run, a grep, a screenshot).
- Every pass: `npm run lint:tokens`, `npx vitest run`, `npm run build`, plus the `checklist.md` sweeps over changed files. Then report what to check: light and dark, narrow window, keyboard.

## Dev commands

```bash
npm run tauri dev                          # desktop app, hot reload, the review surface; starts Vite itself, so never run `npm run dev` alongside it
npm run dev                                # web at http://localhost:5183/MAIA/ (strictPort, the port is fixed)
npm run build                              # web build
npm run deploy                             # build and push to GitHub Pages (gh-pages)
npx vitest run                             # tests
npx eslint src/                            # lint (ignores src-tauri/target and src/components/arc)
npm run lint:tokens                        # token ratchet, the count must go down
npm run tauri build -- --debug --no-bundle # desktop debug build
```

## Docs

- `docs/obsidian-parity.md`: TipTap parity audit against Obsidian behaviour (2026-10-10).
- `docs/a11y-audit.md`: WCAG 2.2 AA audit of the Codex tree, properties, notices, Conexa and the shell. Read from code and jsdom tests only; no screen reader or real browser check.
- `docs/sprint-questions.md`: append-only log of sprint bugs and questions. `mcp/README.md`: MCP tools, safety rules, register commands.
