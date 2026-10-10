import React from "react";
import { Unlink } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import { ScrollArea } from "@/components/arc/scroll-area/scroll-area";
import { excerptOf, noteTitle } from "./noteModel";
import styles from "./NoteList.module.css";

/** Linked notes as rows: open on the left, unlink on the right (always visible, so touch reaches it). */
export default function NoteList({ notes, hiddenCount, onShowAll, onOpenNote, onUnlink }) {
  return (
    <ScrollArea label="Linked notes" className={styles.scroll} viewportClassName={styles.viewport}>
      <ul className={styles.list}>
        {notes.map((note) => {
          const excerpt = excerptOf(note.content);
          return (
            <li key={note.id} className={styles.row}>
              <button type="button" className={styles.open} onClick={() => onOpenNote?.(note.id)}>
                <span className={styles.title}>{noteTitle(note)}</span>
                {excerpt && <span className={styles.excerpt}>{excerpt}</span>}
              </button>
              <IconButton
                icon={Unlink}
                label={`Unlink ${noteTitle(note)} from this project`}
                onClick={() => onUnlink?.(note)}
              />
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <div className={styles.more}>
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            Show {hiddenCount} more {hiddenCount === 1 ? "note" : "notes"}
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
