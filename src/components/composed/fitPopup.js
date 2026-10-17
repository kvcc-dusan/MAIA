import { useEffect } from "react";

// Arc's date and time pickers draw their popup absolutely inside the field, with no portal. Inside a
// scrolling panel it then either gets clipped or makes the panel scroll to show it, which jolts the form.
// These place the popup so it fits the panel instead: open upward when there is more room above,
// and slide sideways when it is wider than the field and would run past the panel's edge.
export const POPUP_SELECTOR ='[role="dialog"][aria-label$=" calendar"], [role="listbox"][aria-label$=" options"]';
const GAP = 8; // the pickers' own offset from the field
const EDGE = 8; // breathing room against the panel edge

/** The nearest ancestor that clips or scrolls, i.e. the box the popup has to fit in. */
const clippingBox = (el) => {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (/(auto|scroll|hidden|clip)/.test(`${overflowX} ${overflowY}`)) return node.getBoundingClientRect();
  }
  return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
};

/** Repositions one open popup (layout sizes, so the entrance animation's scale does not skew it). */
export const fitPopup = (popup) => {
  const anchor = popup.offsetParent;
  if (!anchor) return;
  const box = clippingBox(anchor);
  const field = anchor.getBoundingClientRect();
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;

  const below = box.bottom - field.bottom - GAP - EDGE;
  const above = field.top - box.top - GAP - EDGE;
  if (height > below && height <= above) {
    popup.style.top = "auto";
    popup.style.bottom = `calc(100% + ${GAP}px)`;
    popup.style.transformOrigin = "bottom center";
  } else if (height > below) {
    // Fits neither way: keep it below but slide it up just enough to end inside the panel (it may cover
    // part of its own field), so nothing hangs out of view and the panel never has to scroll.
    const top = Math.max(box.top + EDGE, box.bottom - EDGE - height) - field.top;
    popup.style.top = `${top}px`;
  }

  if (width > field.width) {
    const overflowRight = field.left + width - (box.right - EDGE);
    const shift = Math.max(overflowRight > 0 ? -overflowRight : 0, box.left + EDGE - field.left);
    if (shift !== 0) {
      popup.style.left = `${shift}px`;
      popup.style.right = "auto";
    }
  }
};

/** Fits every picker popup that opens inside `ref`. Runs before paint, so the popup never jumps. */
export const useFitPopups = (ref) => {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const popup = node.matches(POPUP_SELECTOR) ? node : node.querySelector(POPUP_SELECTOR);
          if (popup) fitPopup(popup);
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ref]);
};
