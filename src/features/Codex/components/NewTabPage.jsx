import React from "react";
import { BookOpen, FileSearch, NotebookPen, SquarePen } from "lucide-react";
import styles from "./NewTabPage.module.css";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

/** The empty tab's landing page: four ways to start. */
export default function NewTabPage({ onCreateNote, onCreateJournal, onOpenNotesView, onGoToFile }) {
  const actions = [
    { label: "New note", icon: SquarePen, hint: `${MOD}N`, run: onCreateNote },
    { label: "New journal", icon: NotebookPen, run: onCreateJournal },
    { label: "Codex", icon: BookOpen, run: onOpenNotesView },
    { label: "Go to file", icon: FileSearch, hint: `${MOD}O`, run: onGoToFile },
  ];

  return (
    <div className={styles.page}>
      <ul className={styles.list}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.label}>
              <button type="button" className={styles.pill} onClick={action.run}>
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.label}>{action.label}</span>
                {action.hint && <kbd className={styles.hint}>{action.hint}</kbd>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
