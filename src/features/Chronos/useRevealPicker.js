import { useEffect } from "react";

const REVEAL_SETTLE_MS = 350;
const POPUP_SELECTOR = '[role="dialog"][aria-label$=" calendar"], [role="listbox"][aria-label$=" options"]';

/**
 * Arc's date and time pickers open an absolutely positioned panel inside their
 * own field. Inside a scrolling form that panel hangs below the fold. The form
 * region reserves room for it in CSS (see ChronosModal.module.css); this
 * scrolls the panel into view when it opens, including from the keyboard.
 * `region` is the element itself (state, not a ref): the dialog portals its
 * children, so the node does not exist on the first render.
 */
export const useRevealPicker = (region) => {
  useEffect(() => {
    if (!region) return undefined;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const popup = node.matches(POPUP_SELECTOR) ? node : node.querySelector(POPUP_SELECTOR);
          if (!popup) continue;
          // Leave a margin so the panel's edge doesn't sit flush on the dialog border.
          popup.style.scrollMarginBlock = "var(--space-4)";
          const reveal = () => popup.isConnected && popup.scrollIntoView({ block: "nearest", behavior: "auto" });
          reveal();
          // The panel grows and settles as it animates in, so measure again.
          window.setTimeout(reveal, REVEAL_SETTLE_MS);
        }
      }
    });
    observer.observe(region, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [region]);
};
