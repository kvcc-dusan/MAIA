import React, { memo, useCallback } from "react";
import { NoteCardMenu } from "./NoteCard.jsx";

/**
 * One card of the notes grid. It only re-renders when its own note or selection state changes: the grid
 * grows in batches and a card already on screen must not be rebuilt every time the next batch arrives.
 * All props are primitives, the note object or handlers kept stable by the page.
 */
function GridCard({ note, dateDisplay, previewText, projectName, isSelected, selectMode, selectedCount, isPinned, onActivateNote, actions }) {
  const onActivate = useCallback(() => onActivateNote(note.id), [onActivateNote, note.id]);
  return (
    <NoteCardMenu
      note={note}
      dateDisplay={dateDisplay}
      previewText={previewText}
      projectName={projectName}
      isSelected={isSelected}
      selectMode={selectMode}
      selected={selectedCount}
      isPinned={isPinned}
      onActivate={onActivate}
      actions={actions}
    />
  );
}

export default memo(GridCard);
