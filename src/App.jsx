import React, { useEffect, useMemo, useRef, useState } from "react";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";

// Components
import Navbar from "./components/Navbar.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import PulsePage from "./pages/PulsePage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import GraphPage from "./pages/GraphPage.jsx";
import CanvasPage from "./pages/CanvasPage.jsx";
import JournalPage from "./pages/JournalPage.jsx";
import LedgerPage from "./pages/LedgerPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

function AppContent() {
  // Pages
  const [currentPage, setCurrentPage] = useState("home"); // home | overview | projects | editor | canvas | graph | pulse | journal | ledger

  // Data from Context
  const {
    notes, setNotes,
    projects, setProjects,
    journal, setJournal,
    ledger, setLedger,
    tasks, setTasks,
    reminders, setReminders,
    // Actions
    createNote, updateNote, deleteNote, renameNote,
    moveNoteToProject, updateProject, createProject, deleteProject,
    addTask, addReminder
  } = useData();

  // Local state for navigation/selection that doesn't need persistence yet
  // or could be moved to context if we want deep linking later.
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [search, setSearch] = useState("");

  // NOTE: Simple Toast was local to App. 
  // Ideally this moves to a UI Context, but for now we keep it here and pass down.
  const [toast, setToast] = useState(null);
  const pushToast = (msg) => {
    setToast(msg);
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  /* -----------------------------------------
     Derived State
  ----------------------------------------- */
  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [notes, search]);

  const currentNote = useMemo(
    () => notes.find((n) => n.id === currentNoteId) || null,
    [notes, currentNoteId]
  );

  /* -----------------------------------------
     Navigation Helpers
  ----------------------------------------- */
  const selectNote = (id) => {
    setCurrentNoteId(id);
    setCurrentPage("editor");
  };

  const openInternalByTitle = (title) => {
    const norm = (s) => (s || "").trim().toLowerCase();
    const target = notes.find((n) => norm(n.title) === norm(title));
    if (target) {
      setCurrentNoteId(target.id);
      setCurrentPage("editor");
    }
  };

  const go = (page) => setCurrentPage(page);

  // Command Palette Helpers
  const quickAddTask = (title) => {
    addTask(title);
    pushToast("Task added");
  };

  const quickAddReminder = (title) => {
    const when = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    addReminder(title, when);
    pushToast("Reminder set for +15 min");
  };

  const handleCreateNote = () => {
    const id = createNote();
    setCurrentNoteId(id);
    setCurrentPage("editor");
  };

  /* -----------------------------------------
     Keyboard Listener
  ----------------------------------------- */
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* -----------------------------------------
     Layout
  ----------------------------------------- */
  return (
    <div
      className="h-screen w-full bg-black text-zinc-200 grid min-h-0"
      style={{ gridTemplateRows: "3rem minmax(0,1fr)" }}
    >
      <Navbar
        search={search}
        setSearch={setSearch}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Main Content */}
      <div className="grid min-h-0" style={{ gridTemplateColumns: "1fr" }}>
        <main className="h-full overflow-hidden min-h-0">
          {currentPage === "journal" && (
            <JournalPage journal={journal} setJournal={setJournal} />
          )}

          {currentPage === "ledger" && (
            <LedgerPage ledger={ledger} setLedger={setLedger} />
          )}

          {currentPage === "review" && (
            <ReviewPage
              notes={notes}
              projects={projects}
              journal={journal}
              setJournal={setJournal}
              pushToast={pushToast}
            />
          )}

          {currentPage === "home" && (
            <HomePage
              tasks={tasks}
              reminders={reminders}
              onOpenPulse={() => setCurrentPage("pulse")}
            />
          )}

          {currentPage === "overview" && (
            <NotesPage
              notes={filteredNotes}
              selectNote={selectNote}
              onDelete={deleteNote}
              onRename={renameNote}
              onMove={moveNoteToProject}
              projects={projects}
              onCreateNote={handleCreateNote}
              onBack={() => setCurrentPage("home")}
            />
          )}

          {currentPage === "canvas" && (
            <CanvasPage goHome={() => setCurrentPage("home")} />
          )}

          {currentPage === "projects" && (
            <ProjectsPage
              notes={notes}
              projects={projects}
              setProjects={setProjects}
              setNotes={setNotes}
              selectNote={selectNote}
              pushToast={pushToast}
            />
          )}

          {currentPage === "editor" && (
            <EditorPage
              note={currentNote}
              updateNote={updateNote}
              onOpenInternalLink={openInternalByTitle}
              projects={projects}
            />
          )}

          {currentPage === "graph" && (
            <GraphPage notes={notes} onOpenNote={selectNote} />
          )}

          {currentPage === "pulse" && (
            <PulsePage
              tasks={tasks}
              setTasks={setTasks}
              reminders={reminders}
              setReminders={setReminders}
              pushToast={pushToast}
              goBack={() => setCurrentPage("overview")}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm">
            {toast}
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        notes={notes}
        onOpenNote={(id) => selectNote(id)}
        onCreateNote={handleCreateNote}
        go={go}
        quickAddTask={quickAddTask}
        quickAddReminder={quickAddReminder}
      />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
