import React, { useEffect, useMemo, useRef, useState } from "react";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";

// Components
import Dock from "./components/Dock.jsx";
import ChronosModal from "./components/ChronosModal.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import DecisionLedger from "./components/DecisionLedger.jsx";
import GlassSurface from "./components/GlassSurface.jsx";
import GlassSkeleton from "./components/GlassSkeleton.jsx";

// Pages
// Pages
import HomePage from "./pages/HomePage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
// import PulsePage from "./pages/PulsePage.jsx"; // Refactored to ChronosModal
import EditorPage from "./pages/EditorPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

// Lazy loaded heavy pages
const GraphPage = React.lazy(() => import("./pages/GraphPage.jsx"));
const CanvasPage = React.lazy(() => import("./pages/CanvasPage.jsx"));
const JournalPage = React.lazy(() => import("./pages/JournalPage.jsx"));

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
  const [targetProjectId, setTargetProjectId] = useState(null);
  const [search, setSearch] = useState("");

  // NOTE: Simple Toast was local to App. 
  // Ideally this moves to a UI Context, but for now we keep it here and pass down.
  const [toast, setToast] = useState(null);
  const pushToast = (msg) => {
    setToast(msg);
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  // Chronos (Pulse) is now a global modal tool
  // Chronos (Pulse) is now a global modal tool
  const [chronosOpen, setChronosOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  // Project (Opus) Creation Modal - Lifted to App level for Action Center access
  const [projectModalOpen, setProjectModalOpen] = useState(false);

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
  const selectItem = (id, type = "note") => {
    if (type === "project") {
      setTargetProjectId(id);
      setCurrentPage("projects");
    } else {
      setCurrentNoteId(id);
      setCurrentPage("editor");
    }
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
      className="h-screen w-full bg-black text-zinc-200 grid min-h-0 relative"
      style={{ gridTemplateRows: "1fr" }} // Full height for content, Dock is floating
    >
      {/* Dock (Floating Navigation) */}
      <Dock
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        onOpenTool={(tool) => {
          if (tool === "chronos") setChronosOpen(true);
          if (tool === "search") setCmdOpen(true);
          if (tool === "ledger") setLedgerOpen(true);
        }}
      />

      {/* Main Content */}
      <div className="grid min-h-0" style={{ gridTemplateColumns: "1fr" }}>
        <main className="h-full overflow-hidden min-h-0 relative">
          {/* Background noise/gradient could go here if global */}

          <React.Suspense fallback={<GlassSkeleton />}>
            {currentPage === "journal" && (
              <JournalPage
                journal={journal}
                setJournal={setJournal}
                ledger={ledger}
                setLedger={setLedger}
                onOpenLedger={() => setLedgerOpen(true)}
              />
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
                onOpenPulse={() => setChronosOpen(true)}
              />
            )}

            {currentPage === "overview" && (
              <NotesPage
                notes={filteredNotes}
                selectNote={selectItem}
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
                selectNote={selectItem}
                targetProjectId={targetProjectId}
                pushToast={pushToast}
                // Lifted Project Creation State
                isCreateModalOpen={projectModalOpen}
                setCreateModalOpen={setProjectModalOpen}
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
              <GraphPage
                notes={notes}
                projects={projects}
                setNotes={setNotes}
                setProjects={setProjects}
                onOpenNote={selectItem}
              />
            )}
          </React.Suspense>
        </main>
      </div>

      {/* Global Modals */}
      {chronosOpen && (
        <ChronosModal
          onClose={() => setChronosOpen(false)}
          tasks={tasks}
          setTasks={setTasks}
          reminders={reminders}
          setReminders={setReminders}
          pushToast={pushToast}
        />
      )}

      {/* Decision Ledger Modal */}
      {ledgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[85vh]">
            <GlassSurface className="h-full w-full p-6 relative flex flex-col">
              <button
                onClick={() => setLedgerOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-10"
              >
                ✕
              </button>
              <DecisionLedger ledger={ledger} setLedger={setLedger} />
            </GlassSurface>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4">
          <div className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {toast}
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        notes={notes}
        onOpenNote={(id) => selectItem(id)}
        onCreateNote={handleCreateNote}
        onCreateProject={() => {
          setCurrentPage("projects");
          setTimeout(() => setProjectModalOpen(true), 10); // Slight delay to ensure mount
        }}
        go={go}
        // quickAddTask={quickAddTask} // Removed prompt-based
        // quickAddReminder={quickAddReminder} // Removed prompt-based
        onOpenCronos={() => setChronosOpen(true)}
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
