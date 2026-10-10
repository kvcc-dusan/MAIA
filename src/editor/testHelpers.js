import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions.js';

/** Loads markdown into a headless editor built from the real extension list. */
export const makeEditor = (content = '', options) => new Editor({
  element: document.createElement('div'),
  content,
  extensions: createExtensions(options),
});

/** markdown in, markdown out, exactly as the app does on the first keystroke. */
export const roundTrip = (markdown) => {
  const editor = makeEditor(markdown);
  const out = editor.storage.markdown.getMarkdown();
  editor.destroy();
  return out;
};

export const nodeTypes = (markdown) => {
  const editor = makeEditor(markdown);
  const found = new Set();
  editor.state.doc.descendants((node) => { found.add(node.type.name); });
  editor.destroy();
  return found;
};

/** Types text the way the browser does: Space through keydown handlers, the rest as text input. */
export const typeInto = (editor, text) => {
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
