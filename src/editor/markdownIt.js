// tiptap-markdown calls every extension's parse.setup(md) on EVERY parse, so a plugin
// that just calls md.use() would stack duplicate rules. This installs each one once per instance.
const installed = new WeakMap();

export const installOnce = (md, key, install) => {
  const keys = installed.get(md) ?? new Set();
  if (keys.has(key)) return;
  installed.set(md, keys.add(key));
  install(md);
};

/** Sticky-regex match at an exact position (markdown-it rules work on offsets, not slices). */
export const matchAt = (regex, src, pos) => {
  regex.lastIndex = pos;
  return regex.exec(src);
};

/** The text of one source line, without the container indent markdown-it already consumed. */
export const lineText = (state, line) =>
  state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
