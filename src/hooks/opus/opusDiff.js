// Pure diff of two { projects, tasks } states into per-item file operations.
// Items are matched by id. Embedded decisions and questions are their own
// files, so changing one never produces a project write.
//
// op = { key, phase, kind, action: "save" | "delete", id, projectId, label, item }

export const PHASE = { projectSave: 0, itemSave: 1, itemDelete: 2, projectDelete: 3 };

// Not part of project.md: separate files, or kept outside the files (S1).
const NON_FILE_PROJECT_KEYS = ["decisions", "questions", "assets", "emoji"];

const asList = (v) => (Array.isArray(v) ? v : []);
const hasId = (item) => item != null && typeof item === "object" && item.id != null && item.id !== "";
const byId = (list) => new Map(asList(list).filter(hasId).map((item) => [item.id, item]));

export const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
};

const projectBody = (project) => {
  const body = { ...project };
  NON_FILE_PROJECT_KEYS.forEach((k) => delete body[k]);
  return body;
};

const LABEL_KEYS = { project: "name", task: "title", decision: "title", question: "question" };
export const labelOf = (kind, item) => String(item?.[LABEL_KEYS[kind]] ?? "").trim() || `Untitled ${kind}`;

export const keyOf = (kind, id) => `${kind}:${id}`;

const op = (action, kind, item, projectId = null) => ({
  key: keyOf(kind, item.id),
  phase: kind === "project"
    ? (action === "save" ? PHASE.projectSave : PHASE.projectDelete)
    : (action === "save" ? PHASE.itemSave : PHASE.itemDelete),
  kind,
  action,
  id: item.id,
  projectId,
  label: labelOf(kind, item),
  item,
});

// A task pointing at a project that does not exist goes to the inbox rather
// than failing forever: saveTask needs a project folder.
const effectiveProjectId = (task, projectIds) =>
  task.projectId != null && projectIds.has(task.projectId) ? task.projectId : null;

const collectionOps = (kind, projectId, prevList, nextList) => {
  const prev = byId(prevList);
  const next = byId(nextList);
  const ops = [];
  for (const [id, item] of next) {
    const before = prev.get(id);
    if (!before || (before !== item && !deepEqual(before, item))) ops.push(op("save", kind, item, projectId));
  }
  for (const [id, item] of prev) if (!next.has(id)) ops.push(op("delete", kind, item, projectId));
  return ops;
};

const projectOps = (prev, next) => {
  const before = byId(prev.projects);
  const after = byId(next.projects);
  const ops = [];
  for (const [id, project] of after) {
    const old = before.get(id);
    if (old === project) continue;
    if (!old || !deepEqual(projectBody(old), projectBody(project))) ops.push(op("save", "project", project, id));
    ops.push(...collectionOps("decision", id, old?.decisions, project.decisions));
    ops.push(...collectionOps("question", id, old?.questions, project.questions));
  }
  // Deleting a project removes its decision and question files too.
  for (const [id, project] of before) if (!after.has(id)) ops.push(op("delete", "project", project, id));
  return ops;
};

const taskOps = (prev, next) => {
  const oldIds = new Set(byId(prev.projects).keys());
  const newIds = new Set(byId(next.projects).keys());
  const before = byId(prev.tasks);
  const after = byId(next.tasks);
  const ops = [];
  for (const [id, task] of after) {
    const old = before.get(id);
    const to = effectiveProjectId(task, newIds);
    if (old && effectiveProjectId(old, oldIds) === to && (old === task || deepEqual(old, task))) continue;
    ops.push(op("save", "task", { ...task, projectId: to }, to));
  }
  for (const [id, task] of before) {
    if (!after.has(id)) ops.push(op("delete", "task", task, effectiveProjectId(task, oldIds)));
  }
  return ops;
};

/** Operations that turn `prev` into `next`, in the order they must run. */
export const diffOpus = (prev, next) =>
  sortOps([...projectOps(prev, next), ...taskOps(prev, next)]);

/** Project saves first (folders must exist), project deletes last (tasks move out first). */
export const sortOps = (ops) => [...ops].sort((a, b) => a.phase - b.phase);

/** The latest op per key wins; a project delete drops queued decision/question ops of that project. */
export const mergeOps = (queue, incoming) => {
  const next = new Map(queue);
  for (const o of incoming) {
    next.set(o.key, o);
    if (o.kind === "project" && o.action === "delete") {
      for (const [key, queued] of next) {
        if (queued.projectId === o.id && (queued.kind === "decision" || queued.kind === "question")) next.delete(key);
      }
    }
  }
  return next;
};
