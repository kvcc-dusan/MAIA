import React, { useMemo, useState } from "react";
import { Link2, Network, Plus } from "lucide-react";
import { useData } from "../../../context/DataContext";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { ErrorState } from "@/components/composed/ErrorState";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import NoteGraph from "./library/NoteGraph";
import NoteList from "./library/NoteList";
import NotePicker from "./library/NotePicker";
import { linkedNotesFor, unlinkedNotesFor, withProject, withoutProject } from "./library/noteModel";
import styles from "./library/KnowledgePanel.module.css";

// Past ~20 nodes the graph is unreadable, so the cap is a rendering limit.
const PAGE_SIZE = 20;
const VIEWS = [
  { value: "list", label: "List" },
  { value: "graph", label: "Graph" },
];

/** Notes linked to the project: a list first, a force graph one switch away. */
export default function KnowledgePanel({ project, selectNote }) {
  const { notes, createNote, updateNote, notesMeta } = useData();
  const [view, setView] = useState("list");
  const [showAll, setShowAll] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const linked = useMemo(() => linkedNotesFor(notes, project.id), [notes, project.id]);
  const unlinked = useMemo(() => unlinkedNotesFor(notes, project.id), [notes, project.id]);
  const isGraph = view === "graph";
  const visible = useMemo(
    () => (isGraph || !showAll ? linked.slice(0, PAGE_SIZE) : linked),
    [linked, isGraph, showAll]
  );

  const status = notesMeta?.status ?? "ready";
  const newNote = () => selectNote?.(createNote({ projectIds: [project.id] }));
  const linkNote = (note) => {
    updateNote(withProject(note, project.id));
    setIsPicking(false);
  };
  const unlinkNote = (note) => updateNote(withoutProject(note, project.id));

  const actions = (
    <div className={styles.actions}>
      <IconButton icon={Plus} label="New note in this project" onClick={newNote} />
      <IconButton icon={Link2} label="Link an existing note" onClick={() => setIsPicking(true)} />
      {linked.length > 0 && (
        <SegmentedControl label="Notes view" options={VIEWS} value={view} onValueChange={setView} />
      )}
    </div>
  );

  const renderBody = () => {
    if (status === "loading") return <div className={styles.pad} aria-busy="true"><Skeleton label="Loading notes" lines={4} /></div>;
    if (status === "error") {
      return (
        <div className={styles.pad}>
          <ErrorState title="Couldn't load your notes" message="Check that your vault folder is still available, then try again." onRetry={notesMeta.reload} />
        </div>
      );
    }
    if (status === "needs-vault") {
      return <EmptyState icon={Network} title="No vault folder yet" description="Choose your vault folder and the notes linked to this project show up here." />;
    }
    if (linked.length === 0) {
      return (
        <EmptyState
          icon={Network}
          title="No notes linked yet"
          description="Write a note for this project or link one you already have."
          action={
            <>
              <Button variant="secondary" onClick={newNote}>New note</Button>
              <Button variant="ghost" onClick={() => setIsPicking(true)}>Link existing note</Button>
            </>
          }
        />
      );
    }
    if (isGraph) return <NoteGraph key={project.id} project={project} notes={visible} onOpenNote={selectNote} />;
    return (
      <NoteList
        notes={visible}
        hiddenCount={linked.length - visible.length}
        onShowAll={() => setShowAll(true)}
        onOpenNote={selectNote}
        onUnlink={unlinkNote}
      />
    );
  };

  return (
    <SectionCard
      icon={Network}
      title="Notes"
      titleAs="h2"
      count={linked.length}
      action={actions}
      className={styles.card}
      bodyClassName={styles.body}
    >
      {renderBody()}
      <NotePicker open={isPicking} notes={unlinked} onPick={linkNote} onClose={() => setIsPicking(false)} />
    </SectionCard>
  );
}
