import { Extension } from '@tiptap/core';

/** Auto Markdown Shortcuts on SPACE at line start */
export const AutoMarkdownShortcuts = Extension.create({
  name: 'autoMarkdownShortcuts',
  addKeyboardShortcuts() {
    return {
      Space: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        const inParagraph = $from.parent?.type?.name === 'paragraph';
        if (!inParagraph) return false;

        const beforeText = $from.parent.textBetween(0, $from.parentOffset);
        const head = beforeText.replace(/\s+$/, '').trim();

        // bullets
        if (head === '-' || head === '*' || head === '+') {
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleBulletList()
            .run();
        }

        // ordered 1.
        if (/^\d+\.$/.test(head)) {
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleOrderedList()
            .run();
        }

        // task list: [ ], [x], or any single status char ([/], [-], [>]) once inside a list item
        const isInListItem = $from.node(-1)?.type?.name === 'listItem';
        const taskMatch = /^\[(.)\]$/.exec(head);
        const isTaskMark = taskMatch && (/^[ xX]$/.test(taskMatch[1]) || isInListItem);
        if (isTaskMark) {
          const status = taskMatch[1];
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleTaskList()
            // Reads the chain's own transaction: editor.state is still the old doc here,
            // which is why a typed "- [x] " used to come out unchecked.
            .updateAttributes('taskItem', { checked: /[xX]/.test(status), status })
            .run();
        }

        return false;
      },
    };
  },
});
