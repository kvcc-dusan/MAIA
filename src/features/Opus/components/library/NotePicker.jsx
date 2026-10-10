import React, { useMemo, useRef, useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { SearchField } from "@/components/arc/search-field/search-field";
import { filterNotesByTitle, noteTitle } from "./noteModel";
import styles from "./NotePicker.module.css";

/** Dialog that links an existing note to the project; `notes` are the unlinked ones. */
export default function NotePicker({ open, notes, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const { shown, total } = useMemo(() => filterNotesByTitle(notes, query), [notes, query]);

  // Radix would focus the close button; the search field is the point of this dialog.
  const focusSearch = (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <AppDialog open={open} onClose={onClose} title="Link a note" size="sm" onOpenAutoFocus={focusSearch}>
      <SearchField ref={inputRef} label="Search notes" value={query} onValueChange={setQuery} placeholder="Note title" />
      <div className={styles.results} aria-live="polite">
        {shown.length === 0 ? (
          <p className={styles.empty}>
            {notes.length === 0 ? "Every note is already linked to this project." : "No notes match that title. Try fewer words."}
          </p>
        ) : (
          <ul className={styles.list}>
            {shown.map((note) => (
              <li key={note.id}>
                <button type="button" className={styles.item} onClick={() => onPick(note)}>
                  {noteTitle(note)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {total > shown.length && <p className={styles.hint}>Showing {shown.length} of {total}. Search to narrow it down.</p>}
      </div>
    </AppDialog>
  );
}
