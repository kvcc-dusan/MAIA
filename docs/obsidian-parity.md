# Obsidian parity audit: EditorRich

Measured 2026-10-10 against TipTap 2.26.1, tiptap-markdown 0.8.10, markdown-it 14.3.2, prosemirror-markdown 1.13.2.
About 200 inputs were run through a headless editor with the same extension list as `src/components/EditorRich.jsx`. Harness: `scripts/obsidian-parity.test.js`.

## How it was measured

- Load: `new Editor({ content: md, extensions })`. This is the same path as the component (`content: value`, markdown parsed by tiptap-markdown).
- Save: `editor.storage.markdown.getMarkdown()`. This is what `onUpdate` sends to `onChange` and on to disk.
- The extension list is a copy of EditorRich's. The component builds it inside `useMemo`, so it is not reusable headlessly. `WikiLinkExtension` is not in the copy: it only adds decorations and a click handler and does not touch the schema or serialization. Keep the copy in sync if EditorRich changes.
- Live typing: simulated through `handleKeyDown` (Space, so `AutoMarkdownShortcuts` runs) and then `handleTextInput` (so TipTap input rules run). Enter-triggered rules were not simulated, except a manual split for the code fence.
- Frontmatter goes through `markdownToNote` first, exactly as in the app.

### When does data get written

`EditorRich` only calls `onChange` from `onUpdate`, which fires on a real user edit. External content is loaded with `setContent(value, false)`, which emits no update. So opening a note does not rewrite it.

**Correction (stage 1):** the claim above was wrong for the component as it stood. `EditorRich` called `editor.setEditable(!!editable)` in an effect on mount, and TipTap 2.26 emits `update` from `setEditable` by default, so merely opening a note (or flipping read/edit) ran `onChange` and saved the re-serialized body. Fixed with `setEditable(editable, false)`, covered by `src/components/EditorRich.test.jsx`.

**The first keystroke in a note re-serializes the whole body.** Every unsupported construct anywhere in the file is mangled at that moment, not only the part being edited. There is no unescape step anywhere in `src/` (grepped), and the save path is `EditorPage.handleContentChange` straight into `local.content`.

### Re-run

```
OBS_PARITY_OUT=/some/dir/p.json npx vitest run scripts/obsidian-parity.test.js
```

Without `OBS_PARITY_OUT` the test returns immediately and always passes, so `npx vitest run` stays green. The JSON holds, per case, the input, output, node/mark kinds, and a second-pass output. There was no instability: no case changed on a second pass. Typing results are under `typing`. To change the cases, edit `CASES` / `TYPING` in the file.

## 1. Feature table

Legend:
- Parses: P = proper node/mark, text = left as plain or escaped text, gone = deleted.
- Round-trips: = byte-identical. ~ rewritten but equivalent in Obsidian (degraded-safe). X = changed meaning or lost.
- Renders: yes, no, partial.
- Typing: whether live typing converts the syntax.
- Verdict: OK, degraded-safe, or DANGEROUS.

| Feature | Parses | Round-trips | Renders | Live typing | Verdict |
|---|---|---|---|---|---|
| Heading 1-4 | P | = | yes | yes (`# `, `## `, `### `, `#### `) | OK |
| Heading 5-6 | text (hashes stripped) | X `##### H5` becomes `H5` | no | no (stays literal, `\#`-escaped on save) | DANGEROUS |
| Setext heading (`===`, `---`) | P | ~ becomes ATX `#` / `##` | yes | n/a | degraded-safe |
| Heading with trailing `##` | P | ~ closing hashes dropped | yes | n/a | degraded-safe |
| Bold `**x**` | P | = | yes | yes | OK |
| Bold `__x__` | P | ~ becomes `**x**` | yes | yes (saved as `**`) | degraded-safe |
| Italic `*x*` | P | = | yes | yes | OK |
| Italic `_x_` | P | ~ becomes `*x*` | yes | yes | degraded-safe |
| Bold+italic `***x***` | P | = | yes | no (stays literal, escaped on save) | OK (typing gap) |
| Strikethrough `~~x~~` | P | = | yes | yes | OK |
| Highlight `==x==` | P | = (`==**x**==` becomes `**==x==**`, same meaning) | yes | yes | OK |
| Inline code | P | = | yes | yes | OK |
| Fenced code with language | P | = | yes (no syntax colouring) | yes (```` ```js ```` + space) | OK |
| `~~~` fence | P | ~ becomes ```` ``` ```` | yes | n/a | degraded-safe |
| Indented code | P | ~ becomes a fence | yes | n/a | degraded-safe |
| Blockquote | P | = | yes | yes | OK |
| Nested blockquote `>> b` | P | ~ merges lines (`> a\n>\n> > b c`) | partial | n/a | degraded-safe |
| Callout `> [!note] Title` (all 13 types, `-` / `+` fold, no title) | text inside a plain blockquote | X `> \[!note\] Title body` (marker escaped, title and body joined into one line) | no | no | DANGEROUS |
| Callout nested or with a list | text | X same, plus `[!tip]` inside is escaped and lines merge | no | no | DANGEROUS |
| Bullet `-` | P | = | yes | yes | OK |
| Bullet `*` / `+` | P | ~ becomes `-` | yes | yes (saved as `-`) | degraded-safe |
| Ordered list | P | = (start number kept) | yes | yes | OK |
| Ordered `1)` | P | ~ becomes `1.` | yes | n/a | degraded-safe |
| Ordered `1. 1. 1.` | P | ~ renumbered `1. 2. 3.` | yes | n/a | degraded-safe |
| Nested lists | P | = | yes | via Tab | OK |
| Tabs in list indent | P | ~ becomes 2 spaces | yes | n/a | degraded-safe |
| Loose list / list item continuation paragraph | P | = (fenced code in an item gains a blank line after) | yes | n/a | OK |
| Task `- [ ]` / `- [x]` | P | ~ blank lines inserted between items (`tightLists` does not apply to task lists) | yes | yes, but typing `- [x] ` or `[x] ` gives an UNCHECKED item (harness result, not confirmed in a real window) | degraded-safe |
| Task custom status `[/]` `[-]` `[>]` | text, bullet list | X `\[/\]`, and `[>]` becomes `[&gt;]` (HTML entity) | no | no | DANGEROUS |
| Task in an ordered list (`1. [ ] a`) | list restructured | X becomes `1. ` (empty) + separate task list | partial | no | DANGEROUS |
| HR `---` | P | = | yes | yes | OK |
| HR `***` / `___` | P | ~ becomes `---` | yes | no (typed `***` / `___` stay as text) | degraded-safe |
| HR inside a list item | P | = | yes | n/a | OK |
| Table (any: aligned, inline formatting, escaped pipe, `<br>`) | text; schema has no table | X flattened to run-together text: `ab12` | no | no | DANGEROUS |
| Link `[t](url)` | P | = | yes | no (only bare URL autolink) | OK |
| Link with `"title"` | P | X title dropped | yes | n/a | degraded-safe |
| Link `<My Note.md>` | P | ~ becomes `My%20Note.md` (Obsidian resolves it) | yes | n/a | degraded-safe |
| Autolink `<https://x>` | P | = | yes | n/a | OK |
| Bare URL | P (linkify) | ~ becomes `<https://x>` | yes | yes | degraded-safe |
| Reference link `[t][ref]` + `[ref]: url` | P | ~ definition inlined, line removed | yes | n/a | degraded-safe |
| Image `![alt](url)` (also `\|300`, `\|300x200`, in lists, wrapped in a link) | gone (no image node in schema) | X **deleted**: output is `` or `- ` | no | no | DANGEROUS |
| Wikilink `[[Note]]` and `[[Note\|alias]]`, `[[Note#H]]`, `[[Note#^id]]`, `[[#H]]` | text (decorated by CSS class and click handler) | X `\[\[Note\]\]` (escaped, no longer a link in Obsidian) | partial (styled and clickable inside MAIA only) | no (nothing to convert, no autocomplete) | DANGEROUS |
| Embed `![[Note]]`, `![[img.png]]`, `![[img.png\|300]]`, `![[f.pdf#page=3]]` | text | X `!\[\[Note\]\]` | no | no | DANGEROUS |
| Block id `^id` at end of paragraph, list item, or own line | text | = | yes (visible as plain text) | n/a | OK |
| Tags `#tag`, `#nested/tag` | text (regex-detected for metadata) | = | partial (no styling) | n/a | OK |
| Footnote ref `[^1]` + definition | text | X `\[^1\]` and `\[^1\]: The note.` | no | no | DANGEROUS |
| Named footnote `[^note]` + definition | `[^note]` parsed as a link by markdown-it | X `Text[^note](Named.)` (definition eaten, converted into a link target) | no | no | DANGEROUS |
| Inline footnote `^[text]` | text | X `^\[text\]` | no | no | DANGEROUS (marker escaped) |
| Comment `%%x%%` inline | text | = if plain; if it contains `[[ ]]` the brackets are escaped | partial (shown as text) | n/a | degraded-safe |
| Comment `%%` block, multi-line | text | X `%%\nhidden\nmulti\n%%` becomes `%% hidden multi %%`; a list inside is split by a blank line | partial | n/a | degraded-safe (content survives, structure changes) |
| Math inline `$x$` without backslashes | text | = | no | n/a | OK |
| Math inline with LaTeX (`$\pi$`, `$\frac{a}{b}$`) | text | X every `\` is doubled: `\\pi`, `\\frac` | no | n/a | DANGEROUS |
| Math block `$$...$$` multi-line | text | X newlines collapsed to spaces and backslashes doubled (`\\begin{aligned}`, `\\\\` stays) | no | n/a | DANGEROUS |
| Mermaid / dataview / any language code block | P codeBlock | = | mermaid renders as a diagram (see below); the rest is code | yes | OK |
| HTML inline `<kbd> <br> <sub> <sup> <u> <mark>` | text (`html:false`) | X `&lt;kbd&gt;Ctrl&lt;/kbd&gt;` | no (shown as text) | no | DANGEROUS |
| HTML block (`<div>`, `<details>`, `<img>`) | text | X entity-escaped, newlines collapsed | no | no | DANGEROUS |
| HTML comment `<!-- c -->` | text | X `&lt;!-- c --&gt;` | no | no | DANGEROUS |
| Angle-bracket text `use <name> here` | text | X `&lt;name&gt;` | text | n/a | DANGEROUS |
| Hard break (two trailing spaces) | P hardBreak | ~ becomes `\` + newline | yes | Shift-Enter | degraded-safe |
| Hard break (backslash) | P | = | yes | Shift-Enter | OK |
| Soft line break (single newline in a paragraph) | P (joined) | X `line one\nline two` becomes `line one line two` | partial | n/a | DANGEROUS (Obsidian shows soft breaks as line breaks by default, so the layout changes) |
| Escaped chars `\* \# \[ \_ \`` | P (text) | ~ mostly kept; `\#` mid-line becomes `#` | yes | n/a | degraded-safe |
| Literal `*`, `[ ]`, `array[0]` | text | ~ escaped (`2 \* 3`, `array\[0\]`) | yes | n/a | degraded-safe (extra backslashes, same rendering) |
| `__init__`, snake_case | `__init__` becomes bold | ~ `**init**` (Obsidian also bolds it) | yes | n/a | degraded-safe |
| `~x~` subscript, `++u++`, `^x^` | text | `~x~` becomes `\~x\~`; the others are kept | no | n/a | degraded-safe |
| YAML frontmatter | stripped by `markdownToNote`, never reaches the editor (confirmed: body only goes in) | = for the body | n/a | n/a | OK |
| Frontmatter that `markdownToNote` does not match (not at byte 0: leading BOM or blank line; by inspection of the `^---` regex, not run) | would reach the editor as hr + paragraph + list | X flattened (`title: T tags: \[a\] aliases:`) | no | n/a | DANGEROUS (edge case, not run) |
| Definition-style lines `Term\n: Def` | text | X lines joined `Term : Definition` | no | n/a | degraded-safe (Obsidian has no definition lists) |
| Unicode, emoji, ZWJ sequences, long lines, NBSP | text | = | yes | n/a | OK |
| Multiple blank lines, trailing spaces | P | ~ collapsed | yes | n/a | degraded-safe |
| Windows CRLF | P | ~ output is LF only; soft breaks joined (see above) | yes | n/a | DANGEROUS only through the soft-break join |
| Empty or whitespace-only doc | P | = (whitespace becomes empty) | yes | n/a | OK |

Counts are approximate: roughly 20 rows DANGEROUS, 25 degraded-safe, the rest OK.

### After stage 1

Measured with the same harness, now built from `src/editor/extensions.js` (the list the app runs). Run on the 159 inputs of `CASES` (including CRLF and the frontmatter body): 102 come back byte-identical, 57 are rewritten, 21 are routed to source mode by the guard (`checkRoundTrip` in `src/editor/roundTripSafe.js`). The 36 rewritten and not routed are the harmless rewrites listed in the table above (bullet marker, `__x__`, `***`, `1)`, setext, bare URL, link titles, blank lines, tabs, hard break spaces, `~~~`, indented code, literal `*` and `[`).

| Feature | Before | After stage 1 | Where |
|---|---|---|---|
| Wikilinks `[[Note]]`, `\|alias`, `#Heading`, `#^id`, `[[#H]]` | X escaped | = (inline atom, click opens the note by target) | `wikiLink.js` |
| Embeds `![[f.png\|300]]`, `![[f.pdf#page=3]]`, `![[Note]]` | X escaped | = (placeholder chip on the web; on desktop resolved against the vault, see the rendering table below) | `wikiLink.js` |
| Images `![alt](url)`, `\|300`, `\|300x200`, in lists, in links, with title | X deleted | = (img for http, data, blob; chip otherwise) | `image.js` |
| Inline HTML (`<kbd> <br> <sub> <sup> <u> <mark> <name>`), HTML comments | X entity-escaped | = (raw atom) | `htmlRaw.js` |
| HTML blocks (`<div>`, `<details>`, `<img>`) | X escaped, collapsed | = (raw block atom) | `htmlRaw.js` |
| Plain `a < b`, `>` | X `&lt;` | = | `plainText.js` |
| Comments `%%x%%` inline and block, with lists or wikilinks inside | ~ / X | = (line structure kept) | `obsidianComment.js` |
| Footnotes `[^1]`, `[^name]`, definitions (multi-line), `^[inline]` | X escaped or eaten | = | `footnotes.js` |
| Math `$..$`, `$$..$$` with backslashes | X `\\` doubled, collapsed | = (rendered with KaTeX, see below) | `math.js` |
| Soft line break | X joined with a space | = | `softBreak.js` |
| Heading 5-6 | X hashes stripped | = | `extensions.js` (levels 1-6) |
| Frontmatter after a BOM or blank line | X leaked into the body | read as frontmatter | `src/lib/noteFile.js` |
| Block ids `^id`, tags, mermaid/dataview code | = | = | unchanged |
| Tables | X flattened | stage 2: = (see "After stage 2") | `table*.js` |
| Callouts (all types, folds, nested) | X | stage 2: = | `callout*.js` |
| Task custom status `[/] [>] [-]`, task inside a numbered list | X | stage 2: = | `taskStatus.js` |
| Reference links `[t][ref]` + `[ref]: url` | ~ inlined | stage 2: = (raw atoms) | `refLinks.js` |
| HTML entities (`&amp;`, `&copy;`) | ~ decoded | stage 2: = (atom shown as the character) | `entities.js` |

### After stage 2: tables, callouts, task statuses

Same harness and the same 159 `CASES`, built from `src/editor/extensions.js`: **123 come back byte-identical (was 102), 36 are rewritten (was 57), 1 is routed to source mode (was 21)**. The one left is `[[Note|![[x.png]]]]` (a wikilink inside an alias), which is not part of this stage. `DANGEROUS_PATTERNS` is now empty; the content fingerprint in `roundTripSafe.js` still catches anything that would change on save. All 36 rewrites are the harmless ones from the stage 1 list, plus `a | b` / `- | -` (below). Every claim in this section is a test in `src/editor/{table,callout,taskStatus,refLinks,entities,inlineShortcuts}.test.js`.

| Feature | Round trip | Normalization (the only rewrites) | Live typing | Where |
|---|---|---|---|---|
| Tables | Byte-identical while the table is untouched, whatever the padding, `\|a\|b\|` shorthand or pipe layout: the source lines are kept on the node and written back as long as the table still means what they say (compared through the canonical form). | After an edit, and for tables nested in quotes, lists or callouts: `\| a \| b \|`, `\| --- \| :---: \| ---: \|`, one space around cells, `\|` for every literal pipe, `<br>` for a line break in a cell. Ragged rows are padded with empty cells. Undoing back to the source text writes the source text again. | A line of `\| a \| b \|`, then `\|---\|:-:\|`, then Enter makes the table (Obsidian). `---` as the first characters still becomes a rule at once, so type the outer pipes. | `table.js`, `tableMarkdown.js`, `tableCommands.js`, `tableMenu.js` |
| Callouts: 13 types and their aliases, unknown types, `-` / `+` fold marks, optional title, nested, lists, code and tables inside | Byte-identical for `> [!type]± title` with `> ` body lines (type text and case kept as written). | Lazy continuation lines get their `> `; extra spaces after the marker and trailing spaces in the title are dropped. | `> [!note] ` converts the quote and puts the cursor in the title. Enter in the title goes to the body; Backspace in an empty title turns it back into a quote. | `callout.js`, `calloutView.js`, `calloutTypes.js` |
| Task statuses `[ ] [x] [X] [/] [-] [>] [?]`, any single character | Byte-identical, including `[X]` and `1. [ ] a`. Tight lists stay tight (no blank line between items), loose lists stay loose. Plain bullets inside a task list stay plain. | Ordered task lists are renumbered from their first number; `*` / `+` bullets become `-`. | `- [x] ` now gives a checked task (the unchecked bug was a stale `editor.state` read in `autoMarkdownShortcuts.js`). `- [/] ` gives a task with that status. | `taskStatus.js` |
| Reference links `[t][id]`, `[t][]`, `[id]`, images `![a][id]`, single-line definitions with `<url>` and titles | Byte-identical (raw atoms; a link shows as a chip with the source text). | none | none | `refLinks.js` |
| Multi-line reference definitions | Not handled: the url is inlined by markdown-it, so the content fingerprint routes the note to source mode. | n/a | n/a | `roundTripSafe.js` |
| Entities `&amp; &copy; &nbsp; &#169; &#xA9;` | Byte-identical (inline atom shown as the character). Text that only looks like one (`&notanentity;`, `AT&T`) stays text. | none | Typing a real entity and `;` turns it into the atom. | `entities.js` |
| `***bold italic***` | Already byte-identical; now also typed live. | none | `***x***` | `inlineShortcuts.js` |
| `***` / `___` rule | n/a | n/a | `***` or `___` then Enter, or then a space (stock rule). `---` is immediate. | `inlineShortcuts.js` |

Behaviour that is not about the file:

- **Table editing.** Cells hold one paragraph (no lists, headings or code in a cell, as markdown allows). Tab / Shift-Tab move between cells, Tab in the last cell adds a row, Enter moves one row down in the same column and adds a row at the end. A tool bar floats above the table while the cursor is inside it: row above / below / delete, column left / right / delete, alignment left / center / right (clicking the active one clears it), delete table. Keyboard: Cmd+Alt+Arrow adds a row or column, Cmd+Alt+Backspace deletes the row, Cmd+Alt+Shift+Backspace the column. The header row cannot be removed and gets no row above. The tool bar buttons are 28px high, 44px on touch (`pointer: coarse`).
- **Callout folding** is view state: clicking the chevron changes nothing in the document or in undo history, and a note opens with `-` callouts folded and `+` / plain ones open. The fold mark itself cannot be changed in rich view (edit it in source). Moving the cursor into a folded callout opens it.
- **Callout colours** use four Arc hues, so types share them: note grey; abstract, info, todo accent; example strong accent; tip, success green; question, warning amber; failure, danger, bug red; quote muted. Icons are Lucide, one per canonical type.
- **Task display.** Checked only for `x` / `X`. `-` strikes the text and mutes it; `/` shows a slash in the accent colour; any other character is drawn inside the box. Clicking a custom status ticks it (writes `x`); unticking writes a space.

Known limits and deviations:

- `a | b` followed by `- | -` is a list in markdown-it (a list item may interrupt a paragraph), not a table, so it is rewritten as a list. `--- | ---` is a table. Whether Obsidian reads the `-` form as a table was not checked.
- A cell cannot hold two lines except through `<br>` (Shift-Enter in a cell writes it).
- Table alignment of a column is read from the header row when writing.
- Reference links and definitions show as raw chips rather than links.
- Nothing here was run in a real window (no Tauri, no browser): the DOM tests run in jsdom, so the CSS (`EditorRich.module.css`, last block), the tool bar position, the fold animation and the `:has()` default-title rule are unverified visually.

### Rendering stage: math, mermaid, vault embeds

All of these draw the saved text without changing it: the stored markdown stays exactly what was typed (tests in `src/editor/mathRender.test.js`, `mermaid.test.js`, `embeds.test.js`, and the unchanged round-trip fixtures).

| Feature | Behaviour | Where |
|---|---|---|
| Math `$x$`, `$$x$$`, `$$` block | KaTeX, loaded on the first formula. Click or Enter edits the raw source in a monospace field; blur or Escape renders again. A formula KaTeX rejects shows its source with a danger underline and the message in the title. An edit that would no longer parse as the same node (a stray `$`, a blank line) is refused and the old source stays. `$5 and $10` and `\$a\$` are still not math | `math.js`, `mathView.js`, `katexLoader.js` |
| Mermaid ```` ```mermaid ```` | Diagram when the editor does not have the cursor in the block; source (plain code block) while it does. "Edit source" / "Show diagram" button. Theme follows `data-theme`, `securityLevel: strict`. Parse errors show the message and the source. Lazy chunk, loaded only when such a block exists | `mermaid.js` |
| `![[img.png]]`, `\|300`, `\|300x200`, `![alt\|300](rel/path.png)` (desktop only) | Image through the Tauri asset protocol. Bare name: searched in the whole vault, shortest path wins; folder paths: relative to the note, then from the vault root, then as a path tail. Missing: muted dashed chip with the target | `embeds.js`, `embedProvider.js`, `src/lib/vaultFiles.js` |
| `![[f.pdf]]`, `#page=3`, audio, video, other files | Card with kind, file name and page. Not opened or played: no opener plugin is installed | `embeds.js` |
| `![[Note]]`, `![[Note#Heading]]`, `![[Note#^id]]` | Read-only bordered card with the note (or the heading section / block) and an "Open note" button. Depth 1: an embed inside an embedded note stays a chip, so cycles cannot happen | `embeds.js`, `src/lib/noteSection.js` |
| `[[` and `![[` autocomplete | Popup under the caret (flips above when short of room) listing notes by title, folder muted underneath. Prefix and exact matches first, then recent notes; aliases from `aliases` frontmatter match and insert `[[Title\|Alias]]`. `[[Note#` lists that note's headings, `[[Note#^` its block ids, `[[#` the open note's headings; after `\|` nothing. `![[` adds vault images, PDFs, audio and video (desktop only). Inserts the `wikiLink` atom as `[[Target]]`, shortest unambiguous form (`Folder/Title` only when the title repeats), and eats an existing `]]`. Off in code, inline code, unclosed `%%` and `$`, read-only and during IME composition. No "Create note" row: the editor has no side-effect-free create path | `linkSuggest*.js` |

The vault file index lists names only (no contents), skips dot folders, `node_modules` and the root `Opus`, caps at 50000 files, is built on first use and dropped on every vault reload (and rebuilt at most every 10 s when a lookup misses).

A wikilink atom cannot be edited in place: delete it and type `[[` again. Not offered: block ids are only listed for blocks that already have one (Obsidian also writes new ones).

## 2. Top 10 dangerous round-trip failures

Outputs are copied from the harness run. Backslashes are literal.

1. **Wikilinks escaped.** This is the most common Obsidian construct.
   - In: `see [[Note|alias]] and [[Note#Heading]] ok`
   - Out: `see \[\[Note|alias\]\] and \[\[Note#Heading\]\] ok`
   - Effect: in Obsidian these are no longer links, so the graph and backlinks break. The MAIA UI still looks fine because `parseContentMeta` reads `editor.getText()`, not the saved markdown.
2. **Embeds escaped.**
   - In: `![[image.png|300]]` or `![[file.pdf#page=3]]`
   - Out: `!\[\[image.png|300\]\]` and `!\[\[file.pdf#page=3\]\]`
3. **Images deleted.** There is no Image extension.
   - In: `![alt](https://example.com/a.png)`
   - Out: `` (empty). In a list, `- ![a](u)` becomes `- `. `[![a](u)](https://x.com)` becomes `` as well.
4. **Tables flattened.**
   - In: `| a | b |\n| - | - |\n| 1 | 2 |`
   - Out: `ab12`
   - With alignment colons, inline formatting, or `<br>` in cells, the same loss happens.
5. **Callouts destroyed.**
   - In: `> [!tip]- Folded\n> body`
   - Out: `> \[!tip\]- Folded body`
   - Type, fold state, and the line structure are lost. Nested callouts and callouts with a list lose their structure too.
6. **LaTeX corrupted.**
   - In: `$\frac{a}{b}$`
   - Out: `$\\frac{a}{b}$`
   - In: `$$\n\begin{aligned}\na &= b \\\\\nc &= d\n\end{aligned}\n$$`
   - Out: `$$ \\begin{aligned} a &= b \\ c &= d \\end{aligned} $$`
   - Backslashes are doubled and the block collapses to one line. The result is stable on later saves, but the math no longer renders.
7. **HTML escaped into entities.**
   - In: `press <kbd>Ctrl</kbd> now`
   - Out: `press &lt;kbd&gt;Ctrl&lt;/kbd&gt; now`
   - Same for `<br>`, `<sub>`, `<sup>`, `<u>`, `<mark>`, `<details>`, `<div>`, `<img>`, `<!-- c -->`, and plain `<name>`.
8. **Footnotes broken.**
   - In: `Text[^1] here.\n\n[^1]: The note.`
   - Out: `Text\[^1\] here.\n\n\[^1\]: The note.`
   - In: `Text[^note] here.\n\n[^note]: Named.`
   - Out: `Text[^note](Named.) here.` The definition line is eaten and turned into a link target.
   - In: `^[inline note]` becomes `^\[inline note\]`.
9. **Soft line breaks joined (also hit by CRLF files).**
   - In: `line one\nline two`
   - Out: `line one line two`
   - Every multi-line paragraph is affected. Obsidian shows a single newline as a line break by default, so the note's layout changes.
10. **Heading 5-6 and custom task statuses.**
    - In: `##### H5` → Out: `H5`. The heading becomes a plain paragraph (StarterKit is configured with levels 1-4).
    - In: `- [/] partial\n- [>] deferred` → Out: `- \[/\] partial\n- \[&gt;\] deferred`. The `&gt;` entity is injected.
    - In: `1. [ ] a\n2. [x] b` → Out: `1. \n\n- [ ] a\n\n- [x] b`.

Also worth knowing:
- Wikilinks inside `%% %%` comments are escaped.
- Block comments that contain lists are split.
- `[ref]: url` definitions are inlined.

## Safety net

All the DANGEROUS items above are rewritten, not just unrendered, so "unknown syntax survives" does not hold in the current editor. The only unsupported constructs that survive intact are code blocks of any language, `^blockid`, `#tags`, plain `$..$` without backslashes, `%%` inline without brackets, and Unicode text.

## 3. Implementation plan

Two mechanisms cover almost everything:

- **Raw passthrough node.** A block or inline atom that stores the source text verbatim and serializes it with `state.write(source)` (no escaping). Cheap and lossless, and renderable later. Use it first for anything where the safe-but-ugly option is acceptable.
- **A dedicated node or mark with its own markdown-it rule and serializer.** Used where rendering is wanted.

tiptap-markdown extension points (v0.8):
- Parse: `addStorage() { return { markdown: { parse: { setup(md) { md.use(plugin) } } } } }`. markdown-it emits HTML, and ProseMirror then parses that HTML using each extension's `parseHTML`.
- Serialize: `markdown: { serialize(state, node) {...} }` for nodes, or `{ open, close, ... }` for marks.
- Because parsing goes through HTML, a custom markdown-it rule must emit HTML that the node's `parseHTML` recognizes, for example `<span data-wikilink="Note|alias">`.

Package weights below are rough gzipped sizes from memory, not measured here. Check with `npm view <pkg> dist.unpackedSize` before installing. Installing any package needs Dušan's yes (CLAUDE.md).

| Gap | TipTap / markdown-it approach | Packages | Parse rule | Serializer | Difficulty |
|---|---|---|---|---|---|
| Wikilinks `[[..]]` (aliases, `#heading`, `#^id`) | Custom inline atom node `wikiLink` (attrs: target, heading, alias). It replaces the current decoration and keeps the click handler. | none | Yes: inline markdown-it rule that matches `\[\[([^\]]+)\]\]` and emits `<span data-wikilink>` | Yes: `state.write("[[" + raw + "]]")` | S-M |
| Embeds `![[..]]` | Custom inline or block atom `embed` (attrs: target, size, subpath). Rendering can start as a labelled chip and later resolve images through the vault. | none | Yes: same rule, with a leading `!` | Yes | M (render images later: M) |
| Images | `@tiptap/extension-image` (~1 KB). It serializes `![alt](src "title")`. `alt|300` survives inside the alt text without extra work. | `@tiptap/extension-image` | No (markdown-it handles it) | No (tiptap-markdown ships an image serializer) | S. Local images need an asset URL resolver in Tauri (M). |
| Tables | `@tiptap/extension-table`, `-table-row`, `-table-header`, `-table-cell` (~10 KB total). tiptap-markdown serializes GFM tables when cells are simple and falls back to HTML otherwise. Alignment is not stored by default, so add an `align` attribute to header and cell. | the four table packages | markdown-it parses tables natively; alignment needs a small parseHTML tweak for `style="text-align"` | A custom serializer to emit `:--` / `:-:` / `--:` and to escape `\|` in cells | M |
| Callouts | Custom `callout` node (content: block+, attrs: type, title, fold), either a blockquote variant or a separate node. | optional `markdown-it-obsidian-callouts` or similar (verify it exists and is maintained); otherwise a ~40-line core rule | Yes: core rule that detects `[!type]±` in the first paragraph of a blockquote and emits `<div data-callout="type" data-fold="-">` | Yes: write `> [!type]± title` and prefix child blocks with `> ` | M |
| Footnotes | `markdown-it-footnote` is already installed (used by `lib/markdown.js`). Add an inline atom `footnoteRef` and a block `footnoteDef`. | none new | Yes, but it must emit parseable HTML | Yes | M-L (inline `^[..]` also needs handling) |
| Math | Raw passthrough first (S). To render, add KaTeX with a `math` inline node and a `mathBlock` node. | `katex` (~75 KB JS gz, plus CSS and fonts); `@tiptap/extension-mathematics` may exist for v2, verify before relying on it; or `markdown-it-texmath` | Yes: protect `$..$` / `$$..$$` before markdown-it so the backslashes are not eaten | Yes: write the source unescaped (this stops the `\\` doubling) | S (passthrough), M (rendered) |
| HTML inline and blocks | Raw passthrough inline and block nodes. `@tiptap/extension-underline`, `-subscript` and `-superscript` can cover `<u>`, `<sub>`, `<sup>`. Turning on `html:true` alone is not enough: unknown tags are dropped by the schema. | `@tiptap/extension-underline`, `-subscript`, `-superscript` (tiny) | Yes: markdown-it `html:true` plus passthrough nodes that keep the original tag text | Yes | M |
| Comments `%%..%%` | Raw passthrough inline or block node, optionally rendered dimmed. | none | Yes: rule that captures `%%` to `%%` across lines | Yes (verbatim) | S |
| Soft line breaks | Keep soft breaks as a node (or enable `breaks:true` in markdown-it plus a softbreak-aware node). | none | Yes: custom handling in markdown-it `softbreak` | Yes: emit a plain newline | M |
| Heading 5-6 | `StarterKit.configure({ heading: { levels: [1,2,3,4,5,6] } })` plus CSS. | none | No | No | S |
| Task custom status `[/]` `[>]` `[-]` | Extend `TaskItem` with a `status` char attribute; keep `checked` for `[ ]` / `[x]`. | none | Yes: markdown-it-task-lists only handles `[ ]` / `[x]`, so write a replacement rule | Yes: write the status char; also stop the loose-list blank lines | M |
| Tight task lists | Override the list serializer so task lists respect `tightLists`. | none | No | Yes | S |
| Mermaid rendering | Code block already round-trips. Render with a lazy `import('mermaid')`. | `mermaid` (heavy, load on demand) | No | No | M (optional) |
| Tags styling and autocomplete | Decorations like the current wikilink one; no schema change (the round trip is already `=`). | none | No | No | S |
| Typing shortcuts for the above | Input rules: `[[` autocomplete via `@tiptap/suggestion`; `> [!` for callouts; `$..$` for math. | `@tiptap/suggestion` (~3 KB) | n/a | n/a | M |
| Frontmatter not at byte 0 (BOM, leading blank line) | Make `markdownToNote` tolerate BOM and leading whitespace. This lives in `noteFile.js`, not the editor. | none | n/a | n/a | S |
| Frontmatter properties (Obsidian 'Properties' block) | Done outside the editor: `frontmatterProps.js` + `features/Codex/properties/`. Typed rows (text, number, checkbox, date, date and time, list, tags, aliases, cssclasses), each edit rewrites only that key's lines. Values it cannot represent (block scalars, maps, comments) stay read-only. Saves keep the file's own keys, order and quoting; no MAIA keys are added to foreign notes. | none | n/a | n/a | Done |

### Suggested order

1. **A load-time guard first (S, high value).** On load, compute `roundtrip(md)`. If it differs from the original in a way that is not in a small allow-list of harmless rewrites (`*`→`-`, `__`→`**`, `1)`→`1.`, blank-line collapsing), open the note read-only or in a source-only plain textarea, with a notice. This stops silent corruption today and does not depend on any extension work. The harness already provides the comparison logic.
2. Wikilinks, embeds, and images: the most common constructs, and they are the Obsidian graph and attachments.
3. Raw passthrough nodes for HTML, comments, math, and footnotes (cheap and lossless).
4. Callouts, tables, task statuses, soft breaks.
5. Rendering (KaTeX, mermaid) later.

Everything above fits tiptap-markdown 0.8 without forking it. The one rough edge is the HTML detour (markdown-it to HTML to ProseMirror), which makes block-level custom rules fiddly.

## 4. TipTap 2 vs TipTap 3

**Stay on TipTap 2 for this work.** Reasons:

- None of the gaps above are caused by TipTap 2. They come from the editor having no nodes for these constructs and from tiptap-markdown escaping unknown text. Fixing them means writing nodes and serializers, which is the same work on v2 or v3.
- Upgrading would add its own migration cost on top (StarterKit and Link changes, import and API renames, tiptap-markdown compatibility). I have not verified the v3 details here (no v3 packages installed), so treat this as a judgment, not a measurement.
- tiptap-markdown 0.8.x is built for v2. If it does not support v3, you cannot do the two changes in one step. TipTap 3 has its own official markdown extension (per-extension tokenizer, parse, and render hooks), which would suit inline syntax like wikilinks better than the HTML detour. That is the one real argument for moving. Check its actual round-trip behaviour and its status before committing; I did not.

Suggested sequence: ship the load-time guard and the raw/wikilink/image/table fixes on v2 now, because they stop data loss. Re-evaluate v3 as a separate pass once the node set exists, when moving the already-written nodes' serializers to the official extension is a mechanical port. If the v3 markdown extension turns out to preserve unknown syntax natively, the guard and passthrough nodes could shrink then.

## Verification

- `npx vitest run`: 79 files, 850 tests passed, including the harness (which is a no-op without `OBS_PARITY_OUT`).
- `npx eslint src/`: 0 errors, 5 warnings, all existing (e.g. `react-hooks/exhaustive-deps`).
- Files added: `docs/obsidian-parity.md`, `scripts/obsidian-parity.test.js`. No existing source file was modified.

## Real vault fidelity

Harness: `scripts/vault-fidelity.test.js` (read-only, no-op unless `VAULT_FIDELITY_DIR` is set; classifier in `scripts/fidelityDiff.js`). Run with `VAULT_FIDELITY_DIR=<vault> VAULT_FIDELITY_OUT=<file outside the repo> NODE_OPTIONS=--max-old-space-size=8192 npx vitest run --pool=threads scripts/vault-fidelity.test.js`. 257 notes (dot folders, `node_modules`, root `Opus` skipped), measured on the body `markdownToNote` hands the editor. No note text is recorded here, only counts.

### What changed

Before, the first keystroke re-serialized the whole body in the editor's own style. Now (`src/editor/sourceFormat*.js`): every top-level block, and every list item, remembers its exact source lines and the blank lines before it; a block that is still the node the note was opened with (or equal to it) is written back verbatim; the note's leading/trailing blank lines (so the final newline) and CRLF are kept. Blocks that were edited are written in the editor's style, but remember the list bullet / ordered delimiter, rule style (`***`), fence style (`~~~`), `_`/`__` emphasis, bare-URL form and two-space hard breaks, and no longer escape a lone `~`, a `-` that starts a word, or `*`/`_` surrounded by spaces. Tricky invariants: a remembered text is used only when the editor's own serialization of the node equals that of the node it was read as; a zero blank-line gap is only used between blocks that are both original and still neighbours (or where the types make it safe); `_` emphasis falls back to `*` when a word character would touch it.

### Numbers (before / after)

| Measure | Before | After |
|---|---|---|
| Untouched note saves byte-identical | 52 of 257 (20.2%) | 256 of 257 (99.6%) |
| Edit one middle paragraph/heading: nothing else changes | not measured | 239 of 245 (97.6%), 12 other lines changed in total |
| Edit one middle list item: nothing else changes | not measured | 170 of 178 (95.5%), 40 other lines changed in total |
| Idempotence (save of the saved text equals it) | 12 notes violated | 1 note violated |

Changed hunks per class for the untouched round trip, before: EOF newline 133 (133 notes), blank-line count 1116 (107), escapes 409 (62), trailing whitespace 140 (41), heading style 66 (15), emphasis marker 119 (15), link/URL form 113 (19), indentation 94 (17), table formatting 17 (8), rule 7 (5), ordered marker 1, fence style 1, other 618 (63). After: other 1 (1 note), everything else 0.

The editor's own formatting (original text switched off, what an edited block gets) now: identical 55 of 257; hunks EOF newline 133, blank-line count 1200, escapes 346, trailing whitespace 163, heading style 66, indentation 115, link/URL form 33, emphasis marker 5, table formatting 6, other 443 (those are mostly blank lines around lists and headings in the editor's style, which an edit does not touch).

### Not preserved / limits

- The one violating note has an empty bullet holding a nested bullet (`- - x`): TipTap lifts the nested list out of its item, so the parse itself duplicates content. The load-time guard (`roundTripSafe.js`, which serializes in plain mode, original text off) already sends it to source mode. Idempotence there is a parse problem, not formatting.
- An edited block is reformatted inside itself: setext headings become ATX, trailing single spaces before a soft break are dropped, `[`/`]` are still escaped, list items whose lines are not consistently indented lose their original indentation, `*` text inside words stays escaped.
- A tab-indented item or an item with lazy continuation is kept verbatim only at the left margin, not when moved deeper.
- Same text that reads differently in two places is never reused verbatim (falls back to editor style).
- Not verified in a real window; tests run in jsdom.
