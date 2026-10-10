let loading = null;

/** katex and its stylesheet, fetched on the first formula. A failed load is retried next time. */
export const loadKatex = () => {
  loading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')])
    .then(([module]) => module.default)
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
};
