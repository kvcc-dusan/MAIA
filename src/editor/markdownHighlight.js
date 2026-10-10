import Highlight from '@tiptap/extension-highlight';
import markdownItMark from 'markdown-it-mark';

/**
 * Highlight, wired to round-trip through markdown as `==text==`.
 * The stock @tiptap/extension-highlight has no markdown serializer at all
 * (tiptap-markdown only knows how to serialize marks that declare
 * `storage.markdown`), so a highlighted selection was silently written to
 * disk as plain unmarked text on every save.
 */
export const MarkdownHighlight = Highlight.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '==', close: '==', expelEnclosingWhitespace: true },
        parse: {
          setup(markdownit) {
            markdownit.use(markdownItMark);
          },
        },
      },
    };
  },
});
