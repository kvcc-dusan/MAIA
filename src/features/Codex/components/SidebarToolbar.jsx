import React from "react";
import { ArrowUpDown, Check, ChevronsDownUp, ChevronsUpDown, FolderPlus, LocateFixed, NotebookPen, SquarePen } from "@/components/icons";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { SORT_OPTIONS } from "../sortOrder.js";
import styles from "./SidebarToolbar.module.css";

// 36px buttons (44px on touch) so six fit the 264px sidebar; the bar scrolls sideways if they ever do not.
const BUTTON_SIZE = "icon-sm";

/**
 * Icon bar above the file tree: create, sort, follow the open note, collapse or expand all.
 * Presentational; NotesSidebar owns the state.
 */
export default function SidebarToolbar({
  onNewNote,
  onNewJournal,
  onNewFolder,
  sort,
  onSortChange,
  isAutoReveal,
  onToggleAutoReveal,
  hasFolders,
  isAnyExpanded,
  onToggleAllFolders,
}) {
  const ToggleIcon = isAnyExpanded ? ChevronsDownUp : ChevronsUpDown;
  const toggleLabel = isAnyExpanded ? "Collapse all" : "Expand all";
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Notes actions">
      <IconButton icon={SquarePen} size={BUTTON_SIZE} label="New note" side="bottom" onClick={onNewNote} />
      <IconButton icon={NotebookPen} size={BUTTON_SIZE} label="New journal" side="bottom" onClick={onNewJournal} />
      <IconButton icon={FolderPlus} size={BUTTON_SIZE} label="New folder" side="bottom" onClick={onNewFolder} />
      <Menu.Root>
        <Menu.Trigger render={<IconButton icon={ArrowUpDown} size={BUTTON_SIZE} label="Change sort order" side="bottom" />} />
        <Menu.Content align="start">
          {SORT_OPTIONS.map((option) => {
            const isChecked = option.id === sort;
            return (
              <Menu.Item key={option.id} role="menuitemradio" aria-checked={isChecked} onClick={() => onSortChange(option.id)}>
                <span className={styles.check} aria-hidden="true">{isChecked && <Check size={16} strokeWidth={1.75} />}</span>
                {option.label}
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Root>
      <IconButton
        icon={LocateFixed}
        size={BUTTON_SIZE}
        variant={isAutoReveal ? "secondary" : "ghost"}
        label="Auto-reveal current note"
        side="bottom"
        aria-pressed={isAutoReveal}
        onClick={onToggleAutoReveal}
      />
      <IconButton icon={ToggleIcon} size={BUTTON_SIZE} label={toggleLabel} side="bottom" disabled={!hasFolders} onClick={onToggleAllFolders} />
    </div>
  );
}
