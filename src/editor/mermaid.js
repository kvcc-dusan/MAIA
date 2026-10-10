import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { resolveTheme, subscribe } from '../lib/theme.js';

const LANGUAGE = 'mermaid';
const KEY = new PluginKey('maiaMermaid');

let loading = null;
let configuredTheme = null;
let counter = 0;

// Mermaid is large: it is fetched only when the first diagram is drawn.
const loadMermaid = () => {
  loading ??= import('mermaid').then((module) => module.default).catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
};

/** Draws `code` and returns the svg text. Throws mermaid's parse error for bad syntax. */
export const renderDiagram = async (code, theme = resolveTheme()) => {
  const mermaid = await loadMermaid();
  if (configuredTheme !== theme) {
    // strict: mermaid sanitizes the svg and ignores click handlers and html labels
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' });
    configuredTheme = theme;
  }
  counter += 1;
  const id = `maia-mermaid-${counter}`;
  try {
    return (await mermaid.render(id, code)).svg;
  } finally {
    // a failed render leaves its scratch element in <body>
    document.getElementById(`d${id}`)?.remove();
  }
};

export const isMermaidBlock = (node) =>
  node.type.name === 'codeBlock' && String(node.attrs.language ?? '').toLowerCase() === LANGUAGE;

const hash = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h;
};

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const preBlock = (code) => {
  const pre = element('pre', 'maia-mermaid-error-source');
  pre.append(element('code', '', code));
  return pre;
};

const fillDiagram = async (target, code, theme) => {
  if (code.trim() === '') {
    target.textContent = 'Empty diagram';
    target.className += ' maia-mermaid-empty';
    return;
  }
  try {
    const svg = await renderDiagram(code, theme);
    target.innerHTML = svg;
  } catch (e) {
    const error = element('span', 'maia-mermaid-error');
    error.append(element('span', 'maia-mermaid-error-message', e?.message || 'Could not draw this diagram'), preBlock(code));
    target.replaceChildren(error);
  }
};

const blockBefore = (view, end) => {
  const node = view.state.doc.resolve(end).nodeBefore;
  return { node, start: end - node.nodeSize };
};

const toolbarButton = (label, onClick) => {
  const button = element('button', 'maia-mermaid-toggle', label);
  button.type = 'button';
  button.addEventListener('mousedown', (event) => event.preventDefault()); // keep the editor selection
  button.addEventListener('click', onClick);
  return button;
};

// Rendered view: the code block is hidden and a diagram widget stands in. Source view (the
// cursor is inside the block): the block shows and the widget is only a way back.
const widget = (code, theme, isEditing, view, getPos) => {
  const box = element('div', 'maia-mermaid');
  box.contentEditable = 'false';
  if (!isEditing) {
    const diagram = element('div', 'maia-mermaid-diagram');
    diagram.addEventListener('click', () => {
      if (view.editable) showSource(view, getPos);
    });
    box.append(diagram);
    fillDiagram(diagram, code, theme);
  }
  if (view.editable) {
    box.append(isEditing
      ? toolbarButton('Show diagram', () => showDiagram(view, getPos))
      : toolbarButton('Edit source', () => showSource(view, getPos)));
  }
  return box;
};

const showSource = (view, getPos) => {
  const { start } = blockBefore(view, getPos());
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + 1)));
  view.focus();
};

// A node selection is outside the block's text, so the diagram comes back without
// adding a paragraph after it.
const showDiagram = (view, getPos) => {
  const { start } = blockBefore(view, getPos());
  view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, start)));
};

/**
 * Draws ```mermaid fences as diagrams. The block stays an ordinary code block (so the markdown
 * is untouched); this plugin only hides it behind a widget until the cursor enters it.
 */
export const MermaidDiagrams = Extension.create({
  name: 'mermaidDiagrams',

  addProseMirrorPlugins() {
    const { editor } = this;
    let themeVersion = 0;
    // A cursor that merely rests in a block (the document opens with it at the start) is not
    // editing: the source only shows while the editor has focus.
    let hasFocus = false;
    const setFocus = (value) => (view) => {
      hasFocus = value;
      view.dispatch(view.state.tr.setMeta(KEY, 'focus'));
      return false;
    };
    return [new Plugin({
      key: KEY,
      props: {
        handleDOMEvents: { focus: setFocus(true), blur: setFocus(false) },
        decorations: (state) => {
          const theme = resolveTheme();
          const { from } = state.selection;
          const decorations = [];
          state.doc.descendants((node, pos) => {
            if (!isMermaidBlock(node)) return node.isBlock && !node.isTextblock;
            const end = pos + node.nodeSize;
            const isEditing = hasFocus && from > pos && from < end;
            const code = node.textContent;
            if (!isEditing) decorations.push(Decoration.node(pos, end, { class: 'maia-mermaid-hidden' }));
            decorations.push(Decoration.widget(end, (view, getPos) => widget(code, theme, isEditing, view, getPos), {
              side: 1, key: `mermaid-${hash(code)}-${theme}-${themeVersion}-${isEditing}-${editor.isEditable}`,
              ignoreSelection: true, stopEvent: () => true,
            }));
            return false;
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
      view: (view) => {
        // a theme switch changes no document, so redraw by dispatching an empty transaction
        const unsubscribe = subscribe(() => {
          themeVersion += 1;
          view.dispatch(view.state.tr.setMeta(KEY, 'theme'));
        });
        return { destroy: unsubscribe };
      },
    })];
  },
});
