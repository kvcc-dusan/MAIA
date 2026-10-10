import React, { memo } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import styles from "./FileTree.module.css";

const INDENT_STEP = 16;
const BASE_PAD = 8;

/**
 * One visible row of the file tree. Rows are flat siblings with aria-level (the
 * tree is virtual-friendly), the indent comes from depth.
 */
function TreeRow({ row, size, position, isActive, isSelected, isTabStop }) {
  const isFolder = row.type === "folder";
  const Icon = isFolder ? (row.isExpanded ? FolderOpen : Folder) : FileText;
  return (
    <div
      role="treeitem"
      className={styles.row}
      style={{ paddingInlineStart: BASE_PAD + row.depth * INDENT_STEP }}
      data-key={row.key}
      data-note-id={isFolder ? undefined : row.note.id}
      data-folder-path={isFolder ? row.path : undefined}
      data-active={isActive || undefined}
      data-selected={isSelected || undefined}
      aria-level={row.depth + 1}
      aria-setsize={size}
      aria-posinset={position}
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
      {isFolder && <span className={styles.count}>{row.noteCount}</span>}
    </div>
  );
}

export default memo(TreeRow);
