import React from "react";
import { useRef } from "react";
import { Check, Folder } from "lucide-react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { ROOT_LABEL } from "../folderTree.js";
import styles from "./FileTree.module.css";

const INDENT_STEP = 16;

/** Folder picker for "Move to folder". `folders` is every path, depth-first. */
export default function MoveNoteDialog({ note, folders, onMove, onClose, onCloseAutoFocus }) {
  const current = note?.folder ?? "";
  const options = ["", ...folders];
  const listRef = useRef(null);
  return (
    <AppDialog
      open={Boolean(note)}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenAutoFocus={(event) => {
        // The current folder is disabled and can't take focus; start on the first place the note can go.
        const firstMove = listRef.current?.querySelector("button:not(:disabled)");
        if (!firstMove) return;
        event.preventDefault();
        firstMove.focus();
      }}
      title="Move to folder"
      description={note ? `Choose where "${note.title || "Untitled"}" should live.` : undefined}
      size="sm"
      footer={<Button variant="secondary" onClick={onClose}>Cancel</Button>}
    >
      <ul ref={listRef} className={styles.pickList} aria-label="Folders">
        {options.map((path) => {
          const depth = path ? path.split("/").length : 0;
          const name = path ? path.slice(path.lastIndexOf("/") + 1) : ROOT_LABEL;
          return (
            <li key={path || "root"}>
              <button
                type="button"
                className={styles.pickRow}
                style={{ paddingInlineStart: 12 + Math.max(depth - 1, 0) * INDENT_STEP }}
                // Disabled, not just hidden: screen readers announce it as unavailable and it leaves the tab order.
                disabled={path === current}
                aria-current={path === current ? "true" : undefined}
                aria-label={`${path || ROOT_LABEL}${path === current ? ", current folder" : ""}`}
                onClick={() => onMove(path)}
              >
                <Folder size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.title}>{name}</span>
                {path === current && <Check size={16} strokeWidth={1.75} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </AppDialog>
  );
}
