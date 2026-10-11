import React, { memo } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import styles from "./FileTree.module.css";

const INDENT_STEP = 16;
const BASE_PAD = 8;

/**
 * One visible row of the file tree. Rows are flat siblings with aria-level (the
 * tree is virtual-friendly), the indent comes from depth. The name is the title,
 * so a note is announced by title only; folders add their note count.
 */
function TreeRow({ row, isActive, isSelected, isTabStop }) {
  const isFolder = row.type === "folder";
  const Icon = isFolder ? (row.isExpanded ? FolderOpen : Folder) : FileText;
  return (
    <div
      role="treeitem"
      className={styles.row}
      style={{ paddingInlineStart: BASE_PAD + row.depth * INDENT_STEP, "--depth": row.depth }}
      data-key={row.key}
      data-note-id={isFolder ? undefined : row.note.id}
      data-folder-path={isFolder ? row.path : undefined}
      data-active={isActive || undefined}
      data-selected={isSelected || undefined}
      aria-level={row.depth + 1}
      aria-setsize={row.setSize}
      aria-posinset={row.posInSet}
      aria-selected={isActive || isSelected}
      // The bare count would read as "Omnis 3"; say what it counts.
      aria-label={isFolder ? `${row.name}, ${row.noteCount} ${row.noteCount === 1 ? "note" : "notes"}` : undefined}
      aria-expanded={isFolder ? row.isExpanded : undefined}
      aria-current={isActive ? "true" : undefined}
      tabIndex={isTabStop ? 0 : -1}
    >
      {isFolder ? (
        <ChevronRight className={styles.chevron} data-open={row.isExpanded || undefined} size={16} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <span className={styles.chevronSpace} aria-hidden="true" />
      )}
      <Icon className={styles.icon} size={16} strokeWidth={1.75} aria-hidden="true" />
      <span className={styles.title}>{row.name}</span>
      {isFolder && <span className={styles.count} aria-hidden="true">{row.noteCount}</span>}
    </div>
  );
}

export default memo(TreeRow);
