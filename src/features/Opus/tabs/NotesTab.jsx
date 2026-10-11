import React, { useMemo, useState } from "react";
import { NotebookPen } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { useData } from "@/context/DataContext";
import { PageBar } from "../kit";
import { projectNotes } from "../lib/docModel";
import NotePicker from "../components/library/NotePicker";
import { unlinkedNotesFor, withProject } from "../components/library/noteModel";
import NoteCard from "../components/notes/NoteCard";
import styles from "./NotesTab.module.css";

export default function NotesTab({ project, selectNote }) {
  const { notes, createNote, updateNote } = useData();
  const [isPicking, setIsPicking] = useState(false);
  const list = useMemo(() => projectNotes(notes, project.id), [notes, project.id]);

  const handleNew = () => {
    const id = createNote({ title: "Untitled", projectIds: [project.id] });
    selectNote?.(id);
  };
  const unlinked = useMemo(() => unlinkedNotesFor(notes, project.id), [notes, project.id]);
  const linkNote = (note) => {
    updateNote(withProject(note, project.id));
    setIsPicking(false);
  };
  const actions = (
    <>
      <Button variant="secondary" onClick={() => setIsPicking(true)}>Link existing note</Button>
      <Button onClick={handleNew}>New note</Button>
    </>
  );
  const picker = <NotePicker open={isPicking} notes={unlinked} onPick={linkNote} onClose={() => setIsPicking(false)} />;

  if (list.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          description="Notes hold thinking that is not a task, decision or question. Each one opens in Codex."
          action={actions}
        />
        {picker}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageBar action={actions} />
      <ul className={styles.list} aria-label="Notes">
        {list.map((note) => (
          <li key={note.id}><NoteCard note={note} onOpen={(id) => selectNote?.(id)} /></li>
        ))}
      </ul>
      {picker}
    </div>
  );
}
