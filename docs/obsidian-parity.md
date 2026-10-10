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
| Mermaid / dataview / any language code block | P codeBlock | = | code only (no diagram) | yes | OK (renders as code) |
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
