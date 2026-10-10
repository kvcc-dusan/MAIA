// Focus handling after a row changes or goes away. A removed row takes the
// focused button with it, which would drop keyboard users back to the page top.

const escape = (value) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : String(value));

/** Moves focus to a section's heading (made focusable on demand). */
export const focusSectionHeading = (root, section) => {
  const heading = root?.querySelector(`[data-section="${section}"] h2`);
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
};

/** Focus the row's main action if the row is still there, else fall back to the heading. */
export const settleFocus = (root, section, rowId) => {
  const run = () => {
    const action = rowId ? root?.querySelector(`[data-row-id="${escape(rowId)}"] [data-primary-action]`) : null;
    if (action instanceof HTMLElement) action.focus();
    else focusSectionHeading(root, section);
  };
  // Wait a frame so the list has re-rendered without the row.
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else run();
};
