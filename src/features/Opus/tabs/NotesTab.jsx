import React, { useMemo } from "react";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { useData } from "@/context/DataContext";
import { PageBar } from "../kit";
import { projectNotes } from "../lib/docModel";
import NoteCard from "../components/notes/NoteCard";
import styles from "./NotesTab.module.css";

export default function NotesTab({ project, selectNote }) {
  const { notes, createNote } = useData();
  const list = useMemo(() => projectNotes(notes, project.id), [notes, project.id]);

  const handleNew = () => {
    const id = createNote({ title: "Untitled", projectIds: [project.id] });
    selectNote?.(id);
  };
  const newButton = <Button onClick={handleNew}>New note</Button>;

  if (list.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          description="Notes hold thinking that is not a task, decision or question. Each one opens in Codex."
          action={newButton}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageBar action={newButton} />
      <ul className={styles.list} aria-label="Notes">
        {list.map((note) => (
          <li key={note.id}><NoteCard note={note} onOpen={(id) => selectNote?.(id)} /></li>
        ))}
      </ul>
    </div>
  );
}
