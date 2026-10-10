import { useCallback, useState } from "react";

const storageKey = (id) => `maia:note-props:${id}`;

// Storage can throw (private windows, blocked site data); a failure only forgets the choice.
const read = (id) => {
  try {
    return localStorage.getItem(storageKey(id));
  } catch {
    return null;
  }
};

const write = (id, value) => {
  try {
    localStorage.setItem(storageKey(id), value);
  } catch {
    // lasts for this session only
  }
};

/**
 * Open/closed state of the properties block, remembered per note. Until the user chooses, a note
 * with properties is open and a plain note stays collapsed to its add button.
 */
export function usePropertiesOpen(noteId, hasProperties) {
  const [stored, setStored] = useState(() => read(noteId));
  const isOpen = stored === null ? hasProperties : stored === "open";

  const setOpen = useCallback((next) => {
    const value = next ? "open" : "closed";
    setStored(value);
    write(noteId, value);
  }, [noteId]);

  return [isOpen, setOpen];
}
