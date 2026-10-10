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

        // task list: [ ] or [x]
        if (/^\[(?:\s|x|X)\]$/.test(head)) {
          const checked = /\[([xX])\]/.test(head);
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.start();
              tr.delete(pos, pos + beforeText.length);
              return true;
            })
            .toggleTaskList()
            .command(() => {
              const node = editor.state.selection.$from.parent;
              if (node?.type?.name === 'taskItem' && checked) {
                editor.commands.updateAttributes('taskItem', { checked: true });
              }
              return true;
            })
            .run();
        }

        return false;
      },
    };
  },
});
