// Stores that write to disk register here so the single window-close handler
// (useNotesStore) can wait for all of them. Tauri destroys the window as soon
// as a close handler returns without preventDefault, so a second independent
// handler would cut off whichever flush is still running.
const flushers = new Set();

/** @param {{ hasPending: () => boolean, flush: () => Promise<unknown> }} flusher */
export const registerCloseFlush = (flusher) => {
  flushers.add(flusher);
  return () => flushers.delete(flusher);
};

export const hasPendingCloseFlush = () => [...flushers].some((f) => f.hasPending());

export const runCloseFlush = () =>
  Promise.allSettled([...flushers].filter((f) => f.hasPending()).map((f) => f.flush()));
