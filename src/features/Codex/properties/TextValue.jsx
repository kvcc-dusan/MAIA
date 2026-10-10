import React, { useId, useRef, useState } from "react";
import { Input } from "@/components/arc/input/input";
import styles from "./Properties.module.css";

/**
 * Text and number values: click to edit in place, Enter commits, Escape cancels.
 * `onCommit(next)` gets a string for text and a number for number; it is not called when nothing changed.
 */
export default function TextValue({ label, value, type, isEditable, autoFocus = false, onCommit }) {
  const isNumber = type === "number";
  const [isEditing, setIsEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState(null);
  // Enter and Escape unmount the input, which fires blur once more; that blur must not commit again
  const isDoneRef = useRef(false);
  const valueId = useId();

  const start = () => {
    isDoneRef.current = false;
    setDraft(String(value));
    setError(null);
    setIsEditing(true);
  };

  const finish = (shouldCommit) => {
    if (isDoneRef.current) return;
    if (!shouldCommit) {
      isDoneRef.current = true;
      setIsEditing(false);
      return;
    }
    const text = draft.trim();
    const next = isNumber ? Number(text) : text;
    if (isNumber && (text === "" || !Number.isFinite(next))) {
      setError("Enter a number");
      return;
    }
    isDoneRef.current = true;
    setIsEditing(false);
    if (next !== value) onCommit(next);
  };

  if (!isEditable) {
    return <span className={styles.valueButton}>{String(value) || <span className={styles.empty}>Empty</span>}</span>;
  }

  if (!isEditing) {
    return (
      <>
        {/* The name stays "Edit <property>"; the current value rides along as the description, so it is still heard. */}
        <button type="button" className={styles.valueButton} aria-label={`Edit ${label}`} aria-describedby={valueId} onClick={start}>
          {String(value) === "" ? <span className={styles.empty}>Empty</span> : String(value)}
        </button>
        <span id={valueId} hidden>{String(value) === "" ? "Empty" : `Value: ${String(value)}`}</span>
      </>
    );
  }

  return (
    <div className={styles.editor}>
      <Input
        label={label}
        aria-keyshortcuts="Enter Escape"
        value={draft}
        inputMode={isNumber ? "decimal" : undefined}
        error={error ?? undefined}
        autoFocus
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish(true);
          } else if (event.key === "Escape") {
            // the editor must not also see this as "leave the note"
            event.stopPropagation();
            finish(false);
          }
        }}
        onBlur={() => finish(!error)}
      />
    </div>
  );
}
