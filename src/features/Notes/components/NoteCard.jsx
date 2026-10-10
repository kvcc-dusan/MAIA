import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/arc/badge/badge";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { Pin, CheckmarkSquare02, Delete01, Pen01 } from "@/components/ui/CustomIcon.jsx";
import { useLongPress } from "@/hooks/useLongPress";
import { noteTags } from "@/lib/noteTags";
import styles from "./NoteCard.module.css";

// NoteCard calls this for both real right-clicks and its synthetic
// long-press event. The actual menu is owned by Menu.ContextTrigger, which
// opens natively for both gestures; this stub only keeps that contract
// satisfied (mirrors LedgerPage's DecisionCardMenu).
function handleCardContextMenu(e) {
  e.preventDefault();
}

/**
 * Shared body for the note actions menu, rendered once for the right-click
 * / long-press ContextMenu and once for the "..." dropdown, so the two
 * triggers can't drift out of sync. `ItemC`/`SepC`/`LabelC`/`DangerC` let the
 * caller supply either the Context* or plain Menu.* flavour.
 */
function NoteMenuBody({ note, selectMode, selectedCount, isPinned, actions, ItemC, SepC, LabelC, DangerC }) {
  // Re-bound to capitalized locals: eslint's plain no-unused-vars (no
  // react plugin here) doesn't see JSX tag usage of a destructured param as
  // a reference, but does exempt capitalized top-level vars.
  const ItemComp = ItemC;
  const SepComp = SepC;
  const LabelComp = LabelC;
  const DangerComp = DangerC;

  if (selectMode) {
    return (
      <>
        <LabelComp>{selectedCount} selected</LabelComp>
        <ItemComp onClick={actions.bulkPin}>
          <Pin size={16} />
          Pin all
        </ItemComp>
        <ItemComp onClick={actions.bulkUnpin}>
          <Pin size={16} />
          Unpin all
        </ItemComp>
        <SepComp />
        <DangerComp onClick={actions.bulkDelete}>
          <Delete01 size={16} />
          Delete all
        </DangerComp>
      </>
    );
  }

  return (
    <>
      <ItemComp onClick={() => actions.togglePin(note.id)}>
        <Pin size={16} />
        {isPinned ? "Unpin note" : "Pin note"}
      </ItemComp>
      <ItemComp onClick={() => actions.rename(note.id)}>
        <Pen01 size={16} />
        Rename
      </ItemComp>
      <ItemComp onClick={() => actions.select(note.id)}>
        <CheckmarkSquare02 size={16} />
        Select
      </ItemComp>
      <SepComp />
      <DangerComp onClick={() => actions.delete(note.id)}>
        <Delete01 size={16} />
        Delete
      </DangerComp>
    </>
  );
}

/** One note in the grid. A `<div>` rather than a real `<button>` because
 * Menu.ContextTrigger wraps and clones props onto its child, and a
 * `<button>` nested inside interactive descendants (the "..." IconButton)
 * would be invalid HTML, same constraint DecisionCard documents. */
function NoteCard({ note, dateDisplay, previewText, projectName, isSelected, selectMode, isPinned, onActivate, actions }) {
  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onActivate();
    }
  };

  const noteName = note.title || "Untitled note";
  const activationLabel = selectMode
    ? `${isSelected ? "Deselect" : "Select"} ${noteName}`
    : `Open ${noteName}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={activationLabel}
      aria-pressed={selectMode ? isSelected : undefined}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      className={styles.card}
    >
      <div className={styles.header}>
        <div className={styles.title}>{noteName}</div>
        {isPinned && (
          <span className={styles.pinned} role="img" aria-label="Pinned">
            <Pin size={16} />
          </span>
        )}
      </div>

      <p className={styles.preview}>{previewText}</p>

      <div className={styles.footer}>
        <div className={styles.meta}>
          <span className={styles.date}>{dateDisplay}</span>
          {noteTags(note).includes("journal") && <Badge tone="neutral">journal</Badge>}
          {projectName && (
            <Badge tone="neutral" className={styles.project}>
              {projectName}
            </Badge>
          )}
        </div>

        <Menu.Root>
          <Menu.Trigger
            render={
              <IconButton
                label={`Actions for ${noteName}`}
                tooltip={false}
                icon={MoreHorizontal}
                variant="ghost"
                size="icon-xs"
                className={styles.menuButton}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
          <Menu.Content align="end">
            <Menu.Group>
              <NoteMenuBody
                note={note}
                selectMode={selectMode}
                selectedCount={actions.selectedCount}
                isPinned={isPinned}
                actions={actions}
                ItemC={Menu.Item}
                SepC={Menu.Separator}
                LabelC={Menu.Label}
                DangerC={MenuDangerItem}
              />
            </Menu.Group>
          </Menu.Content>
        </Menu.Root>
      </div>
    </div>
  );
}

/** Note card wrapped in the right-click / long-press context menu. */
export function NoteCardMenu({ note, selectMode, selected, actions, ...cardProps }) {
  const longPress = useLongPress((touch) => {
    handleCardContextMenu({ preventDefault: () => {} });
    // Menu.ContextTrigger opens on its own gestures; long-press is surfaced
    // via native touch context menu support in the underlying primitive, so
    // nothing else is needed here besides keeping the touch handlers wired.
    void touch;
  });

  return (
    <Menu.Context>
      <Menu.ContextTrigger
        className="contents"
        onTouchStart={longPress.onTouchStart}
        onTouchMove={longPress.onTouchMove}
        onTouchEnd={longPress.onTouchEnd}
      >
        <NoteCard note={note} selectMode={selectMode} actions={actions} {...cardProps} />
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <NoteMenuBody
          note={note}
          selectMode={selectMode}
          selectedCount={selected}
          isPinned={cardProps.isPinned}
          actions={actions}
          ItemC={Menu.ContextItem}
          SepC={Menu.ContextSeparator}
          LabelC={Menu.ContextLabel}
          DangerC={ContextDangerItem}
        />
      </Menu.ContextContent>
    </Menu.Context>
  );
}
