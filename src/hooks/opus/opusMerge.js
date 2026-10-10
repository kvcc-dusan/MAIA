// Folds a fresh disk read into state without losing edits that have not been
// written yet. `dirtyOps` are the unflushed changes (queued ones plus whatever
// the diff effect has not seen); each one re-applies the local version of its
// item on top of what was loaded.
import { keyOf } from "./opusDiff.js";

const COLLECTIONS = { decision: "decisions", question: "questions" };
const asList = (v) => (Array.isArray(v) ? v : []);
const replaceOrAdd = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

const applyCollectionOp = (projects, o, localProject) => {
  const field = COLLECTIONS[o.kind];
  return projects.map((p) => {
    if (p.id !== o.projectId) return p;
    const list = asList(p[field]);
    if (o.action === "delete") return { ...p, [field]: list.filter((x) => x.id !== o.id) };
    const item = asList(localProject?.[field]).find((x) => x.id === o.id);
    return item ? { ...p, [field]: replaceOrAdd(list, item) } : p;
  });
};

const applyOp = (state, o, local) => {
  if (o.kind === "task") {
    if (o.action === "delete") return { ...state, tasks: state.tasks.filter((t) => t.id !== o.id) };
    const task = local.tasks.find((t) => t.id === o.id);
    return task ? { ...state, tasks: replaceOrAdd(state.tasks, task) } : state;
  }
  if (o.kind === "project") {
    if (o.action === "delete") return { ...state, projects: state.projects.filter((p) => p.id !== o.id) };
    const project = local.projects.find((p) => p.id === o.id);
    if (!project) return state;
    const onDisk = state.projects.find((p) => p.id === o.id);
    // Keep the freshly loaded decisions and questions, their own ops re-apply local edits.
    const merged = onDisk ? { ...project, decisions: onDisk.decisions, questions: onDisk.questions } : project;
    return { ...state, projects: replaceOrAdd(state.projects, merged) };
  }
  const localProject = local.projects.find((p) => p.id === o.projectId);
  return { ...state, projects: applyCollectionOp(state.projects, o, localProject) };
};

/**
 * @param {{projects: object[], tasks: object[]}} loaded fresh from disk
 * @param {{projects: object[], tasks: object[]}} local current in-memory state
 * @param {object[]} dirtyOps unflushed changes, project saves first
 * @param {Set<string>} revertKeys items that must show the disk version (conflicts)
 */
export const mergeDirty = (loaded, local, dirtyOps, revertKeys = new Set()) =>
  dirtyOps
    .filter((o) => !revertKeys.has(keyOf(o.kind, o.id)))
    .reduce((state, o) => applyOp(state, o, local), loaded);

/** Appends conflict copies after the merge so they exist only locally until written. */
export const addExtras = (state, extras) =>
  extras.reduce((acc, { kind, item, projectId }) => {
    if (kind === "project") return { ...acc, projects: [item, ...acc.projects] };
    if (kind === "task") return { ...acc, tasks: [item, ...acc.tasks] };
    const field = COLLECTIONS[kind];
    return {
      ...acc,
      projects: acc.projects.map((p) => (p.id === projectId ? { ...p, [field]: [...asList(p[field]), item] } : p)),
    };
  }, state);
