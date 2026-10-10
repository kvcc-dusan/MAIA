import { Node } from '@tiptap/core';
import { mathLength } from './math.js';

// "\$a\$" reads back as the text "$a$", which Obsidian would then render as math. The
// dollars that would pair up as math are written escaped again; lone ones ("$5") are left alone.
const mathDollarPositions = (text) => {
  const found = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '$') continue;
    const length = mathLength(text, i);
    if (!length) continue;
    for (let j = i; j < i + length; j += 1) if (text[j] === '$') found.push(j);
    i += length - 1;
  }
  return found;
};

/**
 * The text node, with the one thing tiptap-markdown does to it removed: it writes "<" and ">"
 * as &lt; / &gt;, which turns "a < b" into "a &lt; b" in the user's file. Real HTML is kept
 * as raw atoms (htmlRaw.js), so plain text can be written as typed.
 * Use with StarterKit.configure({ text: false }).
 */
export const PlainText = Node.create({
  name: 'text',
  group: 'inline',

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          let start = 0;
          mathDollarPositions(node.text).forEach((pos) => {
            if (pos > start) state.text(node.text.slice(start, pos));
            state.write('\\$');
            start = pos + 1;
          });
          if (start < node.text.length) state.text(node.text.slice(start));
        },
        parse: {},
      },
    };
  },
});
