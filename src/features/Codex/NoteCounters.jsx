import React from "react";
import styles from "./NoteCounters.module.css";

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Floating pill pinned to the bottom right of the note area. */
export default function NoteCounters({ backlinks, words, characters }) {
  return (
    <div className={styles.pill} role="status" aria-label="Note statistics">
      <span>{plural(backlinks, "backlink", "backlinks")}</span>
      <span>{plural(words, "word", "words")}</span>
      <span>{plural(characters, "character", "characters")}</span>
    </div>
  );
}
