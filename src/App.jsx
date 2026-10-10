import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

// Context
import { DataProvider, useData } from "./context/DataContext.jsx";
import { rescheduleAll } from "./utils/notify.js";
import { downloadBackup, readBackupFile } from "./lib/backup.js";
import { isTauri as isTauriRuntime } from "./lib/vault.js";

// Components
import { MaiaShell } from "./components/shell/MaiaShell.jsx";
import CodexPage from "./features/Codex/CodexPage.jsx";
import { useCodexTabs } from "./features/Codex/useCodexTabs.js";
import { useNavHistory } from "./hooks/useNavHistory.js";

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
import ProjectsPage from "./pages/ProjectsPage.jsx";


// Lazy loaded heavy pages
const GraphPage = React.lazy(() => import("./features/Graph/pages/GraphPage.jsx"));

const PAGES = ["codex", "projects", "graph"];
// Codex used to be two pages; old stored values land on the merged one.
const LEGACY_PAGES = { overview: "codex", editor: "codex" };
// A fresh install, or a stored page that no longer exists, opens on Opus.
const DEFAULT_PAGE = "projects";

function AppContent() {
  // Pages
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = localStorage.getItem("maia_current_view");
    const page = LEGACY_PAGES[stored] ?? stored;
    return PAGES.includes(page) ? page : DEFAULT_PAGE;
  });

  useEffect(() => {
    localStorage.setItem("maia_current_view", currentPage);
  }, [currentPage]);

  // Data from Context
  const {
    notes, setNotes, notesMeta,
    projects, setProjects,
    ledger, setLedger,
    tasks, setTasks,
    reminders, setReminders,
    sessions, setSessions,
    activity, setActivity,
    // Actions
    createNote, updateNote, deleteNote, deleteAllNotes, renameNote,
    moveNoteToProject, toggleTask
  } = useData();

  // Local state for navigation/selection
  const codex = useCodexTabs({ notes, isReady: notesMeta.status === "ready" });
  const { activeNoteId, openNote, openNotesView } = codex;
  const [activeProjectId, _setActiveProjectId] = useState(() => localStorage.getItem("maia_current_project") || null);
  const setActiveProjectId = useCallback((id) => {
    _setActiveProjectId(id);
    if (id) localStorage.setItem("maia_current_project", id);
    else localStorage.removeItem("maia_current_project");
  }, []);

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
      const wrote = await downloadBackup({ notes, projects, tasks, reminders, sessions, ledger, activity });
      if (wrote) toast.success("Backup saved.");
    } catch (e) {
      console.error("[MAIA] Export failed", e);
      toast.error(`Export failed: ${e.message || e}`);
    }
  }, [notes, projects, tasks, reminders, sessions, ledger, activity]);

  const applyImport = useCallback((backup) => {
    setNotes(backup.data.notes);
    setProjects(backup.data.projects);
    setTasks(backup.data.tasks);
    setReminders(backup.data.reminders);
    setSessions(backup.data.sessions);
    setLedger(backup.data.ledger);
    // Older backups carry no activity; parseBackup gives [] so a restore never
    // keeps log entries that point at items the restored data no longer has.
    setActivity(backup.data.activity);
    setPendingImport(null);
    toast.success("Data restored from backup.");
  }, [setNotes, setProjects, setTasks, setReminders, setSessions, setLedger, setActivity]);

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
     Navigation Helpers (Memoized)
  ----------------------------------------- */
  const selectItem = useCallback((id, type = "note") => {
    if (type === "project") {
      setActiveProjectId(id);
      setCurrentPage("projects");
    } else {
      openNote(id);
      setCurrentPage("codex");
    }
  }, [setActiveProjectId, openNote]);

  const openInternalByTitle = useCallback((title) => {
    const norm = (s) => (s || "").trim().toLowerCase();
    const target = notes.find((n) => norm(n.title) === norm(title));
    if (target) {
      openNote(target.id);
      setCurrentPage("codex");
    }
  }, [notes, openNote]);

  const go = useCallback((page) => setCurrentPage(page), []);

  const handleCreateNote = useCallback(() => {
    const id = createNote();
    openNote(id);
    setCurrentPage("codex");
  }, [createNote, openNote]);

  const handleCreateJournal = useCallback(() => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const id = createNote({
      title: `Journal — ${dateStr}`,
      tags: ["journal"]
    });
    openNote(id);
    setCurrentPage("codex");
  }, [createNote, openNote]);

  // Handlers for shell/modals
  // Opus picks its first project a render after it opens; don't record that gap.
  const opusResolving = currentPage === "projects" && !activeProjectId && projects.length > 0;
  const history = useNavHistory(
    opusResolving
      ? null
      : {
          page: currentPage,
          projectId: currentPage === "projects" ? activeProjectId : null,
          noteId: currentPage === "codex" ? activeNoteId : null,
        },
    useCallback((loc) => {
      setCurrentPage(loc.page);
      if (loc.projectId) setActiveProjectId(loc.projectId);
      if (loc.page !== "codex") return;
      // A null note on the Codex page means its notes or new tab was active.
      if (loc.noteId) openNote(loc.noteId);
      else openNotesView();
    }, [setActiveProjectId, openNote, openNotesView])
  );
  const handleToggleSearch = useCallback(() => setCmdOpen((prev) => !prev), []);
  const handleOpenPalette = useCallback(() => setCmdOpen(true), []);

  const handleOpenPulse = useCallback(() => setChronosOpen(true), []);
  const handleCloseChronos = useCallback(() => setChronosOpen(false), []);

  const handleCreateProject = useCallback(() => {
    setCurrentPage("projects");
    setTimeout(() => setProjectModalOpen(true), 10);
  }, []);

  /* -----------------------------------------
     Keyboard Listener
  ----------------------------------------- */
  const [cmdOpen, setCmdOpen] = useState(false);
  const handleCloseCmd = useCallback(() => setCmdOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Toggle, not open-only — ⌘K to dismiss is muscle memory.
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

      <MaiaShell
        currentPage={currentPage}
        onNavigate={go}
        onOpenChronos={handleOpenPulse}
        onToggleSearch={handleToggleSearch}
        history={history}
      >
        <GlassErrorBoundary>
          <React.Suspense fallback={<GlassSkeleton />}>


            {currentPage === "codex" && (
              <CodexPage
                codex={codex}
                notes={notes}
                projects={projects}
                updateNote={updateNote}
                onDelete={deleteNote}
                onDeleteAll={deleteAllNotes}
                onRename={renameNote}
                onMove={moveNoteToProject}
                onCreateNote={handleCreateNote}
                onCreateJournal={handleCreateJournal}
                onOpenInternalLink={openInternalByTitle}
                onOpenPalette={handleOpenPalette}
              />
            )}

            {currentPage === "projects" && (
              <ProjectsPage
                notes={notes}
                projects={projects}
                setProjects={setProjects}
                setNotes={setNotes}
                selectNote={selectItem}
                activeProjectId={activeProjectId}
                onSelectProject={setActiveProjectId}
                isCreateModalOpen={projectModalOpen}
                setCreateModalOpen={setProjectModalOpen}
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
      </MaiaShell>

      {/* Global Modals */}
      {chronosOpen && (
        <ChronosModal
          onClose={handleCloseChronos}
          tasks={tasks}
          setTasks={setTasks}
          toggleTask={toggleTask}
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
      <Toaster position="bottom-center" />

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
