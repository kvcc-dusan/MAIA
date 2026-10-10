// @vitest-environment jsdom
// Obsidian parity audit harness for EditorRich (see docs/obsidian-parity.md).
// Always passes. It only does work when OBS_PARITY_OUT is set:
//   OBS_PARITY_OUT=/tmp/parity.json npx vitest run scripts/obsidian-parity.test.js
// The extension list below is a COPY of EditorRich.jsx's list (the component is not
// reusable headlessly: extensions are built inside the component). Keep in sync.
import { it } from 'vitest';
import fs from 'node:fs';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import markdownItMark from 'markdown-it-mark';
import { markdownToNote } from '../src/lib/noteFile.js';

const MarkdownHighlight = Highlight.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '==', close: '==', expelEnclosingWhitespace: true },
        parse: { setup(mdi) { mdi.use(markdownItMark); } },
      },
    };
  },
});

// Copy of AutoMarkdownShortcuts (Space handler) from EditorRich.jsx
const AutoMarkdownShortcuts = Extension.create({
  name: 'autoMarkdownShortcuts',
  addKeyboardShortcuts() {
    return {
      Space: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent?.type?.name !== 'paragraph') return false;
        const beforeText = $from.parent.textBetween(0, $from.parentOffset);
        const head = beforeText.replace(/\s+$/, '').trim();
        const strip = ({ tr }) => { const pos = $from.start(); tr.delete(pos, pos + beforeText.length); return true; };
        if (head === '-' || head === '*' || head === '+') return editor.chain().command(strip).toggleBulletList().run();
        if (/^\d+\.$/.test(head)) return editor.chain().command(strip).toggleOrderedList().run();
        if (/^\[(?:\s|x|X)\]$/.test(head)) {
          const checked = /\[([xX])\]/.test(head);
          return editor.chain().command(strip).toggleTaskList().command(() => {
            const node = editor.state.selection.$from.parent;
            if (node?.type?.name === 'taskItem' && checked) editor.commands.updateAttributes('taskItem', { checked: true });
            return true;
          }).run();
        }
        return false;
      },
    };
  },
});

const makeEditor = (content = '') => new Editor({
  element: document.createElement('div'),
  content,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, horizontalRule: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    MarkdownHighlight,
    Link.configure({ autolink: true, openOnClick: false, linkOnPaste: true }),
    HorizontalRule,
    Markdown.configure({ html: false, tightLists: true, bulletListMarker: '-', linkify: true, breaks: false, transformPastedText: true, transformCopiedText: true }),
    AutoMarkdownShortcuts,
  ],
});

const kinds = (json, set = new Set()) => {
  if (json.type && json.type !== 'doc') set.add(json.type);
  (json.marks || []).forEach((m) => set.add(`mark:${m.type}`));
  (json.content || []).forEach((c) => kinds(c, set));
  return set;
};

export const CASES = {
  'h1': '# H1', 'h2': '## H2', 'h3': '### H3', 'h4': '#### H4', 'h5': '##### H5', 'h6': '###### H6',
  'bold **': 'a **bold** b', 'bold __': 'a __bold__ b', 'italic *': 'a *it* b', 'italic _': 'a _it_ b',
  'bold-italic ***': 'a ***bi*** b', 'strike': 'a ~~gone~~ b', 'highlight': 'a ==hl== b', 'inline code': 'a `code` b',
  'fenced code lang': '```js\nconst a = 1;\n```', 'fenced code nolang': '```\nplain\n```', 'indented code': 'para\n\n    indented code\n',
  'blockquote': '> quote', 'nested blockquote': '> a\n>> b\n> > c',
  'callout note': '> [!note] Title\n> body', 'callout foldable -': '> [!tip]- Folded\n> body', 'callout foldable +': '> [!tip]+ Open\n> body',
  'callout no title': '> [!warning]\n> body',
  'callout multi types': ['abstract','info','todo','tip','success','question','warning','failure','danger','bug','example','quote'].map((t) => `> [!${t}] T\n> b`).join('\n\n'),
  'bullet -': '- a\n- b', 'bullet *': '* a\n* b', 'bullet +': '+ a\n+ b', 'ordered': '1. a\n2. b', 'ordered start 3': '3. a\n4. b',
  'nested list': '- a\n  - b\n    - c\n- d', 'nested ordered in bullet': '- a\n  1. b\n  2. c',
  'task': '- [ ] todo\n- [x] done', 'task custom [/]': '- [/] partial\n- [-] cancelled\n- [>] deferred', 'task nested': '- [ ] a\n  - [x] b',
  'hr ---': 'a\n\n---\n\nb', 'hr ***': 'a\n\n***\n\nb', 'hr ___': 'a\n\n___\n\nb',
  'table basic': '| a | b |\n| - | - |\n| 1 | 2 |', 'table align': '| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |',
  'table inline fmt': '| a | b |\n| - | - |\n| **x** | `y` [[Z]] |', 'table escaped pipe': '| a | b |\n| - | - |\n| x \\| y | 2 |',
  'link': '[text](https://example.com)', 'link title': '[text](https://example.com "T")', 'link angle path': '[t](<My Note.md>)', 'autolink <>': '<https://example.com>', 'bare url': 'see https://example.com/a?b=1 ok',
  'image': '![alt](https://example.com/a.png)', 'image size |300': '![alt|300](https://example.com/a.png)', 'image size WxH': '![alt|300x200](https://example.com/a.png)',
  'wikilink': 'see [[Note]] ok', 'wikilink alias': 'see [[Note|alias]] ok', 'wikilink heading': 'see [[Note#Heading]] ok', 'wikilink block': 'see [[Note#^abc123]] ok', 'wikilink self heading': 'see [[#Heading]] ok',
  'wikilink underscores': 'see [[my_note_name]] and [[a_b|c_d]] ok', 'wikilink in list': '- [[Note]]\n- [[Other|x]]',
  'embed note': '![[Note]]', 'embed image': '![[image.png]]', 'embed image size': '![[image.png|300]]', 'embed pdf page': '![[file.pdf#page=3]]', 'embed heading': '![[Note#Heading]]',
  'block id': 'A paragraph. ^blockid', 'block id own line': '- item\n\n^listid', 'block id on list item': '- item ^abc',
  'tag': 'text #tag more', 'tag nested': 'text #nested/tag more', 'tag at line start': '#tag at start',
  'footnote ref+def': 'Text[^1] here.\n\n[^1]: The note.', 'footnote named': 'Text[^note] here.\n\n[^note]: Named.', 'inline footnote': 'Text^[inline note] here.',
  'comment inline': 'a %%hidden%% b', 'comment block': 'a\n\n%%\nhidden\nmulti\n%%\n\nb',
  'math inline': 'Euler $e^{i\\pi}+1=0$ ok', 'math inline underscores': 'x $a_1 + b_2$ y', 'math block': '$$\n\\int_0^1 x^2 dx\n$$', 'math block one-line': '$$ x_1^2 $$',
  'mermaid': '```mermaid\ngraph TD\n  A-->B\n```',
  'html kbd': 'press <kbd>Ctrl</kbd> now', 'html br': 'a<br>b', 'html sub/sup': 'H<sub>2</sub>O x<sup>2</sup>', 'html u': '<u>under</u>', 'html mark': '<mark>m</mark>',
  'html block': '<div class="x">\n  <p>hello</p>\n</div>', 'html comment': '<!-- c -->\n\ntext', 'html details': '<details>\n<summary>S</summary>\n\nbody\n\n</details>',
  'hard break 2 spaces': 'line one  \nline two', 'hard break backslash': 'line one\\\nline two', 'soft break': 'line one\nline two',
  'escaped chars': '\\*not italic\\* \\# not heading \\[not link\\] \\_x\\_ \\`c\\`', 'literal asterisks': '2 * 3 * 4', 'literal underscore snake': 'snake_case_name and __init__',
  'literal hash mid': 'issue #12 and C# lang', 'literal brackets': 'array[0] and [x] and [ ]',
  'frontmatter': '---\ntitle: T\ntags: [a]\naliases:\n  - x\ncssclasses: wide\n---\nBody **b**',
  'hr in list': '- a\n\n  ---\n\n- b', 'list continuation para': '- a\n\n  continued paragraph\n\n- b', 'list continuation code': '- a\n\n  ```js\n  x()\n  ```\n- b',
  'list loose': '- a\n\n- b\n\n- c', 'ordered list with ) ': '1) a\n2) b',
  'definition style': 'Term\n: Definition', 'definition bold': '**Term**\n: Def',
  'unicode emoji': 'Čšž ŠĐČĆŽ 日本語 العربية 🎉👨‍👩‍👧‍👦 é', 'long line': 'word '.repeat(400).trim(),
  'blank lines multiple': 'a\n\n\n\nb', 'trailing spaces para': 'a  \n\nb', 'tabs indent list': '- a\n\t- b',
  'heading with trailing #': '## H ##', 'setext heading': 'Title\n=====\n\nSub\n-----', 'heading with bold': '## **b** and `c`',
  'heading with id/block': '## Heading ^hid',
  'underline ++': 'a ++u++ b', 'superscript ^x^': 'a ^x^ b', 'subscript ~x~': 'a ~x~ b',
  'link ref def': '[ref]: https://example.com\n\n[text][ref]', 'ordered list non-1 mix': '1. a\n1. b\n1. c',
  'blockquote with list': '> - a\n> - b', 'blockquote with code': '> ```js\n> x\n> ```',
  'callout with list': '> [!info] T\n> - a\n> - b', 'callout nested': '> [!info] T\n> > [!tip] inner\n> > b',
  'dataview-ish': '```dataview\nLIST FROM #tag\n```', 'obsidian query inline': '`= this.file.name`',
  'tag in code': '`#notatag` and ```x``` end', 'wikilink in code': '`[[not a link]]`',
  'long table cell br': '| a | b |\n| - | - |\n| x<br>y | 2 |', 'table no leading pipe': 'a | b\n- | -\n1 | 2',
  'nbsp': 'a b', 'heading 5 literal': '##### five',
  'comment with markup': 'a %% see [[X]] and *y* %% b', 'comment with list': '%%\n- a\n- b\n%%', 'escaped hash line start': '\\# not heading', 'escaped plus line start': '\\- not list',
  'text starting with number dot': '2024\\. year', 'wikilink multi per line': '[[A]] and [[B|b]] and [[C#d]]', 'wikilink with star': '[[a*b]]', 'url underscores': 'https://x.com/a_b_c/d_e',
  'latex multi cmd': '$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$', 'inline latex frac': '$\\frac{a}{b}$', 'code block with tilde fence': '~~~\nx\n~~~',
  'code block with md inside': '```md\n# not heading\n[[not link]]\n- x\n```', 'indented code in list': '- a\n\n      code\n',
  'amp and lt': 'A & B < C > D &amp; E', 'html entity': '&copy; &nbsp;', 'angle placeholders': 'use <name> here', 'checkbox in ordered': '1. [ ] a\n2. [x] b',
  'image in list': '- ![a](https://x.com/a.png)\n- text', 'image with link': '[![a](https://x.com/a.png)](https://x.com)', 'img html': '<img src="a.png" width="100">',
  'callout in list': '- a\n  > [!note] x\n  > y', 'heading then callout': '# T\n\n> [!note] x\n> y\n\ntext', 'highlight+bold': '==**x**== and **==y==**', 'highlight across space': '== x ==',
  'tag trailing punctuation': '#tag, #tag2.', 'frontmatter-like hr pair': 'a\n\n---\ntitle: x\n---\n\nb', 'dollar amounts': 'costs $5 and $10 today',
  'image in wikilink alias': '[[Note|![[x.png]]]]', 'empty doc': '', 'only whitespace': '\n\n',
};

const CRLF_CASE = '# T\r\n\r\n- a\r\n- b\r\n\r\ntext\r\nmore\r\n';

const typeInto = (editor, text) => {
  const { view } = editor;
  for (const ch of text) {
    const sel = view.state.selection;
    if (ch === ' ') {
      const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
      if (view.someProp('handleKeyDown', (f) => f(view, ev))) continue;
    }
    const handled = view.someProp('handleTextInput', (f) => f(view, sel.from, sel.to, ch));
    if (!handled) view.dispatch(view.state.tr.insertText(ch, sel.from, sel.to));
  }
};

const TYPING = {
  'h1': '# x', 'h3': '### x', 'h4': '#### x', 'h5': '##### x', 'bold **': '**x** ', 'bold __': '__x__ ', 'italic *': '*x* ', 'italic _': '_x_ ',
  'bold-italic': '***x*** ', 'strike': '~~x~~ ', 'highlight': '==x== ', 'inline code': '`x` ', 'fenced code': '```js ', 'fenced code enter': '```',
  'blockquote': '> x', 'callout': '> [!note] x', 'bullet -': '- x', 'bullet *': '* x', 'bullet +': '+ x', 'ordered': '1. x', 'task [ ]': '[ ] x', 'task - [ ]': '- [ ] x', 'task - [x]': '- [x] x',
  'hr ---': '---', 'hr ***': '***', 'hr ___': '___', 'link': '[t](https://a.com) ', 'bare url': 'https://example.com ', 'wikilink': '[[Note]] ', 'tag': '#tag ',
  'math': '$x$ ', 'footnote': 'a[^1] ', 'table': '| a | b |',
};

it('obsidian parity harness (never fails; set OBS_PARITY_OUT to run)', () => {
  const out = process.env.OBS_PARITY_OUT;
  if (!out) return;
  const results = {};
  const run = (name, input) => {
    const editor = makeEditor(input);
    const json = editor.getJSON();
    const output = editor.storage.markdown.getMarkdown();
    const html = editor.getHTML();
    results[name] = { input, output, kinds: [...kinds(json)], identical: input === output, trimEq: input.trim() === output.trim(), html };
    editor.destroy();
  };
  Object.entries(CASES).forEach(([k, v]) => run(k, v));
  run('CRLF', CRLF_CASE);
  // frontmatter: what noteFile hands the editor
  const note = markdownToNote(CASES.frontmatter);
  run('frontmatter (body only, via noteFile)', note.content);
  // idempotence of the dangerous ones is visible by re-running output
  Object.entries(results).forEach(([k, r]) => {
    if (r.identical) return;
    const ed = makeEditor(r.output);
    r.second = ed.storage.markdown.getMarkdown();
    ed.destroy();
  });
  const typing = {};
  Object.entries(TYPING).forEach(([k, text]) => {
    const ed = makeEditor('');
    ed.commands.focus();
    typeInto(ed, text);
    if (k === 'fenced code enter') ed.commands.splitBlock();
    typing[k] = { typed: text, kinds: [...kinds(ed.getJSON())], md: ed.storage.markdown.getMarkdown() };
    ed.destroy();
  });
  fs.writeFileSync(out, JSON.stringify({ results, typing }, null, 1));
});
