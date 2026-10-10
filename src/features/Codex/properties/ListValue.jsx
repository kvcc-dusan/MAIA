import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/arc/input/input";
import { IconButton } from "@/components/composed/IconButton";
import { normalizeTag } from "@/lib/frontmatterProps";
import styles from "./Properties.module.css";

/** Lists, tags, aliases and cssclasses as removable chips plus an add field. Tags show with #, never store it. */
export default function ListValue({ label, items, type, isEditable, autoFocus = false, onChange }) {
  const [draft, setDraft] = useState("");
  // Chips appear and vanish silently otherwise; a polite region says what changed.
  const [announcement, setAnnouncement] = useState("");
  const addRef = useRef(null);
  const isTags = type === "tags";
  const shown = (item) => (isTags ? `#${item}` : item);
  const count = (n) => `${n} ${n === 1 ? "item" : "items"}`;

  const add = () => {
    const next = isTags ? normalizeTag(draft) : draft.trim();
    setDraft("");
    if (!next || items.includes(next)) return;
    onChange([...items, next]);
    setAnnouncement(`Added ${shown(next)} to ${label}. ${count(items.length + 1)}.`);
  };

  const remove = (item) => {
    onChange(items.filter((i) => i !== item));
    setAnnouncement(`Removed ${shown(item)} from ${label}. ${count(items.length - 1)}.`);
    // The remove button is about to unmount; keep focus in this list.
    addRef.current?.focus();
  };

  return (
    <div className={styles.chips} role="group" aria-label={label}>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {items.map((item) => (
        <span key={item} className={styles.chip}>
          <span className={styles.chipText}>{shown(item)}</span>
          {isEditable && (
            <IconButton
              label={`Remove ${shown(item)} from ${label}`}
              icon={X}
              size="icon-sm"
              tooltip={false}
              className={styles.chipRemove}
              onClick={() => remove(item)}
            />
          )}
        </span>
      ))}
      {isEditable && (
        <div className={`${styles.chipAdd} ${styles.srLabel}`}>
          <Input
            ref={addRef}
            aria-keyshortcuts="Enter Escape"
            label={`Add to ${label}`}
            placeholder={isTags ? "Add tag" : "Add item"}
            value={draft}
            autoFocus={autoFocus}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              } else if (event.key === "Escape" && draft) {
                event.stopPropagation();
                setDraft("");
              }
            }}
            onBlur={add}
          />
        </div>
      )}
    </div>
  );
}
