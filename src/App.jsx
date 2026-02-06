import React, { useEffect, useMemo, useState, useCallback } from "react";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";

// Components
import { Dock } from "./components/ui/dock.jsx";
import {
  Home as HomeIcon,
  Sparkles,
  Library,
  Globe,
  BookOpen,
  Hourglass,
  Search
} from "lucide-react";

import ChronosModal from "./components/ChronosModal.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import DecisionLedger from "./components/DecisionLedger.jsx";
import GlassSurface from "./components/GlassSurface.jsx";
import GlassSkeleton from "./components/GlassSkeleton.jsx";
import { GlassErrorBoundary } from "./components/GlassErrorBoundary.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

// Lazy loaded heavy pages
const GraphPage = React.lazy(() => import("./features/Graph/pages/GraphPage.jsx"));
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
    moveNoteToProject
  } = useData();

  // Local state for navigation/selection that doesn't need persistence yet
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [targetProjectId, setTargetProjectId] = useState(null);
  const [search] = useState("");

  // Toast
  const [toast, setToast] = useState(null);
  const pushToast = useCallback((msg) => {
    setToast(msg);
    // Clear previous timeout if any - storing ID on the function itself is a bit hacky in functional comp but works if ref is used.
    // Better to just let it be or use a ref.
    // Simplest: just set timeout. If overlap, multiple toasts might flicker or clear early. Acceptable for now.
    setTimeout(() => setToast(null), 2200);
  }, []);

  // Modals
  const [chronosOpen, setChronosOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
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
     Navigation Helpers (Memoized)
  ----------------------------------------- */
  const selectItem = useCallback((id, type = "note") => {
    if (type === "project") {
      setTargetProjectId(id);
      setCurrentPage("projects");
    } else {
      setCurrentNoteId(id);
      setCurrentPage("editor");
    }
  }, []);

  const openInternalByTitle = useCallback((title) => {
    const norm = (s) => (s || "").trim().toLowerCase();
    const target = notes.find((n) => norm(n.title) === norm(title));
    if (target) {
      setCurrentNoteId(target.id);
      setCurrentPage("editor");
    }
  }, [notes]);

  const go = useCallback((page) => setCurrentPage(page), []);

  const handleCreateNote = useCallback(() => {
    const id = createNote();
    setCurrentNoteId(id);
    setCurrentPage("editor");
  }, [createNote]);

  // Handlers for Dock/Modals
  const handleNavigate = useCallback((page) => setCurrentPage(page), []);
  const handleOpenTool = useCallback((tool) => {
    if (tool === "chronos") setChronosOpen(true);
    if (tool === "search") setCmdOpen((prev) => !prev);
    if (tool === "ledger") setLedgerOpen(true);
  }, []);

  const handleOpenPulse = useCallback(() => setChronosOpen(true), []);
  const handleOpenLedger = useCallback(() => setLedgerOpen(true), []);
  const handleCloseChronos = useCallback(() => setChronosOpen(false), []);
  const handleCloseLedger = useCallback(() => setLedgerOpen(false), []);

  const handleCreateProject = useCallback(() => {
    setCurrentPage("projects");
    setTimeout(() => setProjectModalOpen(true), 10);
  }, []);

  const handleGoHome = useCallback(() => setCurrentPage("home"), []);

  /* -----------------------------------------
     Keyboard Listener
  ----------------------------------------- */
  const [cmdOpen, setCmdOpen] = useState(false);
  const handleCloseCmd = useCallback(() => setCmdOpen(false), []);

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
      style={{ gridTemplateRows: "1fr" }}
    >
      {/* Dock (Floating Navigation) */}
      {/* Dock (Floating Navigation) */}
      <Dock
        items={[
          { icon: HomeIcon, label: "Home", onClick: () => handleNavigate("home"), isActive: currentPage === "home" },
          { icon: Sparkles, label: "Opus", onClick: () => handleNavigate("projects"), isActive: currentPage === "projects" },
          { icon: Library, label: "Codex", onClick: () => handleNavigate("overview"), isActive: currentPage === "overview" },
          { icon: Globe, label: "Conexa", onClick: () => handleNavigate("graph"), isActive: currentPage === "graph" },
          { icon: BookOpen, label: "Journal", onClick: () => handleNavigate("journal"), isActive: currentPage === "journal" },
          { type: 'separator' },
          { icon: Hourglass, label: "Chronos", onClick: () => handleOpenTool("chronos"), isActive: chronosOpen },
          { icon: Search, label: "Search", onClick: () => handleOpenTool("search"), isActive: cmdOpen }
        ]}
      />

      {/* Main Content */}
      <div className="grid min-h-0" style={{ gridTemplateColumns: "1fr" }}>
        <main className="h-full overflow-hidden min-h-0 relative">
          <GlassErrorBoundary>
            <React.Suspense fallback={<GlassSkeleton />}>
              {currentPage === "journal" && (
                <JournalPage
                  journal={journal}
                  setJournal={setJournal}
                  ledger={ledger}
                  setLedger={setLedger}
                  onOpenLedger={handleOpenLedger}
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
                  onOpenPulse={handleOpenPulse}
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
                  onBack={handleGoHome}
                />
              )}

              {currentPage === "canvas" && (
                <CanvasPage goHome={handleGoHome} />
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
                  isCreateModalOpen={projectModalOpen}
                  setCreateModalOpen={setProjectModalOpen}
                />
              )}

              {currentPage === "editor" && (
                <EditorPage
                  key={currentNote?.id}
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
          </GlassErrorBoundary>
        </main>
      </div>

      {/* Global Modals */}
      {chronosOpen && (
        <ChronosModal
          onClose={handleCloseChronos}
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
                onClick={handleCloseLedger}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-10"
                aria-label="Close Ledger"
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
        onClose={handleCloseCmd}
        notes={notes}
        onOpenNote={selectItem}
        onCreateNote={handleCreateNote}
        onCreateProject={handleCreateProject}
        go={go}
        onOpenCronos={handleOpenPulse}
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
