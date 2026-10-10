/** Whether this is macOS, which decides how shortcuts are written. */
export const isMac = () => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

/** A shortcut as the user would type it here: ⌘K on macOS, Ctrl+K elsewhere. */
export const formatShortcut = (key) => (isMac() ? `⌘${key}` : `Ctrl+${key}`);
