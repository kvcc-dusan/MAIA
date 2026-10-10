import React, { useMemo } from "react";
import { NotebookPen, SquarePen } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import styles from "./NotesSidebar.module.css";

const stamp = (note) => Date.parse(note.updatedAt ?? note.createdAt ?? "") || 0;

/**
 * The Codex file list, rendered into the shell's secondary sidebar. The vault is
 * flat today (MAIA reads the top level of the vault folder), so this is a list,
 * newest first; it becomes a tree when the vault learns about folders.
 */
export default function NotesSidebar({ notes, currentNoteId, onOpenNote, onCreateNote, onCreateJournal }) {
  const sorted = useMemo(() => [...notes].sort((a, b) => stamp(b) - stamp(a)), [notes]);

  return (
    <nav className={styles.sidebar} aria-label="Notes">
      <div className={styles.toolbar}>
        <IconButton icon={SquarePen} size="icon" label="New note" side="bottom" onClick={onCreateNote} />
        <IconButton icon={NotebookPen} size="icon" label="New journal" side="bottom" onClick={onCreateJournal} />
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No notes yet. Create one with the buttons above.</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className={styles.row}
                aria-current={note.id === currentNoteId ? "true" : undefined}
                data-active={note.id === currentNoteId || undefined}
                onClick={() => onOpenNote(note.id)}
              >
                <span className={styles.title}>{note.title || "Untitled"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.footer}>
        {notes.length} {notes.length === 1 ? "note" : "notes"}
      </p>
    </nav>
  );
}
