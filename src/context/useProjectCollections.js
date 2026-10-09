import { useCallback } from "react";
import { uid, isoNow } from "../lib/ids.js";
import {
  normalizeProject,
  createWorkstream,
  createProjectDecision,
  createQuestion,
  createMilestone,
  applyQuestionPatch,
  applyMilestonePatch,
} from "../features/Opus/lib/projectModel.js";
import { useLatest } from "./useLatest.js";

// One entry per collection embedded on a project. `create` receives the
// current items so workstreams can pick the next color and order.
const merge = (prev, patch) => ({ ...prev, ...patch });

const COLLECTIONS = {
  workstreams: {
    titleOf: (w) => w.name,
    create: (existing, data) => createWorkstream(existing, data),
    patch: merge,
  },
  decisions: {
    titleOf: (d) => d.title,
    create: (_existing, data, now) => createProjectDecision(data, now),
    patch: merge,
  },
  questions: {
    titleOf: (q) => q.question,
    create: (_existing, data, now) => createQuestion(data, now),
    patch: applyQuestionPatch,
  },
  milestones: {
    titleOf: (m) => m.title,
    create: (_existing, data, now) => createMilestone(data, now),
    patch: applyMilestonePatch,
  },
};

const clearRef = (item, key, id) => (item[key] === id ? { ...item, [key]: null } : item);

/**
 * CRUD for workstreams, project decisions, questions and milestones, all as
 * immutable updates on the project. Each change is logged to the activity log.
 * Deleting a workstream (or milestone) clears the references to it so nothing
 * points at a thing that no longer exists.
 */
export const useProjectCollections = ({ projects, setProjects, setTasks, logActivity }) => {
  const projectsRef = useLatest(projects);

  const findItem = useCallback((collection, projectId, id) => {
    const project = projectsRef.current.find((p) => p.id === projectId);
    return project ? project[collection].find((i) => i.id === id) : undefined;
  }, [projectsRef]);

  const editProject = useCallback((projectId, edit) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? edit(normalizeProject(p)) : p)));
  }, [setProjects]);

  const addItem = useCallback((collection, projectId, data = {}) => {
    if (!projectsRef.current.some((p) => p.id === projectId)) return null;
    const config = COLLECTIONS[collection];
    const id = data.id ?? uid();
    const now = isoNow();
    const input = { ...data, id };
    editProject(projectId, (p) => ({
      ...p,
      [collection]: [...p[collection], config.create(p[collection], input, now)],
    }));
    logActivity({
      kind: "created",
      collection,
      itemId: id,
      projectId,
      title: config.titleOf(config.create([], input, now)),
    });
    return id;
  }, [projectsRef, editProject, logActivity]);

  const updateItem = useCallback((collection, projectId, id, patch = {}) => {
    const config = COLLECTIONS[collection];
    const now = isoNow();
    editProject(projectId, (p) => ({
      ...p,
      [collection]: p[collection].map((i) => (i.id === id ? config.patch(i, patch, now) : i)),
    }));
    const before = findItem(collection, projectId, id);
    if (!before) return;
    const after = config.patch(before, patch, now);
    const base = { collection, itemId: id, projectId, title: config.titleOf(after) };
    if (before.status !== after.status) {
      logActivity({ ...base, kind: "status", from: before.status, to: after.status });
    } else if (Object.keys(patch).some((key) => !Object.is(before[key], after[key]))) {
      logActivity({ ...base, kind: "updated" });
    }
  }, [editProject, findItem, logActivity]);

  const removeItem = useCallback((collection, projectId, id) => {
    const before = findItem(collection, projectId, id);
    const refKey = collection === "workstreams" ? "workstreamId" : collection === "milestones" ? "milestoneId" : null;

    editProject(projectId, (p) => {
      const next = { ...p, [collection]: p[collection].filter((i) => i.id !== id) };
      if (collection !== "workstreams") return next;
      // Milestones, decisions and questions can all point at a workstream.
      return {
        ...next,
        milestones: next.milestones.map((m) => clearRef(m, refKey, id)),
        decisions: next.decisions.map((d) => clearRef(d, refKey, id)),
        questions: next.questions.map((q) => clearRef(q, refKey, id)),
      };
    });
    if (refKey) {
      setTasks((prev) => (prev.some((t) => t[refKey] === id) ? prev.map((t) => clearRef(t, refKey, id)) : prev));
    }
    if (before) {
      logActivity({
        kind: "deleted",
        collection,
        itemId: id,
        projectId,
        title: COLLECTIONS[collection].titleOf(before),
      });
    }
  }, [findItem, editProject, setTasks, logActivity]);

  return {
    addWorkstream: useCallback((projectId, data) => addItem("workstreams", projectId, data), [addItem]),
    updateWorkstream: useCallback((projectId, id, patch) => updateItem("workstreams", projectId, id, patch), [updateItem]),
    deleteWorkstream: useCallback((projectId, id) => removeItem("workstreams", projectId, id), [removeItem]),

    addDecision: useCallback((projectId, data) => addItem("decisions", projectId, data), [addItem]),
    updateDecision: useCallback((projectId, id, patch) => updateItem("decisions", projectId, id, patch), [updateItem]),
    // Named apart from the Ledger's deleteDecision, which is a different store.
    deleteProjectDecision: useCallback((projectId, id) => removeItem("decisions", projectId, id), [removeItem]),

    addQuestion: useCallback((projectId, data) => addItem("questions", projectId, data), [addItem]),
    updateQuestion: useCallback((projectId, id, patch) => updateItem("questions", projectId, id, patch), [updateItem]),
    deleteQuestion: useCallback((projectId, id) => removeItem("questions", projectId, id), [removeItem]),
    answerQuestion: useCallback(
      (projectId, id, answer) => updateItem("questions", projectId, id, { answer, status: "answered" }),
      [updateItem],
    ),

    addMilestone: useCallback((projectId, data) => addItem("milestones", projectId, data), [addItem]),
    updateMilestone: useCallback((projectId, id, patch) => updateItem("milestones", projectId, id, patch), [updateItem]),
    deleteMilestone: useCallback((projectId, id) => removeItem("milestones", projectId, id), [removeItem]),
  };
};
