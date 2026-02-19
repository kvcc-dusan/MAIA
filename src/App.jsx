import React, { useEffect, useMemo, useState, useCallback } from "react";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";
import { rescheduleAll, ensurePermission } from "./utils/notify.js";

// Components
import { Dock } from "./components/ui/dock.jsx";
import {
  CalendarDays,
  Sparkles,
  Library,
  Globe,
  Scale,
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

import LedgerPage from "./pages/LedgerPage.jsx";

// Lazy loaded heavy pages
const GraphPage = React.lazy(() => import("./features/Graph/pages/GraphPage.jsx"));
const CanvasPage = React.lazy(() => import("./pages/CanvasPage.jsx"));

function AppContent() {
  // Pages
  // Pages
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem("maia_current_view") || "home"); // home | overview | projects | editor | canvas | graph | pulse | journal | ledger | ledgerPage

  useEffect(() => {
    localStorage.setItem("maia_current_view", currentPage);
  }, [currentPage]);

  // Data from Context
  const {
    notes, setNotes,
    projects, setProjects,
    ledger, setLedger,
    tasks, setTasks,
    reminders, setReminders,
    sessions, setSessions,
    // Actions
    createNote, updateNote, deleteNote, deleteAllNotes, renameNote,
    moveNoteToProject
  } = useData();

  // Local state for navigation/selection
  const [currentNoteId, _setCurrentNoteId] = useState(() => localStorage.getItem("maia_current_note_id") || null);
  const setCurrentNoteId = useCallback((id) => {
    _setCurrentNoteId(id);
    if (id) localStorage.setItem("maia_current_note_id", id);
    else localStorage.removeItem("maia_current_note_id");
  }, []);
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

  const handleCreateJournal = useCallback(() => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const id = createNote({
      title: `Journal — ${dateStr}`,
      tags: ["journal"]
    });
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
     Persistent Notifications
  ----------------------------------------- */
  useEffect(() => {
    // Ensure permissions on first user interaction or load if possible, though browsers block auto-request.
    // Rely on ChronosModal to ask permission, but here we just schedule what we have.
    if (reminders && reminders.length > 0) {
      rescheduleAll(reminders);
    }
  }, [reminders]);


  /* -----------------------------------------
     Layout
  ----------------------------------------- */
  return (
    <div
      className="w-full bg-black text-zinc-200 grid min-h-0 relative"
      style={{ gridTemplateRows: "1fr", height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Dock (Floating Navigation) */}
      {/* Dock (Floating Navigation) */}
      <Dock
        items={[
          { icon: CalendarDays, label: "Today", onClick: () => handleNavigate("home"), isActive: currentPage === "home" },
          { icon: Sparkles, label: "Opus", onClick: () => handleNavigate("projects"), isActive: currentPage === "projects" },
          { icon: Library, label: "Codex", onClick: () => handleNavigate("overview"), isActive: currentPage === "overview" },
          { icon: Globe, label: "Conexa", onClick: () => handleNavigate("graph"), isActive: currentPage === "graph" },
          { icon: Scale, label: "Ledger", onClick: () => handleNavigate("ledgerPage"), isActive: currentPage === "ledgerPage" },
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


              {currentPage === "home" && (
                <HomePage
                  tasks={tasks}
                  notes={notes}
                  projects={projects}
                  ledger={ledger}
                  sessions={sessions}
                  reminders={reminders}
                  createNote={createNote}
                  updateNote={updateNote}
                  onOpenPulse={handleOpenPulse}
                  onOpenNote={selectItem}
                />
              )}

              {currentPage === "overview" && (
                <NotesPage
                  notes={filteredNotes}
                  selectNote={selectItem}
                  onDelete={deleteNote}
                  onDeleteAll={deleteAllNotes}
                  onRename={renameNote}
                  onMove={moveNoteToProject}
                  projects={projects}
                  onCreateNote={handleCreateNote}
                  onCreateJournal={handleCreateJournal}
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

              {currentPage === "ledgerPage" && (
                <LedgerPage
                  ledger={ledger}
                  setLedger={setLedger}
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
          sessions={sessions}
          setSessions={setSessions}
          projects={projects}
          pushToast={pushToast}
        />
      )}

      {/* Decision Ledger Modal (secondary access from command palette) */}
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
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4">
          <div className="px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-zinc-200 text-sm shadow-2xl flex items-center gap-2 font-medium">
            {typeof toast === 'string' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {toast}
              </>
            ) : (
              toast
            )}
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
