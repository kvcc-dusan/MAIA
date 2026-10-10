/**
 * True when the user is typing in another field. Auto-focus must never take the
 * caret from a search box or the palette while a note is switching in.
 */
export const isTypingElsewhere = () => {
  const el = document.activeElement;
  return !!el && el !== document.body && el.matches('input, textarea, select, [contenteditable="true"]');
};
