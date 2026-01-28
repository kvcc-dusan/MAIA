import React, { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { uid, isoNow } from "../lib/ids.js";
import { parseContentMeta } from "../lib/parseContentMeta.js";

const DataContext = createContext(null);

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

export function DataProvider({ children }) {
    // Notes & Projects
    const [notes, setNotes] = useLocalStorage("maia.notes", seedNotes);
    const [projects, setProjects] = useLocalStorage("maia.projects", []);

    // Strategic Journal
    const [journal, setJournal] = useLocalStorage("maia.journal", []);

    // Decision Ledger
    const [ledger, setLedger] = useLocalStorage("maia.ledger", []);

    // Tasks & Reminders
    const [tasks, setTasks] = useLocalStorage("maia.tasks", []);
    const [reminders, setReminders] = useLocalStorage("maia.reminders", []);

    // --- Actions ---

    // Notes
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
        return n.id;
    };

    const updateNote = (updated) => {
        setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
        );
    };

    const deleteNote = (id) => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
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

    const addProjectToNote = (noteId, projectId) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== noteId) return n;
            const ids = Array.from(new Set([...(n.projectIds || []), projectId]));
            return { ...n, projectIds: ids };
        }));
    };

    const removeProjectFromNote = (noteId, projectId) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== noteId) return n;
            const ids = (n.projectIds || []).filter(id => id !== projectId);
            return { ...n, projectIds: ids };
        }));
    };

    // Projects
    const updateProject = (id, patch) => {
        setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
    };

    const deleteProject = (id) => {
        // Logic from Projects.jsx regarding checking notes membership could be moved here or kept in UI
        // For now, raw delete
        setProjects((prev) => prev.filter((p) => p.id !== id));
    };

    const createProject = (name) => {
        const p = {
            id: uid(),
            name: name || "Untitled",
            emoji: "📁",
            status: "Active",
            createdAt: isoNow(),
            description: "",
        };
        setProjects([p, ...projects]);
        return p;
    };

    // Tasks
    const addTask = (title, due = null, desc = "") => {
        if (!title.trim()) return;
        setTasks((prev) => [
            { id: uid(), title: title.trim(), desc, done: false, createdAt: isoNow(), due },
            ...prev,
        ]);
    };

    // Reminders
    const addReminder = (title, scheduledAt) => {
        if (!title.trim()) return;
        setReminders((prev) => [{ id: uid(), title: title.trim(), scheduledAt, createdAt: isoNow(), delivered: false }, ...prev]);
    };

    const value = useMemo(() => ({
        notes, setNotes,
        projects, setProjects,
        journal, setJournal,
        ledger, setLedger,
        tasks, setTasks,
        reminders, setReminders,
        // Actions
        createNote, updateNote, deleteNote, renameNote, moveNoteToProject,
        addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject,
        addTask, addReminder
    }), [notes, projects, journal, ledger, tasks, reminders]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
    return useContext(DataContext);
}
