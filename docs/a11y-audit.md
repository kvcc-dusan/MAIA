# Accessibility audit: Codex tree, properties, notices, Conexa, shell

Scope: the UI added recently, against WCAG 2.2 AA. Method: reading the code, jsdom tests with user-event that assert roles, names and keyboard behaviour, and contrast computed from Arc's token values (`src/lib/contrast.js`, tested in `src/lib/contrast.test.js`). Nothing here was checked with a real screen reader or in a real browser.

## Findings

Severity: high = blocks a task for keyboard or screen reader users, medium = works but is confusing or incomplete, low = polish.

| # | Area | Finding | Sev | WCAG | Status |
|---|------|---------|-----|------|--------|
| 1 | Tree | `aria-setsize` and `aria-posinset` counted all visible rows, not siblings under the parent | medium | 1.3.1 | Fixed (`flattenTree` now computes sibling position and size) |
| 2 | Tree | Folder row name was "Omnis 3" (bare count) | medium | 1.3.1, 2.5.3 | Fixed: name is "Omnis, 3 notes", count is `aria-hidden` |
| 3 | Tree | No `aria-selected` on the open note | low | 4.1.2 | Fixed |
| 4 | Tree | No `*`, no type-ahead | low | 2.1.1 (not required, pattern parity) | Added: `*` opens siblings, type-ahead with 700 ms reset |
| 5 | Tree | Keyboard context menu relied on the browser placing a keyboard `contextmenu` event; Shift+F10 and the ContextMenu key now replay an event at the row | medium | 2.1.1 | Fixed, tested |
| 6 | Tree | Escape on the row menu, or any pick, left focus on `<body>` | high | 2.4.3, 3.2.1 | Fixed (menu close and both dialogs hand focus to the row) |
| 7 | Move dialog | Cancel left focus on `<body>` (reported by the tests agent) | high | 2.4.3 | Fixed, `it.fails` test turned into a passing test |
| 8 | Move dialog | Initial focus was the dialog's close button; options had no list name; nested folders were announced by leaf name only; check icon had its own label | medium | 2.4.3, 1.3.1 | Fixed: starts on the current folder, list named "Folders", option names are full paths with ", current folder" |
| 9 | Properties | Edit button name "Edit status" hid the current value | high | 1.3.1, 4.1.2 | Fixed: value is the button's description |
| 10 | Properties | Adding or removing a tag chip was silent; removing moved focus to `<body>` | high | 4.1.3, 2.4.3 | Fixed: polite status region per list, focus moves to the add field |
| 11 | Properties | Removing a property (menu then confirm) and cancelling the add form lost focus | high | 2.4.3 | Fixed: focus goes to the Properties heading button, or to Add property |
| 12 | Properties | List value had no group name | low | 1.3.1 | Fixed: `role=group` labelled with the property |
| 13 | Properties | Enter and Escape behaviour of inline editors was undocumented | low | 3.3.2 | `aria-keyshortcuts="Enter Escape"` on the three editors |
| 14 | Properties | Confirm dialog did not close when the write failed | low | 3.3.1 | Fixed (`onClose`) |
| 15 | Contrast | `--text-muted` is 4.11:1 on background and 3.86:1 on `--surface-muted` in the light theme | high | 1.4.3 | Worked around in MAIA's own CSS (muted text now `--text-secondary`, 7.13:1). Root cause is Arc's foundation, see sprint-questions.md |
| 16 | Contrast | `--border` is 1.2:1 against surfaces, so input boundaries are faint | medium | 1.4.11 | Not fixed: Arc token, see sprint-questions.md |
| 17 | NoteHeader, SyntaxNotice | Banners already render as `role=status` through Arc `alert` (only `tone=danger` is `role=alert`). "Source mode" does not interrupt | n/a | 4.1.3 | Verified, test added |
| 18 | NoteHeader | The "More" button is named "More" | low | 2.4.6 | Not changed: `EditorPage.sourceMode.test.jsx` (not in my area) looks it up by that name. Suggest "Note actions" |
| 19 | Conexa | Graph toggle was named "Open/Close graph controls" and also had `aria-expanded` (state said twice, and the name flips) | medium | 4.1.2 | Fixed: stable name "Graph controls" plus `aria-expanded` |
| 20 | Conexa | 3D stage `aria-label` was a paragraph | medium | 2.4.6 | Fixed: name "3D knowledge graph", instructions in `aria-describedby` text |
| 21 | Conexa | Search results could only zoom; opening a note needed a pointer or the first-match Enter | high | 2.1.1 | Fixed: Shift+Enter on a result opens it, declared with `aria-keyshortcuts`; a polite region reports the match count |
| 22 | Conexa | Reduced motion | n/a | 2.3.3 | Verified: scene sets `autoRotate = !reducedMotion`, pulse is frozen at 0.5, camera moves are instant. Test added. The 2D D3 graph uses a 1 s zoom transition and a CSS opacity transition; not changed (not in scope) |
| 23 | Conexa | Sliders, switches, 2D/3D and Color by | n/a | 4.1.2 | Verified: sliders expose name and `aria-valuetext`; the segmented controls are named groups of `aria-pressed` buttons (Arc design), not radiogroups; left as is because it is vendored |
| 24 | Shell | No skip link | high | 2.4.1 | Fixed: "Skip to content", first tab stop, focuses `<main>` |
| 25 | Shell | Sidebar toggle had a flipping name plus `aria-expanded` | low | 4.1.2 | Fixed: removed `aria-expanded`, name says the action |
| 26 | Shell | Landmarks | n/a | 1.3.1 | Verified: banner, nav "Primary", complementary "Sidebar", main, h1 per page |
| 27 | Tab strip | Tabs had no tabpanel | medium | 4.1.2 | Fixed: content wrapped in `role=tabpanel` labelled by the active tab; tabs get ids and `aria-controls` |
| 28 | Tab strip | Close buttons are out of the tab order (`tabIndex=-1`) and the Delete/Backspace route was undeclared | medium | 2.1.1 | Delete/Backspace now declared with `aria-keyshortcuts`; close buttons are named "Close <title>" |
| 29 | Tab strip | Close buttons live inside `role=tablist` through a `presentation` wrapper, which strict validators flag | low | 1.3.1 | Not fixed: restructuring the strip changes its layout |
| 30 | Tree | Rows rely on Arc's global focus ring; the ring is switched off for `tabindex=-1` elements, which is correct for roving tabindex only because the focused row is always `tabindex=0` after focus | low | 2.4.7 | Verified by test (one tab stop that follows focus); not verified visually |

## Contrast table (computed, WCAG ratios)

| Token | Light on background | Light on surface-muted | Dark on background | Dark on surface-muted |
|-------|--------------------|------------------------|--------------------|-----------------------|
| foreground | 19.67 | 18.46 | 16.44 | 13.83 |
| text-secondary | 7.13 | 6.69 | 8.91 | 7.50 |
| text-muted | **4.11** | **3.86** | 5.49 | 4.62 |
| danger | 5.65 | 5.30 | 6.97 | 5.87 |
| border | 1.21 | 1.14 | 1.31 | 1.10 |
| accent-strong (focus ring base) | 16.45 | 15.44 | 14.13 | 11.89 |

`text-muted` is 3:1 or better everywhere, which covers icons and chevrons (kept). Neutral accent only; other accents were not computed.

## Not fixed, and why

- Arc `segmented-control` is a group of toggle buttons, not a radiogroup. Vendored, never hand-edited.
- Arc `--text-muted` and `--border`: foundation tokens, tracked in `docs/sprint-questions.md`.
- "More" button name (finding 18) and tab strip close-button nesting (29).
- The 2D D3 graph's own motion.
- Target size: rail buttons and tree rows are 36 px on pointer devices (above the 24 px minimum of 2.5.8), 44 px on coarse pointers. Chips' remove buttons use Arc `sm` size. Not measured in a browser.

## Manual screen-reader pass (VoiceOver, macOS)

Do this in the Tauri window, light and dark, once. VO = Control+Option.

1. Skip link: press Tab right after launch. You should hear "Skip to content, link". Enter, then VO should say you are in the main area.
2. Landmarks: VO+U, Landmarks list. Expect Banner, Primary navigation, Sidebar (complementary), Main.
3. File tree: VO+Right into the tree. Check you hear "tree", the row name, "level 2", "3 of 5", expanded or collapsed, and for folders "Omnis, 2 notes". Arrow keys with VO keys off (Quick Nav off, or Control+Option+Shift+Down to interact) must move and announce. Try `*`, typing "r", Home, End.
4. Context menu: on a row press Shift+F10 (Fn+Shift+F10 on a MacBook keyboard) or the ContextMenu key. Pick "Move to folder". The dialog should open on the current folder; Escape should return you to the same row.
5. Properties: tab to Properties, expand. Each row should read as "Edit status, button, Value: draft". Add a tag and listen for "Added #beta to tags. 2 items." Remove one and check focus stays in the tag field. Remove a property through the menu and confirm: focus should land on the Properties heading.
6. Source mode banner: switch a note to Source mode. VoiceOver should read the banner once, politely, without stealing focus.
7. Tabs: with focus in the tab strip, Left/Right moves, Enter activates, VO should announce "selected" and the panel association. Delete closes a tab. Check what VoiceOver says about the close buttons (reach with VO+Right).
8. Conexa: open the graph in 3D. Tab to the canvas group, listen for its name and instructions. Tab to the controls button, open it, type a title, check "N matching nodes", Tab to a result, press Enter (zoom) then Shift+Enter (opens the note). Check the sliders announce their value in words ("1.0x").
9. Reduced motion: turn on System Settings, Accessibility, Display, Reduce motion. Reload. 3D graph must not rotate or pulse.

Known gaps for this pass: VoiceOver's handling of `role=tree` inside WebKit is inconsistent about announcing `aria-posinset` on flat trees; if it reads "1 of 14" instead of "2 of 3", the markup is right and it is a WebKit quirk. Note it rather than changing the markup.
