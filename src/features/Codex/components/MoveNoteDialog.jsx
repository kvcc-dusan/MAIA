import React from "react";
import { Check, Folder } from "lucide-react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { ROOT_LABEL } from "../folderTree.js";
import styles from "./FileTree.module.css";

const INDENT_STEP = 16;

/** Folder picker for "Move to folder". `folders` is every path, depth-first. */
export default function MoveNoteDialog({ note, folders, onMove, onClose }) {
  const current = note?.folder ?? "";
  const options = ["", ...folders];
  return (
    <AppDialog
      open={Boolean(note)}
      onClose={onClose}
      title="Move to folder"
      description={note ? `Choose where "${note.title || "Untitled"}" should live.` : undefined}
      size="sm"
      footer={<Button variant="secondary" onClick={onClose}>Cancel</Button>}
    >
      <ul className={styles.pickList}>
        {options.map((path) => {
          const depth = path ? path.split("/").length : 0;
          const name = path ? path.slice(path.lastIndexOf("/") + 1) : ROOT_LABEL;
          return (
            <li key={path || "root"}>
              <button
                type="button"
                className={styles.pickRow}
                style={{ paddingInlineStart: 12 + Math.max(depth - 1, 0) * INDENT_STEP }}
                aria-current={path === current ? "true" : undefined}
                onClick={() => onMove(path)}
              >
                <Folder size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.title}>{name}</span>
                {path === current && <Check size={16} strokeWidth={1.75} aria-label="Current folder" />}
              </button>
            </li>
          );
        })}
      </ul>
    </AppDialog>
  );
}
