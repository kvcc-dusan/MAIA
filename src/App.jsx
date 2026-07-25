import React, { useEffect, useMemo, useState, useCallback } from "react";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";
import { rescheduleAll } from "./utils/notify.js";

// Components
import { Dock } from "./components/ui/dock.jsx";
import {
  Home08,
  Search01,
  OpusIcon,
  CodexIcon,
  ConnexaIcon,
  LedgerIcon,
  ChronosIcon
} from "./components/ui/CustomIcon.jsx";

import ChronosModal from "./components/ChronosModal.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import GlassSkeleton from "./components/GlassSkeleton.jsx";
import { GlassErrorBoundary } from "./components/GlassErrorBoundary.jsx";
import VaultSetup from "./components/VaultSetup.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";

import LedgerPage from "./pages/LedgerPage.jsx";

// Lazy loaded heavy pages
const GraphPage = React.lazy(() => import("./features/Graph/pages/GraphPage.jsx"));

const PAGES = ["home", "overview", "projects", "editor", "graph", "ledgerPage"];

function AppContent() {
  // Pages
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = localStorage.getItem("maia_current_view");
    return PAGES.includes(stored) ? stored : "home";
  });

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
  }, []);

  const handleOpenPulse = useCallback(() => setChronosOpen(true), []);
  const handleCloseChronos = useCallback(() => setChronosOpen(false), []);

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
      className="w-full bg-background text-foreground grid min-h-0 relative"
      style={{ gridTemplateRows: "1fr", height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Vault picker / loading gate (Tauri only) */}
      <VaultSetup />

      {/* Dock (Floating Navigation) */}
      {/* Dock (Floating Navigation) */}
      <Dock
        items={[
          { icon: Home08, label: "Today", onClick: () => handleNavigate("home"), isActive: currentPage === "home" },
          { icon: OpusIcon, label: "Opus", onClick: () => handleNavigate("projects"), isActive: currentPage === "projects" },
          { icon: CodexIcon, label: "Codex", onClick: () => handleNavigate("overview"), isActive: currentPage === "overview" },
          { icon: ConnexaIcon, label: "Conexa", onClick: () => handleNavigate("graph"), isActive: currentPage === "graph" },
          { icon: LedgerIcon, label: "Ledger", onClick: () => handleNavigate("ledgerPage"), isActive: currentPage === "ledgerPage" },
          { type: 'separator' },
          { icon: ChronosIcon, label: "Chronos", onClick: () => handleOpenTool("chronos"), isActive: chronosOpen },
          { icon: Search01, label: "Search", onClick: () => handleOpenTool("search"), isActive: cmdOpen }
        ]}
      />

      {/* Main Content */}
      <div className="grid min-h-0" style={{ gridTemplateColumns: "1fr" }}>
        <main className="h-full overflow-hidden min-h-0 relative pb-(--dock-h) md:pb-0">
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

      {/* Toast */}
      {toast && (
        <div className="fixed z-60 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4"
          style={{ bottom: 'calc(var(--dock-h) + 0.75rem)' }}
        >
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
