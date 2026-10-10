import { Plugin, PluginKey } from '@tiptap/pm/state';
import { calloutKind, defaultCalloutTitle, createCalloutIcon, createFoldIcon } from './calloutTypes.js';

const COLLAPSED_FOLD = '-';

/**
 * Folding is view state, not document state: clicking the chevron must not dirty the note or
 * land in undo history. So it lives on the element and the document is never touched.
 */
export const setCalloutCollapsed = (dom, isCollapsed) => {
  dom.dataset.collapsed = String(isCollapsed);
  dom.querySelector('.maia-callout-fold')?.setAttribute('aria-expanded', String(!isCollapsed));
};

const createFoldButton = (dom) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maia-callout-fold';
  button.contentEditable = 'false';
  button.setAttribute('aria-label', 'Fold callout');
  button.append(createFoldIcon());
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => setCalloutCollapsed(dom, dom.dataset.collapsed !== 'true'));
  return button;
};

/** Vanilla node view: icon, optional fold chevron, and the callout's own content. */
export const createCalloutView = (initial) => {
  const dom = document.createElement('div');
  const icon = document.createElement('div');
  const content = document.createElement('div');
  dom.className = 'maia-callout';
  icon.className = 'maia-callout-icon';
  icon.contentEditable = 'false';
  content.className = 'maia-callout-content';
  dom.append(icon, content);

  let renderedType = null;
  const sync = ({ attrs }) => {
    const { type, fold } = attrs;
    dom.dataset.calloutKind = calloutKind(type);
    dom.dataset.callout = type;
    dom.dataset.fold = fold;
    // The title element is empty when no title was written; CSS shows this instead
    dom.style.setProperty('--callout-default-title', JSON.stringify(defaultCalloutTitle(type)));
    if (renderedType !== type) icon.replaceChildren(createCalloutIcon(type));
    renderedType = type;
    const existing = dom.querySelector('.maia-callout-fold');
    if (fold && !existing) dom.insertBefore(createFoldButton(dom), content);
    if (!fold && existing) existing.remove();
  };

  sync(initial);
  setCalloutCollapsed(dom, initial.attrs.fold === COLLAPSED_FOLD);

  return {
    dom,
    contentDOM: content,
    update: (updated) => {
      if (updated.type !== initial.type) return false;
      sync(updated);
      return true;
    },
    stopEvent: (event) => event.target instanceof Element && !!event.target.closest('.maia-callout-fold'),
    ignoreMutation: (mutation) => mutation.type !== 'selection' && !content.contains(mutation.target),
  };
};

/** Typing or arrowing into a folded callout opens it, so the caret is never in hidden text. */
export const calloutRevealPlugin = () => new Plugin({
  key: new PluginKey('maiaCalloutReveal'),
  view: () => ({
    update: (view, previous) => {
      const { selection } = view.state;
      if (previous.selection.eq(selection)) return;
      const { $head } = selection;
      for (let depth = $head.depth; depth > 0; depth -= 1) {
        const isBody = $head.node(depth).type.name === 'callout' && $head.index(depth) > 0;
        if (!isBody) continue;
        const dom = view.nodeDOM($head.before(depth));
        if (dom instanceof HTMLElement && dom.dataset.collapsed === 'true') setCalloutCollapsed(dom, false);
      }
    },
  }),
});
