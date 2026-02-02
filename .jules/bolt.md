## 2024-05-23 - Heavy Tiptap Editors in Lists
**Learning:** Using `EditorRich` (Tiptap) for read-only items in a list (like Journal History) creates a massive performance bottleneck due to the overhead of instantiating full ProseMirror state for each item.
**Action:** Always use a lightweight Markdown renderer (like `markdown-it`) for read-only views of rich text content, ensuring CSS matches the editor's styling for visual consistency.
