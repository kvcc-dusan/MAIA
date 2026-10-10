import { Node } from '@tiptap/core';
import { installOnce } from './markdownIt.js';

const DATA_ATTR = 'data-maia-softbreak';

/**
 * A single newline inside a paragraph. Obsidian shows it as a line break, but the stock
 * pipeline folds it into a space on save. Rendered as <br> and written back as "\n".
 */
export const SoftBreak = Node.create({
  name: 'softBreak',
  group: 'inline',
  inline: true,
  selectable: false,

  // Must beat HardBreak's plain `br` rule
  parseHTML() {
    return [{ tag: `br[${DATA_ATTR}]`, priority: 1000 }];
  },

  renderHTML() {
    return ['br', { [DATA_ATTR]: '' }];
  },

  renderText: () => '\n',

  addStorage() {
    return {
      markdown: {
        serialize(state) {
          state.write('\n');
        },
        parse: {
          setup: (md) => installOnce(md, 'softBreak', (instance) => {
            instance.renderer.rules.softbreak = () => `<br ${DATA_ATTR}>`;
          }),
        },
      },
    };
  },
});
