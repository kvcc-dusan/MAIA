import { Extension, InputRule } from '@tiptap/core';

// `***x***` closing on the last star. The stock bold and italic rules both want that star
// for themselves, so typing the triple form came out as plain text.
const BOLD_ITALIC = /(?:^|\s)\*\*\*([^*\s](?:[^*]*[^*\s])?)\*\*\*$/;
const RULE_TEXT = /^(?:\*\*\*|___|---)$/;

/** Live typing: `***x***` for bold italic, and `***` / `___` then Enter for a horizontal rule. */
export const InlineShortcuts = Extension.create({
  name: 'maiaInlineShortcuts',

  addInputRules() {
    return [new InputRule({
      find: BOLD_ITALIC,
      handler: ({ state, range, match }) => {
        const { bold, italic } = state.schema.marks;
        // range stops before the star being typed, and match[0] may start with the space before the stars
        const start = range.from + match[0].indexOf('***');
        state.tr
          .replaceWith(start, range.to, state.schema.text(match[1], [bold.create(), italic.create()]))
          .removeStoredMark(bold)
          .removeStoredMark(italic);
      },
    })];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== 'paragraph' || !RULE_TEXT.test($from.parent.textContent)) return false;
        return this.editor.chain().deleteRange({ from: $from.start(), to: $from.end() }).setHorizontalRule().run();
      },
    };
  },
});
