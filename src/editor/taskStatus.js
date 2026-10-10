import { wrappingInputRule } from '@tiptap/core';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { installOnce } from './markdownIt.js';

const DONE_CHARS = 'xX';
const DEFAULT_STATUS = ' ';
// `[?]` plus the space that separates it from the text. Any single character is a status
// (Obsidian themes and the Tasks plugin define /, -, >, ?, !...); `]` and newlines are not.
const STATUS_MARK = /^\[([^\]\n])\](?:[ \t]+|$)/u;
const TYPED_STATUS = /^\s*(\[([ xX])?\])\s$/;

const isDone = (status) => DONE_CHARS.includes(status);

/**
 * The character written between the brackets. `checked` and `status` are two views of one
 * fact; commands only know `checked`, so it wins whenever the two disagree.
 */
export const statusChar = ({ checked, status }) => {
  if (checked) return isDone(status) ? status : 'x';
  return isDone(status) || status === DEFAULT_STATUS ? DEFAULT_STATUS : status;
};

const LIST_OPEN = new Set(['bullet_list_open', 'ordered_list_open']);
const LIST_CLOSE = new Set(['bullet_list_close', 'ordered_list_close']);

// Reads `[s] ` off the first text of a list item's first paragraph and tags the item.
const tagTaskItem = (tokens, index) => {
  const inline = tokens[index];
  const paragraph = tokens[index - 1];
  const item = tokens[index - 2];
  if (!paragraph || !item || paragraph.type !== 'paragraph_open' || item.type !== 'list_item_open') return false;
  if (paragraph.level !== item.level + 1) return false;
  const first = inline.children?.[0];
  if (first?.type !== 'text') return false;
  const match = STATUS_MARK.exec(first.content);
  if (!match) return false;

  const [marker, status] = match;
  first.content = first.content.slice(marker.length);
  if (!first.content) inline.children.shift();
  inline.content = inline.content.slice(marker.length);
  item.attrSet('data-type', 'taskItem');
  item.attrSet('data-checked', String(isDone(status)));
  item.attrSet('data-status', status);
  item.meta = { ...item.meta, isTask: true };
  return true;
};

// A list with at least one task becomes a task list. Its other items stay in it as plain
// items (no checkbox), which is what Obsidian shows for a mixed list.
const tagTaskList = ({ list, items }) => {
  if (!items.some((item) => item.meta?.isTask)) return;
  list.attrSet('data-type', 'taskList');
  if (list.type === 'ordered_list_open') {
    list.attrSet('data-ordered', 'true');
    list.attrSet('data-start', list.attrGet('start') ?? '1');
  }
  items.filter((item) => !item.meta?.isTask).forEach((item) => {
    item.attrSet('data-type', 'taskItem');
    item.attrSet('data-plain', 'true');
  });
};

// markdown-it hides the paragraph of a tight item. A list is tight when every item's own paragraph
// is hidden; tiptap-markdown's own guess ("no <p> anywhere inside") calls a tight list loose as soon
// as an item holds a quote or callout, which would insert blank lines on save.
const tagTightness = ({ list, ownParagraphsHidden }) => {
  if (ownParagraphsHidden) list.attrSet('data-tight', 'true');
};

export const taskStatusPlugin = (md) => {
  md.core.ruler.after('inline', 'maia_task_status', (state) => {
    const lists = [];
    const stack = [];
    state.tokens.forEach((token, index) => {
      const top = stack.at(-1);
      if (LIST_OPEN.has(token.type)) stack.push({ list: token, items: [], ownParagraphsHidden: true });
      else if (LIST_CLOSE.has(token.type)) lists.push(stack.pop());
      else if (token.type === 'list_item_open') top?.items.push(token);
      else if (token.type === 'paragraph_open' && top && token.level === top.list.level + 2) {
        top.ownParagraphsHidden = top.ownParagraphsHidden && token.hidden;
      } else if (token.type === 'inline') tagTaskItem(state.tokens, index);
    });
    lists.filter(Boolean).forEach((entry) => {
      tagTightness(entry);
      tagTaskList(entry);
    });
  });
};

/** `- [ ]`, `- [x]`, `- [/]`, `1. [ ]`: ordered lists keep their numbers, tight lists stay tight. */
export const TaskListWithStatus = TaskList.extend({
  addAttributes() {
    return {
      tight: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-tight') === 'true' || !el.querySelector('p'),
        renderHTML: (attrs) => ({ 'data-tight': attrs.tight ? 'true' : null }),
      },
      ordered: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-ordered') === 'true',
        renderHTML: (attrs) => (attrs.ordered ? { 'data-ordered': 'true' } : {}),
      },
      start: {
        default: 1,
        parseHTML: (el) => Number.parseInt(el.getAttribute('data-start') ?? '1', 10) || 1,
        // Read as a counter start by CSS, so the shown numbers match what is saved
        renderHTML: (attrs) => (attrs.ordered ? { 'data-start': String(attrs.start), style: `--task-start: ${attrs.start - 1}` } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'ul[data-type="taskList"]', priority: 51 },
      { tag: 'ol[data-type="taskList"]', priority: 51 },
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (!node.attrs.ordered) return state.renderList(node, '  ', () => '- ');
          const start = node.attrs.start || 1;
          const width = String(start + node.childCount - 1).length;
          return state.renderList(node, state.repeat(' ', width + 2), (i) => {
            const number = String(start + i);
            return `${state.repeat(' ', width - number.length)}${number}. `;
          });
        },
        parse: { setup: (md) => installOnce(md, 'taskStatus', taskStatusPlugin) },
      },
    };
  },
});

const readOnlyToggle = (event, editor, toggle) => {
  if (editor.isEditable) return toggle();
  // restore the box: the note is not editable, so nothing changed
  event.target.checked = !event.target.checked;
  return false;
};

const STATUS_LABELS = { '/': 'in progress', '-': 'cancelled', '>': 'deferred', '?': 'question', '!': 'important' };

/** A task item that remembers its status character. Rendering: checkbox, then a status glyph for custom ones. */
export const TaskItemWithStatus = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      status: {
        default: DEFAULT_STATUS,
        keepOnSplit: false,
        parseHTML: (el) => el.getAttribute('data-status') ?? DEFAULT_STATUS,
        renderHTML: (attrs) => (isDone(attrs.status) || attrs.status === DEFAULT_STATUS ? {} : { 'data-status': attrs.status }),
      },
      // A bullet inside a task list: no checkbox, nothing written before its text
      plain: {
        default: false,
        keepOnSplit: true,
        parseHTML: (el) => el.getAttribute('data-plain') === 'true',
        renderHTML: (attrs) => (attrs.plain ? { 'data-plain': 'true' } : {}),
      },
    };
  },

  addInputRules() {
    return [wrappingInputRule({
      find: TYPED_STATUS,
      type: this.type,
      getAttributes: (match) => {
        const char = match[2] ?? DEFAULT_STATUS;
        return { checked: isDone(char), status: char };
      },
    })];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const item = document.createElement('li');
      const label = document.createElement('label');
      const glyph = document.createElement('span');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      label.contentEditable = 'false';
      checkbox.type = 'checkbox';
      checkbox.addEventListener('mousedown', (event) => event.preventDefault());
      checkbox.addEventListener('change', (event) => readOnlyToggle(event, editor, () => {
        const { checked } = event.target;
        editor.chain().focus(undefined, { scrollIntoView: false }).command(({ tr }) => {
          const position = getPos();
          if (typeof position !== 'number') return false;
          const current = tr.doc.nodeAt(position);
          // a custom status is replaced: ticking it means done, unticking means open again
          tr.setNodeMarkup(position, undefined, { ...current?.attrs, checked, status: checked ? 'x' : DEFAULT_STATUS });
          return true;
        }).run();
        return true;
      }));

      const sync = (current) => {
        const { checked, status, plain } = current.attrs;
        const char = statusChar({ checked, status });
        const isCustom = !isDone(char) && char !== DEFAULT_STATUS;
        item.dataset.checked = String(checked);
        if (isCustom) item.dataset.status = char; else delete item.dataset.status;
        if (plain) item.dataset.plain = 'true'; else delete item.dataset.plain;
        checkbox.checked = checked;
        glyph.className = isCustom ? 'maia-task-glyph' : '';
        glyph.textContent = isCustom ? char : '';
        const kind = STATUS_LABELS[char] ?? (isCustom ? `status ${char}` : '');
        checkbox.ariaLabel = `Task item checkbox for ${current.textContent || 'empty task item'}${kind ? `, ${kind}` : ''}`;
        label.hidden = !!plain;
      };

      Object.entries(this.options.HTMLAttributes).forEach(([key, value]) => item.setAttribute(key, value));
      sync(node);
      label.append(checkbox, glyph);
      item.append(label, content);
      Object.entries(HTMLAttributes).forEach(([key, value]) => item.setAttribute(key, value));
      item.dataset.type = this.name;

      return {
        dom: item,
        contentDOM: content,
        update: (updated) => {
          if (updated.type !== this.type) return false;
          sync(updated);
          return true;
        },
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (!node.attrs.plain) state.write(`[${statusChar(node.attrs)}] `);
          state.renderContent(node);
        },
        parse: {},
      },
    };
  },
});
