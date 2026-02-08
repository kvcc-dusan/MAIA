import React, { createContext, useContext, useMemo, useCallback } from "react";
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
    const [sessions, setSessions] = useLocalStorage("maia.sessions", []);

    // --- Actions ---

    // Notes
    const createNote = useCallback(() => {
        const n = {
            id: uid(),
            title: "Untitled",
            content: "",
            tags: [],
            links: [],
            createdAt: isoNow(),
            project: null,
        };
        setNotes((prev) => [n, ...prev]);
        return n.id;
    }, [setNotes]);

    const updateNote = useCallback((updated) => {
        setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
        );
    }, [setNotes]);

    const deleteNote = useCallback((id) => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
    }, [setNotes]);

    const renameNote = useCallback((id, title) => {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: title || "" } : n)));
    }, [setNotes]);

    const moveNoteToProject = useCallback((id, name) => {
        setProjects(prevProjects => {
            if (name && !prevProjects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
                return [...prevProjects, { id: uid(), name: name.trim() }];
            }
            return prevProjects;
        });
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, project: name || null } : n)));
    }, [setProjects, setNotes]);

    const addProjectToNote = useCallback((noteId, projectId) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== noteId) return n;
            const ids = Array.from(new Set([...(n.projectIds || []), projectId]));
            return { ...n, projectIds: ids };
        }));
    }, [setNotes]);

    const removeProjectFromNote = useCallback((noteId, projectId) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== noteId) return n;
            const ids = (n.projectIds || []).filter(id => id !== projectId);
            // Also clear legacy 'project' field if it matches (we can't easily check name matching here without project name, 
            // but usually valid to just clear 'project' if we are explicitly unlinking). 
            // However, to be safe, we should probably just clear it or we need the project object.
            // Let's just clear it if it exists to be safe, assuming the user intention is "Unlink". 
            // Or better, checking if we still need it. 
            // Since we don't have project name here, we will just nullify `project` if it exists, 
            // effectively migrating it to `projectIds` (which is empty now for this project).
            return { ...n, projectIds: ids, project: null };
        }));
    }, [setNotes]);

    // Projects
    const updateProject = useCallback((id, patch) => {
        setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
    }, [setProjects]);

    const deleteProject = useCallback((id) => {
        // Cascade: Remove this project ID from all notes
        setNotes((prev) => prev.map(n => {
            if (n.projectIds && n.projectIds.includes(id)) {
                return { ...n, projectIds: n.projectIds.filter(pid => pid !== id) };
            }
            return n;
        }));
        setProjects((prev) => prev.filter((p) => p.id !== id));
    }, [setProjects, setNotes]);

    const createProject = useCallback((name) => {
        const p = {
            id: uid(),
            name: name || "Untitled",
            emoji: "📁",
            status: "Active",
            createdAt: isoNow(),
            description: "",
            // OPUS Fields
            objective: "",
            successCriteria: [], // { id, text, done }
            pinnedNoteIds: [],
            links: [], // { id, title, url, type }
            milestones: [], // { id, title, date, done }
        };
        setProjects((prev) => [p, ...prev]);
        return p;
    }, [setProjects]);

    // Tasks
    const addTask = useCallback((title, due = null, desc = "", projectId = null) => {
        if (!title.trim()) return;
        setTasks((prev) => [
            { id: uid(), title: title.trim(), desc, done: false, createdAt: isoNow(), due, projectId: projectId || null },
            ...prev,
        ]);
    }, [setTasks]);

    // Reminders
    const addReminder = useCallback((title, scheduledAt) => {
        if (!title.trim()) return;
        setReminders((prev) => [{ id: uid(), title: title.trim(), scheduledAt, createdAt: isoNow(), delivered: false }, ...prev]);
    }, [setReminders]);

    const toggleTask = useCallback((id) => {
        setTasks((prev) => prev.map((t) => {
            if (t.id !== id) return t;
            const isDone = !t.done;
            return {
                ...t,
                done: isDone,
                completedAt: isDone ? isoNow() : null
            };
        }));
    }, [setTasks]);

    const value = useMemo(() => ({
        notes, setNotes,
        projects, setProjects,
        journal, setJournal,
        ledger, setLedger,
        tasks, setTasks,
        reminders, setReminders,
        sessions, setSessions,
        // Actions
        createNote, updateNote, deleteNote, renameNote, moveNoteToProject,
        addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject,
        addTask, toggleTask, addReminder
    }), [
        notes, setNotes, projects, setProjects, journal, setJournal, ledger, setLedger, tasks, setTasks, reminders, setReminders, sessions, setSessions,
        createNote, updateNote, deleteNote, renameNote, moveNoteToProject, addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject, addTask, toggleTask, addReminder
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
    return useContext(DataContext);
}
