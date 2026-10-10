import React from "react";
import { noteCardTitle, noteDateLabel, notePreview } from "./noteDisplay";
import styles from "./NoteCard.module.css";

/** A dated note card. The whole card is one button that opens the note in Codex. */
export default function NoteCard({ note, onOpen }) {
  const preview = notePreview(note.content, note.title ?? "");
  return (
    <article className={styles.card}>
      <button type="button" className={styles.button} onClick={() => onOpen(note.id)}>
        <span className={styles.date}>{noteDateLabel(note)}</span>
        <span className={styles.title}>{noteCardTitle(note)}</span>
        {preview ? <span className={styles.preview}>{preview}</span> : <span className={styles.empty}>No text yet</span>}
      </button>
    </article>
  );
}
