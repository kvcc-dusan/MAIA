import React, { useEffect } from "react";
import { ShellSidebar, ShellTopBar } from "@/components/shell/ShellContext";
import NotesPage from "@/pages/NotesPage.jsx";
import EditorPage from "@/pages/EditorPage.jsx";
import CodexTabStrip from "./components/CodexTabStrip.jsx";
import NewTabPage from "./components/NewTabPage.jsx";
import NotesSidebar from "./components/NotesSidebar.jsx";

// Shortcuts are not text-editing commands, so they work from the editor too.
// A dialog (including the palette) owns the keyboard while it is open.
const useCodexShortcuts = ({ onCreateNote, onOpenPalette }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.repeat) return;
      const key = e.key.toLowerCase();
      if (key !== "n" && key !== "o") return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      if (key === "n") onCreateNote();
      else onOpenPalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCreateNote, onOpenPalette]);
};

/**
 * The Codex rail page: a tab strip in the shell top bar, the notes list in the
 * shell sidebar, and the active tab's content (cards, editor or new-tab page).
 * `codex` is the useCodexTabs result; App owns it so navigation history and
 * palette actions can open notes.
 */
export default function CodexPage({
  codex,
  notes,
  projects,
  updateNote,
  onDelete,
  onDeleteAll,
  onRename,
  onMove,
  onCreateNote,
  onCreateJournal,
  onOpenInternalLink,
  onOpenPalette,
}) {
  const { tabs, activeTab, activeNoteId, openNote, activate, close, newTab, openNotesView } = codex;
  useCodexShortcuts({ onCreateNote, onOpenPalette });

  const renderContent = () => {
    if (activeTab.kind === "note") {
      const note = notes.find((n) => n.id === activeTab.noteId) ?? null;
      // The note may arrive after the tab (vault still loading); remount when it does.
      return (
        <EditorPage
          key={`${activeTab.noteId}:${note ? "loaded" : "pending"}`}
          note={note}
          notes={notes}
          updateNote={updateNote}
          onDelete={onDelete}
          onOpenInternalLink={onOpenInternalLink}
          projects={projects}
        />
      );
    }
    if (activeTab.kind === "new") {
      return (
        <NewTabPage
          onCreateNote={onCreateNote}
          onCreateJournal={onCreateJournal}
          onOpenNotesView={openNotesView}
          onGoToFile={onOpenPalette}
        />
      );
    }
    return (
      <NotesPage
        notes={notes}
        selectNote={openNote}
        onDelete={onDelete}
        onDeleteAll={onDeleteAll}
        onRename={onRename}
        onMove={onMove}
        projects={projects}
        onCreateNote={onCreateNote}
        onCreateJournal={onCreateJournal}
      />
    );
  };

  return (
    <>
      <ShellTopBar>
        <CodexTabStrip
          tabs={tabs}
          activeId={activeTab.id}
          notes={notes}
          onActivate={activate}
          onClose={close}
          onNewTab={newTab}
        />
      </ShellTopBar>
      <ShellSidebar>
        <NotesSidebar
          notes={notes}
          currentNoteId={activeNoteId}
          onOpenNote={openNote}
          onCreateNote={onCreateNote}
          onCreateJournal={onCreateJournal}
        />
      </ShellSidebar>
      {renderContent()}
    </>
  );
}
