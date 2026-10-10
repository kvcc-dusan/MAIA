// The suggestion popup as plain DOM. It lives on document.body with position: fixed so neither the
// note body's overflow nor the table scroll container can clip it. Focus never leaves the editor:
// the editor points at the active option with aria-activedescendant.
import { createIcon } from './linkSuggestIcons.js';
import { parseQuery, emptyLabel } from './linkSuggestModel.js';

const GAP = 4;
const EDGE = 8;
const EDITOR_ARIA = ['role', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-activedescendant'];
let instances = 0;

const el = (tag, className, attrs = {}) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
};

export const createLinkPopup = ({ editor, onPick, onDismiss }) => {
  instances += 1;
  const id = `maia-link-suggest-${instances}`;
  const root = el('div', 'maia-link-suggest');
  const list = el('div', 'maia-link-suggest-list', { role: 'listbox', id: `${id}-list`, 'aria-label': 'Link suggestions' });
  const empty = el('div', 'maia-link-suggest-empty');
  const status = el('div', 'maia-link-suggest-status', { role: 'status' });
  root.hidden = true;
  root.append(list, empty, status);

  let items = [];
  let selected = 0;
  let clientRect = null;
  let isOpen = false;

  const optionId = (index) => `${id}-option-${index}`;

  const syncEditorAria = () => {
    const dom = editor.view.dom;
    if (!isOpen) {
      EDITOR_ARIA.forEach((name) => dom.removeAttribute(name));
      return;
    }
    dom.setAttribute('role', 'combobox');
    dom.setAttribute('aria-haspopup', 'listbox');
    dom.setAttribute('aria-expanded', 'true');
    dom.setAttribute('aria-controls', list.id);
    dom.setAttribute('aria-autocomplete', 'list');
    if (items.length > 0) dom.setAttribute('aria-activedescendant', optionId(selected));
    else dom.removeAttribute('aria-activedescendant');
  };

  const position = () => {
    const rect = clientRect?.();
    if (!rect) return;
    const { offsetWidth: width, offsetHeight: height } = root;
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight - EDGE;
    const top = fitsBelow || rect.top - GAP - height < EDGE ? rect.bottom + GAP : rect.top - GAP - height;
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE));
    root.style.top = `${Math.round(top)}px`;
    root.style.left = `${Math.round(left)}px`;
  };

  const markSelected = () => {
    list.childNodes.forEach((node, index) => {
      node.setAttribute('aria-selected', String(index === selected));
      if (index === selected) node.scrollIntoView?.({ block: 'nearest' });
    });
    syncEditorAria();
  };

  const buildOption = (item, index) => {
    const option = el('div', 'maia-link-suggest-option', { role: 'option', id: optionId(index), 'aria-selected': 'false' });
    const icon = el('span', 'maia-link-suggest-icon');
    icon.appendChild(createIcon(item.fileKind ?? item.kind));
    const text = el('span', 'maia-link-suggest-text');
    const label = el('span', 'maia-link-suggest-label');
    label.textContent = item.label;
    text.appendChild(label);
    const detail = [item.detail, item.subdetail].filter(Boolean).join(' · ');
    if (detail) {
      const muted = el('span', 'maia-link-suggest-detail');
      muted.textContent = detail;
      text.appendChild(muted);
    }
    option.append(icon, text);
    // mousedown, not click: a click would blur the editor before the pick runs
    option.addEventListener('mousedown', (event) => {
      event.preventDefault();
      onPick(item);
    });
    return option;
  };

  const render = (query) => {
    const parsed = parseQuery(query);
    list.replaceChildren(...items.map(buildOption));
    list.hidden = items.length === 0;
    empty.hidden = items.length > 0;
    empty.textContent = items.length > 0 ? '' : emptyLabel(parsed);
    status.textContent = items.length > 0
      ? `${items.length} ${items.length === 1 ? 'result' : 'results'}`
      : emptyLabel(parsed);
  };

  const reposition = () => position();
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    root.hidden = true;
    root.remove();
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    syncEditorAria();
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    document.body.appendChild(root);
    root.hidden = false;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  };

  return {
    id,
    root,
    update: ({ items: next, query, clientRect: rectFn }) => {
      // after a pipe the alias is free text: nothing to show
      if (parseQuery(query).stage === 'alias') {
        close();
        return;
      }
      items = next;
      selected = 0;
      clientRect = rectFn;
      open();
      render(query);
      markSelected();
      position();
    },
    close,
    isOpen: () => isOpen,
    handleKey: (event) => {
      if (!isOpen || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return false;
      const count = items.length;
      if (event.key === 'Escape') {
        onDismiss();
        close();
        return true;
      }
      if (count === 0) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        selected = (selected + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
        markSelected();
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        onPick(items[selected]);
        return true;
      }
      return false;
    },
  };
};
