# Sprint questions and bugs

Append-only. Each entry: agent, bug or question, repro, suggested fix.

---

## Codex tests agent: focus lost after cancelling "Move to folder" from the tree context menu (bug)

- **Repro:** Focus a note row in the Codex tree, right-click it, choose "Move to folder", press Cancel. `document.activeElement` is `<body>`, not the note row. Test: `src/features/Codex/components/NotesSidebar.contextMenu.test.jsx`, marked `it.fails` so the suite stays green. Flip it to `it` once fixed.
- **Cause:** `AppDialog` captures `document.activeElement` in a layout effect when `open` becomes true. At that moment the focused element is the context-menu item, which unmounts when the menu closes. The `isConnected` check on restore then skips the focus call.
- **Suggested fix:** Let the opener be passed in explicitly (for example `returnFocusRef` or an `onCloseAutoFocus` that focuses `[data-key="n:<id>"]` in the tree), or capture the focus target when the context menu opens rather than when the dialog opens.

## Codex tests agent: blank-space context menu creates in the selected folder, not the root (question)

- **Repro:** Select folder "Omnis" in the tree, right-click empty space, choose "New note here". The note is created in "Omnis". Pinned by a test in `NotesSidebar.contextMenu.test.jsx` as current behaviour.
- **Question:** Is "blank space" meant to mean the vault root (the Obsidian convention) or the current selection? If root, `menuFolder` in `NotesSidebar.jsx` should be `""` for `kind: "root"`, and the test should change with it.

## Codex tests agent: NewTabPage passes the click event into onCreateNote (minor)

- **Repro:** `NewTabPage.jsx` wires `onClick={action.run}`, so `onCreateNote` receives a `MouseEvent`. `App.jsx` `handleCreateNote` takes no arguments, so the note lands at the root today.
- **Risk:** If the handler ever takes an optional folder argument, it will receive the event.
- **Suggested fix:** `run: () => onCreateNote()` in `NewTabPage.jsx`.

## Codex tests agent: CodexPage reads the active note's folder without normalising it (minor)

- **Location:** `CodexPage.jsx`, `const activeFolder = notes.find(...)?.folder ?? ""`. `NotesSidebar` uses `normalizeFolder` on the same value.
- **Repro (likely):** A note whose folder is `" Omnis/"` (hand-edited frontmatter) makes ⌘N and the new-tab path pass `" Omnis/"` to `createNote`, while the sidebar treats it as `"Omnis"`.
- **Suggested fix:** Use `normalizeFolder(...)` in `CodexPage.jsx` too.

## Codex tests agent: MoveNoteDialog marks the current folder but does not disable it (question)

- **Behaviour:** The current folder gets `aria-current` and a check icon, but stays clickable. Clicking it closes the dialog and does nothing, because `moveTo` returns early.
- **Question:** Is that enough, or should the row be `disabled` so screen readers announce it as unavailable?

## a11y agent: muted text is below 4.5:1 in the light theme (taste)
- **Finding:** Arc's `--text-muted` (`--neutral-7`, oklch 59%) measures 4.11:1 on `--background` and 3.86:1 on `--surface-muted` in the light theme (dark theme passes: 5.49 and 4.62). It fails WCAG 1.4.3 for text. Numbers come from `src/lib/contrast.test.js`.
- **Done in MAIA's own files:** every use of `--text-muted` for text in Codex, Graph and shell CSS now uses `--text-secondary` (7.13:1). Icons and chevrons keep `--text-muted` (3:1 is enough for them).
- **Recommendation:** fix it at the source, in kvcc-arc: `--neutral-7` to about oklch(54% 0 0) gives 5.06:1 on white and 4.75:1 on `--surface-muted`. Then MAIA can go back to `--text-muted` where you want the quieter look. I did not touch `foundation.css`.

## a11y agent: Arc `--border` is 1.2:1 against the surface (taste)
- **Finding:** input, chip and card outlines use `--border` (oklch 93.5%, 1.21:1 light, 1.24:1 dark). WCAG 1.4.11 wants 3:1 for the boundary of an input. Most of our fields also have a label and fill, so the shortfall is mild, but a bare text input is hard to find for low-vision users.
- **Recommendation:** an input-specific token (`--border-control`, about 3:1) in kvcc-arc, used by `input`, `select`, `search-field`. Not something to patch from MAIA.

## a11y agent: Delete and Backspace close a Codex tab (behaviour)
- Keeping it, now declared with `aria-keyshortcuts`. The per-tab close buttons stay out of the tab order (`tabIndex=-1`), so Delete is the keyboard route. Backspace as a close key is easy to hit by accident; recommendation: drop Backspace, keep Delete.

## Resolved by the a11y agent
- "focus lost after cancelling Move to folder from the tree context menu" (Codex tests agent): `NotesSidebar` now hands focus back to the row the menu was opened on, through `onCloseAutoFocus` on `MoveNoteDialog` and the new-folder dialog. The `it.fails` test is now a normal `it`.

## data-safety reviewer (mcp, opusFiles, lib.rs)
- Q: Should `open_in_default_app` also refuse .html/.htm/.xhtml/.svg? They open in the browser from file:// and can run script; a project asset could be one. Blocking changes what the Library "Open" does for those files. Recommendation: block html/htm/xhtml, keep svg (images preview anyway), show "Open it from Finder if you trust it".
- Q: The Tauri adapter writes existing files in place (`writeTextFile` truncates then writes), so a crash or power loss mid-write leaves a partial file (the MCP server already writes temp + rename). Fix is temp file next to the target + `rename`, but the temp name must not start with a dot (fs scope) so Obsidian/Drive would briefly see `<name>.md.tmp`, and the watcher must ignore it. Recommendation: do it, but only after trying it in a real `tauri dev` window; I could not verify it there.
