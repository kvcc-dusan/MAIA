import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useNotesStore } from "../hooks/useNotesStore.js";
import { uid, isoNow } from "../lib/ids.js";
import { generateDummyData } from "../utils/dummyData.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { normalizeTasks } from "../features/Opus/lib/taskModel.js";
import { normalizeProject, normalizeProjects } from "../features/Opus/lib/projectModel.js";
import { useActivityLog } from "./useActivityLog.js";
import { useTaskActions } from "./useTaskActions.js";
import { useProjectCollections } from "./useProjectCollections.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
    // Notes & Projects
    const [notes, setNotes, notesMeta] = useNotesStore();
    const [rawProjects, setProjects] = useLocalStorage(STORAGE_KEYS.PROJECTS, []);
    // Consumers read the normalized view; storage keeps whatever shape was
    // written, so legacy projects are never rewritten just by being read.
    const projects = useMemo(() => normalizeProjects(rawProjects), [rawProjects]);

    // --- One-time migration: clear legacy maia.journal from localStorage ---
    useEffect(() => {
        if (notesMeta.status !== "ready") return; // wait for vault load in Tauri
        try {
            const raw = localStorage.getItem("maia.journal");
            if (raw) {
                const entries = JSON.parse(raw);
                if (Array.isArray(entries) && entries.length > 0) {
                    const migrated = entries.map(entry => ({
                        id: entry.id || uid(),
                        title: `Journal — ${new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
                        content: entry.content || "",
                        tags: [...new Set([...(entry.tags || []), "journal"])],
                        links: [],
                        createdAt: entry.createdAt,
                        project: null,
                        projectIds: [],
                    }));
                    setNotes(prev => [...migrated, ...prev]);
                }
                localStorage.removeItem("maia.journal");
            }
        } catch { /* already migrated or corrupt — ignore */ }
    }, [notesMeta.status]); // Run once notes are loaded

    // Decision Ledger
    const [ledger, setLedger] = useLocalStorage(STORAGE_KEYS.LEDGER, []);

    // Tasks & Reminders
    const [rawTasks, setTasks] = useLocalStorage(STORAGE_KEYS.TASKS, []);
    const tasks = useMemo(() => normalizeTasks(rawTasks), [rawTasks]);
    const [reminders, setReminders] = useLocalStorage(STORAGE_KEYS.REMINDERS, []);
    const [sessions, setSessions] = useLocalStorage(STORAGE_KEYS.SESSIONS, []);
    const { activity, setActivity, logActivity } = useActivityLog();

    // --- Actions ---

    // Notes
    const createNote = useCallback((overrides = {}) => {
        const n = {
            id: uid(),
            title: "Untitled",
            content: "",
            tags: [],
            links: [],
            createdAt: isoNow(),
            project: null,
            projectIds: [],
            ...overrides,
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
        if (!name) {
            // Clear project association
            setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, project: null, projectIds: [] } : n)));
            return;
        }

        setProjects(prevProjects => {
            const existing = prevProjects.find((p) => p.name?.toLowerCase() === name.toLowerCase());
            if (existing) {
                // Project exists — add its ID to the note's projectIds
                setNotes((prev) => prev.map((n) => {
                    if (n.id !== id) return n;
                    const ids = Array.from(new Set([...(n.projectIds || []), existing.id]));
                    return { ...n, projectIds: ids, project: null };
                }));
                return prevProjects;
            } else {
                // Create a new project and link it
                const newProject = { id: uid(), name: name.trim() };
                setNotes((prev) => prev.map((n) => {
                    if (n.id !== id) return n;
                    const ids = Array.from(new Set([...(n.projectIds || []), newProject.id]));
                    return { ...n, projectIds: ids, project: null };
                }));
                return [...prevProjects, newProject];
            }
        });
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
            prev.map((p) => (p.id === id ? normalizeProject({ ...p, ...patch }) : p))
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
        // Tasks and sessions carry a single projectId. Clear the reference
        // rather than deleting them: losing a user's work because they removed
        // a project would be worse than the task turning up unassigned.
        // Workstream and milestone ids belong to the deleted project, so they go too.
        setTasks((prev) => prev.map(t => (
            t.projectId === id ? { ...t, projectId: null, workstreamId: null, milestoneId: null } : t
        )));
        setSessions((prev) => prev.map(s => (s.linkedProjectId === id ? { ...s, linkedProjectId: null } : s)));
        setActivity((prev) => (Array.isArray(prev) ? prev.filter(a => a.projectId !== id) : prev));
        setProjects((prev) => prev.filter((p) => p.id !== id));
    }, [setProjects, setNotes, setTasks, setSessions, setActivity]);

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
            milestones: [], // { id, title, date, start, status, workstreamId, done }
            assets: [], // { id, name, type, dataUrl, createdAt }
            startDate: null,
            targetDate: null,
            phase: null,
            nextMeeting: null,
            workstreams: [], // { id, name, owner, status, color, order }
            decisions: [], // { id, title, date, by, workstreamId, detail }
            questions: [], // { id, question, workstreamId, owner, blocking, status, answer }
        };
        setProjects((prev) => [p, ...prev]);
        return p;
    }, [setProjects]);

    const generateSamples = useCallback(() => {
        const { projects: newProjects, notes: newNotes, tasks: newTasks, activity: newActivity } = generateDummyData();
        setProjects(newProjects);
        setNotes(newNotes);
        setTasks(newTasks);
        setActivity(newActivity);
    }, [setProjects, setNotes, setTasks, setActivity]);

    // Tasks: status rules live in taskModel, activity logging in the hook
    const { addTask, updateTask, deleteTask, toggleTask, setNextAction } =
        useTaskActions({ tasks, setTasks, logActivity });

    // Workstreams, project decisions, questions, milestones (embedded on the project)
    const {
        addWorkstream, updateWorkstream, deleteWorkstream,
        addDecision, updateDecision, deleteProjectDecision,
        addQuestion, updateQuestion, deleteQuestion, answerQuestion,
        addMilestone, updateMilestone, deleteMilestone,
    } = useProjectCollections({ projects, setProjects, setTasks, logActivity });

    // Reminders
    const addReminder = useCallback((title, scheduledAt) => {
        if (!title.trim()) return;
        setReminders((prev) => [{ id: uid(), title: title.trim(), scheduledAt, createdAt: isoNow(), delivered: false }, ...prev]);
    }, [setReminders]);

    // Decisions (Ledger)
    const createDecision = useCallback((data) => {
        const decision = {
            id: uid(),
            createdAt: isoNow(),
            status: "open",
            ...data
        };
        setLedger(prev => [decision, ...prev]);
        return decision.id;
    }, [setLedger]);

    const reviewDecision = useCallback((id, result) => {
        setLedger(prev => prev.map(d =>
            d.id === id
                ? { ...d, status: "reviewed", reviewedAt: isoNow(), outcome: result.outcome, outcomeStatus: result.status }
                : d
        ));
    }, [setLedger]);

    const deleteDecision = useCallback((id) => {
        setLedger(prev => prev.filter(d => d.id !== id));
    }, [setLedger]);

    const value = useMemo(() => ({
        notes, setNotes, notesMeta,
        projects, setProjects,
        ledger, setLedger,
        tasks, setTasks,
        reminders, setReminders,
        sessions, setSessions,
        activity, setActivity,
        // Note Actions
        createNote, updateNote, deleteNote, deleteAllNotes, renameNote, moveNoteToProject,
        addProjectToNote, removeProjectFromNote,
        // Project Actions
        updateProject, deleteProject, createProject,
        // Task & Reminder Actions
        addTask, updateTask, deleteTask, toggleTask, setNextAction, addReminder,
        // Project collections (workstreams, project decisions, questions, milestones)
        addWorkstream, updateWorkstream, deleteWorkstream,
        addDecision, updateDecision, deleteProjectDecision,
        addQuestion, updateQuestion, deleteQuestion, answerQuestion,
        addMilestone, updateMilestone, deleteMilestone,
        // Decision Actions (Ledger)
        createDecision, reviewDecision, deleteDecision,
        generateSamples
    }), [
        notes, setNotes, notesMeta, projects, setProjects, ledger, setLedger, tasks, setTasks, reminders, setReminders, sessions, setSessions,
        activity, setActivity,
        addWorkstream, updateWorkstream, deleteWorkstream,
        addDecision, updateDecision, deleteProjectDecision,
        addQuestion, updateQuestion, deleteQuestion, answerQuestion,
        addMilestone, updateMilestone, deleteMilestone,
        createNote, updateNote, deleteNote, deleteAllNotes, renameNote, moveNoteToProject, addProjectToNote, removeProjectFromNote,
        updateProject, deleteProject, createProject, addTask, updateTask, deleteTask, toggleTask, setNextAction, addReminder,
        createDecision, reviewDecision, deleteDecision,
        generateSamples
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
    return useContext(DataContext);
}
