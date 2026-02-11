import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { uid, isoNow } from "../lib/ids.js";
import { parseContentMeta } from "../lib/parseContentMeta.js";
import { generateDummyData } from "../utils/dummyData.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
    // Notes & Projects
    const [notes, setNotes] = useLocalStorage("maia.notes", []);
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
            projectIds: [],
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

    const deleteAllNotes = useCallback(() => {
        setNotes([]);
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

    const generateSamples = useCallback(() => {
        const { projects: newProjects, notes: newNotes } = generateDummyData();
        setProjects(newProjects);
        setNotes(newNotes);
    }, [setProjects, setNotes]);

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
        createNote, updateNote, deleteNote, deleteAllNotes, renameNote, moveNoteToProject,
        addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject,
        addTask, toggleTask, addReminder,
        generateSamples
    }), [
        notes, setNotes, projects, setProjects, journal, setJournal, ledger, setLedger, tasks, setTasks, reminders, setReminders, sessions, setSessions,
        createNote, updateNote, deleteNote, deleteAllNotes, renameNote, moveNoteToProject, addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject, addTask, toggleTask, addReminder,
        generateSamples
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
    return useContext(DataContext);
}
