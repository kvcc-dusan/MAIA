# Sprint report (2026-10-11, unattended)

Branch `ds/kvcc-arc`. Nothing in this sprint is pushed. Everything is verified in jsdom, mocks and temp directories only, never in a real Tauri window and never against the real vault.

Final state: 136 test files, 1766 tests pass; `npm run build` passes; eslint 0 errors (5 old warnings); `npm run lint:tokens` is 1.

## What landed (commits after 53cafb3)

| Commit | What |
|---|---|
| `27bc694` | Safety review of `mcp/`, `src/lib/opusFiles/`, the Rust open-file command: 9 confirmed bugs fixed (dot-leading titles made hidden files, one unreadable `project.md` broke the whole load, YAML parse freeze on huge frontmatter, lossy rewrite of non-UTF-8 files, binary `.md` accepted, byte-length name limits, exclusive creates, move rollback, NFC names, prototype keys, bounded MCP inputs, no absolute paths in MCP output, wider deny list). |
| `2f83537` | Vault reloads are incremental (mtime + size cache): an unchanged reload reads 0 files instead of all. Five data-loss fixes (dot titles vanishing, case-only folder move deleting a note, load racing a rename, reload adopting an outside edit as baseline, reload cancelling a pending write). |
| `a31144f` | Accessibility pass (30 findings, `docs/a11y-audit.md`) and tests for the Codex UI that had none. |
| `7d1bcf5`, `8bbff40` | Token ratchet exemptions for colour-conversion code, `docs/sprint-questions.md`, a rewritten `CLAUDE.md`. |
| `32838b8` | Editor fidelity: on 257 real notes, open-and-save is byte-identical for 256 (was 52); editing a block only reformats that block. |

## Needs your yes or your taste (full list: `docs/sprint-questions.md`)

1. Blank-space "New note here" in the tree: create at the vault root (Obsidian convention) or in the selected folder (current)?
2. Block `.html/.htm/.xhtml` in "open in default app"? (recommended; svg stays)
3. Atomic writes in the Tauri adapter (temp file + rename): recommended, but only after trying it in a real `tauri dev` window.
4. Fix muted-text and border contrast in kvcc-arc (`--neutral-7`, `--border`), then MAIA can go back to `--text-muted`.
5. Drop Backspace as a tab-close key, keep Delete.
6. Delete orphans: `src/components/ColorBends.css`, fontsource `manrope` and `roboto`.

## Not verified (needs a real window or a terminal with Drive access)

- Real-vault load timings: run `node scratchpad/vault-timing.mjs "<vault path>"` from a terminal that has Google Drive access (macOS blocks agent shells from it).
- Shift+F10 context menu position, skip-link visibility, tree focus ring, VoiceOver (checklist at the end of `docs/a11y-audit.md`).
- Byte-for-byte save relies on blocks remembering their source text; a block is only reused while it still means the same as when it was opened. Watch for any note that changes unexpectedly after an edit and send me the before/after.
- `npm audit --omit=dev` shows 37 moderate/low items (TipTap chain, katex under mermaid). The suggested fix downgrades mermaid, so it was not run.

## Still parked (needs you)

Opus Overview rework, Chronos alignment, darker third theme, live preview editing (needs TipTap 3), 3D graph tuning, kvcc-arc registry deploy (Netlify token).
