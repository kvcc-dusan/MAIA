import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";
import { rescheduleAll } from "./utils/notify.js";
import { downloadBackup, readBackupFile } from "./lib/backup.js";
import { isTauri as isTauriRuntime } from "./lib/vault.js";

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

import ChronosModal from "./features/Chronos/ChronosModal.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import GlassSkeleton from "./components/GlassSkeleton.jsx";
import { GlassErrorBoundary } from "./components/GlassErrorBoundary.jsx";
import VaultSetup from "./components/VaultSetup.jsx";
import { ConfirmDialog } from "./components/composed/ConfirmDialog.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import { MotionConfig } from "framer-motion";

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
    moveNoteToProject, toggleTask
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


  // Modals
  const [chronosOpen, setChronosOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  /* -----------------------------------------
     Backup — export/import (STATE_OF_MAIA.md P0 #4: no export path existed)
  ----------------------------------------- */
  const importFileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null); // parsed backup awaiting confirmation

  const handleExportBackup = useCallback(async () => {
    try {
      const wrote = await downloadBackup({ notes, projects, tasks, reminders, sessions, ledger });
      if (wrote) toast.success("Backup saved.");
    } catch (e) {
      console.error("[MAIA] Export failed", e);
      toast.error(`Export failed: ${e.message || e}`);
    }
  }, [notes, projects, tasks, reminders, sessions, ledger]);

  const applyImport = useCallback((backup) => {
    setNotes(backup.data.notes);
    setProjects(backup.data.projects);
    setTasks(backup.data.tasks);
    setReminders(backup.data.reminders);
    setSessions(backup.data.sessions);
    setLedger(backup.data.ledger);
    setPendingImport(null);
    toast.success("Data restored from backup.");
  }, [setNotes, setProjects, setTasks, setReminders, setSessions, setLedger]);

  const handleImportBackup = useCallback(async () => {
    try {
      let backup;
      if (isTauriRuntime()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({
          multiple: false,
          filters: [{ name: "MAIA Backup", extensions: ["json"] }],
        });
        if (!path) return;
        backup = await readBackupFile(path);
      } else {
        importFileInputRef.current?.click();
        return; // handleImportFileChange takes it from here
      }
      setPendingImport(backup);
    } catch (e) {
      console.error("[MAIA] Import failed", e);
      toast.error(`Couldn't read that backup: ${e.message || e}`);
    }
  }, []);

  const handleImportFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      setPendingImport(backup);
    } catch (err) {
      console.error("[MAIA] Import failed", err);
      toast.error(`Couldn't read that backup: ${err.message || err}`);
    }
  }, []);

  const importCounts = pendingImport
    ? Object.entries(pendingImport.data).map(([k, v]) => `${v.length} ${k}`).join(", ")
    : "";

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
        // Toggle, not open-only — ⌘K to dismiss is muscle memory, and the
        // dock button was the sole closer before.
        setCmdOpen((prev) => !prev);
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
    // reducedMotion="user" makes every motion.* component honor the OS
    // reduced-motion setting (transforms collapse, opacity stays) — the
    // stylesheet media query in surfaces.css covers the CSS-driven motion.
    <MotionConfig reducedMotion="user">
    <div
      className="w-full bg-background text-foreground grid min-h-0 relative"
      style={{ gridTemplateRows: "1fr", height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Vault picker / loading gate (Tauri only) */}
      <VaultSetup />

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
          { icon: Search01, label: "Search ⌘K", onClick: () => handleOpenTool("search"), isActive: cmdOpen }
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
                  sessions={sessions}
                  reminders={reminders}
                  createNote={createNote}
                  toggleTask={toggleTask}
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
        />
      )}

      {/* Toasts. Sonner owns queueing, dismissal and stacking; the previous
          hand-rolled version was single-slot, had no dismiss control, and sat
          at z-60 — below every modal, so validation toasts fired from inside
          Chronos rendered behind it. */}
      <Toaster
        position="bottom-center"
        offset={`calc(var(--dock-h) + 0.75rem)`}
      />

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
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Web-build import path: Tauri uses its native file picker instead */}
      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <ConfirmDialog
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onConfirm={() => pendingImport && applyImport(pendingImport)}
        title="Replace all data with this backup?"
        description={
          pendingImport
            ? `This backup has ${importCounts}${pendingImport.exportedAt ? `, exported ${new Date(pendingImport.exportedAt).toLocaleString()}` : ""}. Everything currently in MAIA will be replaced — this can't be undone.`
            : ""
        }
        confirmLabel="Replace data"
        tone="danger"
      />
    </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <DataProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </DataProvider>
  );
}
