import { createRawNode, rawElement } from './rawNode.js';

const INLINE_ATTR = 'data-maia-html-inline';
const BLOCK_ATTR = 'data-maia-html-block';

// Needs Markdown.configure({ html: true }): markdown-it then recognises tags and html blocks,
// and these renderers turn them into raw atoms instead of live HTML.
// markdown-it-task-lists emits its checkbox as an html_inline token too; TaskItem needs that
// <input> as real HTML, so it passes through untouched.
const TASK_CHECKBOX = /^<input class="task-list-item-checkbox"/;

export const htmlPlugin = (md) => {
  md.renderer.rules.html_inline = (tokens, idx) => {
    const { content } = tokens[idx];
    return TASK_CHECKBOX.test(content) ? content : rawElement(md, 'span', INLINE_ATTR, content);
  };
  md.renderer.rules.html_block = (tokens, idx) =>
    rawElement(md, 'div', BLOCK_ATTR, tokens[idx].content.replace(/\n+$/, ''));
};

/** One tag of inline HTML (`<kbd>`, `</kbd>`, `<br>`, `<name>`, `<!-- c -->`) kept as typed. */
export const HtmlInline = createRawNode({
  name: 'htmlInline', dataAttr: INLINE_ATTR, isInline: true, plugin: htmlPlugin, kind: 'html',
});

/** A block of HTML (`<div>`, `<details>`, a comment line) kept as typed. */
export const HtmlBlock = createRawNode({
  name: 'htmlBlock', dataAttr: BLOCK_ATTR, isInline: false, plugin: htmlPlugin, kind: 'html-block',
});
