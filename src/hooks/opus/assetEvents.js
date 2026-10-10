// Tiny pub/sub so the Opus watcher and loader can tell open Assets panels to
// re-list their folder. Kept apart from the project/task state on purpose:
// an assets change must never cause a project or task write.
const listeners = new Set();

export const subscribeAssetsChanged = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const emitAssetsChanged = () => [...listeners].forEach((fn) => fn());
