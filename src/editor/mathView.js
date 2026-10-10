import { loadKatex } from './katexLoader.js';

const DISPLAY_FENCE = '$$';

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * Node view for a math atom: KaTeX output at rest, a monospace field over the raw source while
 * editing. `parts(raw)` splits the stored text into delimiters and source (null = leave as text),
 * `isValid(raw)` says whether an edited text still parses back as the same single math node.
 * The stored `raw` only changes when the user commits an edit, so saving stays lossless.
 */
export const createMathView = ({ isBlock, parts, isValid }) => ({ node: initial, view, getPos }) => {
  const dom = element(isBlock ? 'div' : 'span', `maia-math${isBlock ? ' maia-math-block' : ''}`);
  let node = initial;
  let field = null;
  let renderId = 0;

  const showFailure = (raw, message) => {
    const failed = element('span', 'maia-raw maia-math-error', raw);
    failed.title = message;
    dom.replaceChildren(failed);
  };

  const paint = async () => {
    const id = ++renderId;
    const { raw } = node.attrs;
    const split = parts(raw);
    dom.title = '';
    if (!split) return showFailure(raw, 'Not valid math');
    dom.replaceChildren(element('span', 'maia-raw maia-math-pending', raw));
    try {
      const katex = await loadKatex();
      if (id !== renderId) return undefined;
      const target = element('span', 'maia-math-render');
      katex.render(split.source, target, {
        displayMode: split.open === DISPLAY_FENCE, throwOnError: true, strict: 'ignore', trust: false,
      });
      dom.replaceChildren(target);
    } catch (e) {
      if (id === renderId) showFailure(raw, e?.message || 'Could not render this formula');
    }
    return undefined;
  };

  const commit = (refocus) => {
    if (!field) return;
    const current = field;
    field = null;
    const split = parts(node.attrs.raw);
    const next = `${split.open}${current.value}${split.close}`;
    const pos = getPos();
    if (next !== node.attrs.raw && isValid(next) && typeof pos === 'number') {
      // update() repaints once the new node arrives
      view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, raw: next }));
    } else {
      paint();
    }
    if (refocus) view.focus();
  };

  const edit = () => {
    if (field || !view.editable || !parts(node.attrs.raw)) return;
    renderId += 1;
    field = element(isBlock ? 'textarea' : 'input', 'maia-raw maia-math-input');
    field.value = parts(node.attrs.raw).source;
    field.spellcheck = false;
    field.setAttribute('aria-label', 'Math source');
    if (isBlock) field.rows = Math.max(2, field.value.split('\n').length);
    else field.size = Math.max(4, field.value.length + 1);
    field.addEventListener('blur', () => commit(false));
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        commit(true);
      } else if (event.key === 'Enter' && (!isBlock || event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        commit(true);
      }
    });
    dom.replaceChildren(field);
    field.focus();
  };

  dom.addEventListener('click', edit);
  // Enter on a selected formula (see the keyboard shortcut in math.js) arrives here
  dom.addEventListener('maia-edit-math', edit);
  paint();

  return {
    dom,
    update: (next) => {
      if (next.type !== initial.type) return false;
      if (next.attrs.raw === node.attrs.raw) return true;
      node = next;
      if (!field) paint();
      return true;
    },
    stopEvent: (event) => field !== null && event.target === field,
    ignoreMutation: () => true,
    destroy: () => { renderId += 1; },
  };
};
