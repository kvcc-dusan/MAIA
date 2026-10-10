import React, { useId, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import {
  isFrontmatterReadable, readProperties, removeFrontmatterProperty, renameFrontmatterProperty,
  setFrontmatterProperty, validatePropertyKey,
} from "@/lib/frontmatterProps";
import AddPropertyForm from "./AddPropertyForm.jsx";
import PropertyRow from "./PropertyRow.jsx";
import { initialValue } from "./propertyTypes.js";
import { usePropertiesOpen } from "./usePropertiesOpen.js";
import styles from "./Properties.module.css";

/**
 * Obsidian-style "Properties" block under the note title. It reads and writes the note's
 * frontmatter through frontmatterProps, so a change touches only that key's lines.
 * `onChange(nextNote)` receives the whole updated note; the caller merges the property fields.
 */
export default function PropertiesPanel({ note, onChange, isEditable = true }) {
  const headingId = useId();
  const listId = useId();
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [failure, setFailure] = useState(null);
  const isReadable = isFrontmatterReadable(note);
  const rows = isReadable ? readProperties(note) : [];
  const [isOpen, setOpen] = usePropertiesOpen(note.id, rows.length > 0);

  // Every write goes through here so one bad value shows a message instead of crashing the editor
  const apply = (build) => {
    try {
      onChange(build());
      setFailure(null);
      return null;
    } catch (error) {
      setFailure(error.message);
      return error.message;
    }
  };

  const set = (key, typed) => apply(() => setFrontmatterProperty(note, key, typed));
  const remove = (key) => apply(() => removeFrontmatterProperty(note, key));
  const rename = (from, to) => validatePropertyKey(note, to, { ignore: from }) ?? apply(() => renameFrontmatterProperty(note, from, to));

  const add = (name, type) => {
    const message = validatePropertyKey(note, name);
    if (message) return message;
    const error = apply(() => setFrontmatterProperty(note, name, { type, value: initialValue(type) }));
    if (error) return error;
    setNewKey(name);
    setIsAdding(false);
    setOpen(true);
    return null;
  };

  if (!isReadable) {
    return (
      <p className={styles.notice} role="status">
        Properties could not be read. Change them in the file itself, MAIA leaves them as they are.
      </p>
    );
  }
  if (!isEditable && rows.length === 0) return null;

  const addButton = isEditable && !isAdding && (
    <Button variant="ghost" size="md" className={styles.add} onClick={() => { setIsAdding(true); setOpen(true); }}>
      <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Add property
    </Button>
  );

  // A plain note stays clean: no heading, just the add affordance
  if (rows.length === 0 && !isAdding) return <div className={styles.panel}>{addButton}</div>;

  return (
    <div className={styles.panel} role="group" aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.head}>
        <button
          type="button"
          className={styles.headToggle}
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => setOpen(!isOpen)}
        >
          <ChevronRight className={styles.chevron} data-open={isOpen} size={16} strokeWidth={1.75} aria-hidden="true" />
          Properties
        </button>
      </h2>

      <div id={listId} hidden={!isOpen}>
        {rows.length > 0 && (
          <ul className={styles.list}>
            {rows.map((row) => (
              <PropertyRow
                key={row.key}
                row={row}
                isEditable={isEditable}
                autoFocus={row.key === newKey}
                onSet={set}
                onRemove={remove}
                onRename={rename}
              />
            ))}
          </ul>
        )}
        {failure && <p className={styles.alert} role="alert">{failure}</p>}
        {isAdding && <AddPropertyForm onAdd={add} onCancel={() => setIsAdding(false)} />}
        {addButton}
      </div>
    </div>
  );
}
