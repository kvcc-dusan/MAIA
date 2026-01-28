import React, { useEffect, useMemo, useRef, useState } from "react";

// Components
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Home from "./components/Home.jsx";
import NotesOverview from "./components/NotesOverview.jsx";
import PulsePage from "./components/PulsePage.jsx";
import Editor from "./components/Editor.jsx";
import Projects from "./components/Projects.jsx";
import GraphView from "./components/GraphView.jsx";
import CanvasBoard from "./components/CanvasBoard.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import { parseContentMeta } from "./lib/parseContentMeta.js";

/* -----------------------------------------
   Small utilities (local to App)
----------------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const isoNow = () => new Date().toISOString();

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// const parseContentMeta = (content) => {
//   const stripped = (content || "").replace(/%%[\s\S]*?%%/g, "");
//   const tags = Array.from(
//     new Set((stripped.match(/(^|\s)#([\w-]+)/g) || []).map((t) => t.trim().slice(1)))
//   );
//   const links = Array.from(
//     new Set((stripped.match(/\[\[(.+?)\]\]/g) || []).map((m) => m.slice(2, -2).trim()))
//   );
//   return { tags, links };
// };

const seedNotes = () => {
  const n1c =
    "# Intro\nThis is the first note. Link to [[Tagging System]].\n\n---\n\n- [ ] task\n- [x] done";
  const n2c =
    "**Bold** _italic_ ==highlight==\n\n> [!info] Callout box.\n\n#tags How I use #meta and #projects.";
  const n3c = "## Goals\n\nSketching ideas.";
  const n1 = {
    id: uid(),
    title: "Introduction to My Notes",
    content: n1c,
    ...parseContentMeta(n1c),
    createdAt: isoNow(),
    project: null,
  };
  const n2 = {
    id: uid(),
    title: "Tagging System",
    content: n2c,
    ...parseContentMeta(n2c),
    createdAt: isoNow(),
    project: null,
  };
  const n3 = {
    id: uid(),
    title: "Long-Term Goals",
    content: n3c,
    ...parseContentMeta(n3c),
    createdAt: isoNow(),
    project: null,
  };
  return [n1, n2, n3];
};

/* -----------------------------------------
   App
----------------------------------------- */
export default function App() {
  // Pages
  const [currentPage, setCurrentPage] = useState("home"); // home | overview | projects | editor | canvas | graph | pulse

  // Notes & Projects
  const [notes, setNotes] = useLocalStorage("maia.notes", seedNotes);
  const [projects, setProjects] = useLocalStorage("maia.projects", []);
  const [currentNoteId, setCurrentNoteId] = useLocalStorage("maia.currentNoteId", null);

  // Tasks & Reminders (for Pulse)
  const [tasks, setTasks] = useLocalStorage("maia.tasks", []);
  const [reminders, setReminders] = useLocalStorage("maia.reminders", []);

  // Search
  const [search, setSearch] = useState("");

  // Sidebar resize (kept for future use)
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const resizing = useRef(false);
  useEffect(() => {
    const onMove = (e) => {
      if (!resizing.current) return;
      const next = Math.min(480, Math.max(180, sidebarWidth + e.movementX));
      setSidebarWidth(next);
    };
    const onUp = () => (resizing.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [sidebarWidth]);

  // Filtered notes
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

  // Note ops
  const createNote = () => {
    const n = {
      id: uid(),
      title: "Untitled",
      content: "",
      tags: [],
      links: [],
      createdAt: isoNow(),
      project: null,
    };
    setNotes([n, ...notes]);
    setCurrentNoteId(n.id);
    setCurrentPage("editor");
  };

  // 👇 Preserve meta (tags/links) provided by the editor; do not recompute here.
  const updateNote = (updated) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
    );
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (currentNoteId === id) setCurrentNoteId(null);
  };

  const renameNote = (id, title) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: title || "" } : n)));
  };

  const moveNoteToProject = (id, name) => {
    if (name && !projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setProjects([...projects, { id: uid(), name: name.trim() }]);
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, project: name || null } : n)));
  };

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

  // Simple toast
  const [toast, setToast] = useState(null);
  const pushToast = (msg) => {
    setToast(msg);
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  /* -----------------------------------------
     Command Palette (⌘K / Ctrl+K)
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

  const go = (page) => setCurrentPage(page);

  const quickAddTask = (title) => {
    const t = (title || "").trim();
    if (!t) return;
    setTasks((prev) => [{ id: uid(), title: t, done: false, createdAt: isoNow(), due: null }, ...prev]);
    pushToast?.("Task added");
  };

  const quickAddReminder = (title) => {
    const t = (title || "").trim();
    if (!t) return;
    const when = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    setReminders((prev) => [{ id: uid(), title: t, scheduledAt: when, createdAt: isoNow(), delivered: false }, ...prev]);
    pushToast?.("Reminder set for +15 min");
  };

  /* -----------------------------------------
     Layout
  ----------------------------------------- */
  return (
    <div
      className="h-screen w-full bg-black text-zinc-200 grid min-h-0"
      style={{ gridTemplateRows: "3rem minmax(0,1fr)" }}   // was "3rem 1fr"
    >
      <Navbar
        search={search}
        setSearch={setSearch}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Columns wrapper */}
      <div className="grid min-h-0" style={{ gridTemplateColumns: "1fr" }}>
        {/* Sidebar (kept commented) */}

        {/* Main content area must allow shrink for inner scroller */}
        <main className="h-full overflow-hidden min-h-0">
          {currentPage === "home" && (
            <Home
              tasks={tasks}
              reminders={reminders}
              onOpenPulse={() => setCurrentPage("pulse")}
            />
          )}

          {currentPage === "overview" && (
            <NotesOverview
              notes={filteredNotes}
              selectNote={selectNote}
              onDelete={deleteNote}
              onRename={renameNote}
              onMove={moveNoteToProject}
              projects={projects}
              onCreateNote={createNote}
              onBack={() => setCurrentPage("home")}
            />
          )}

          {currentPage === "canvas" && (
            <CanvasBoard goHome={() => setCurrentPage("home")} />
          )}

          {currentPage === "projects" && (
  <Projects
    notes={notes}
    projects={projects}
    setProjects={setProjects}
    setNotes={setNotes}          // ← add this
    selectNote={selectNote}
    pushToast={pushToast}        // ← optional (for toasts)
  />
)}

          {currentPage === "editor" && (
            <Editor
              note={currentNote}
              updateNote={updateNote}
              onOpenInternalLink={openInternalByTitle}
              projects={projects} 
            />
          )}

          {currentPage === "graph" && (
            <GraphView notes={notes} onOpenNote={selectNote} />
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
        onCreateNote={createNote}
        go={go}
        quickAddTask={quickAddTask}
        quickAddReminder={quickAddReminder}
      />
    </div>
  );
}
