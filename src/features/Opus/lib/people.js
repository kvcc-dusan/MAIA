// Who works on a project, derived from the data that already carries a name.
// Owner chips and avatars only make sense with more than one person.

const clean = (name) => (typeof name === "string" ? name.trim() : "");

/** Sorted unique names from task owners, workstream owners, question owners and decision authors. */
export const projectPeople = (project, tasks = []) => {
  if (!project) return [];
  const names = [
    ...tasks.filter((t) => t.projectId === project.id).map((t) => t.owner),
    ...(project.workstreams ?? []).map((w) => w.owner),
    ...(project.questions ?? []).map((q) => q.owner),
    ...(project.decisions ?? []).map((d) => d.by),
  ]
    .map(clean)
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
};

export const showOwners = (project, tasks = []) => projectPeople(project, tasks).length > 1;

/** "Lea Horvat" -> "LH"; one word -> first two letters; empty -> "". */
export const initials = (name) => {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PRIORITY_LABELS = { p1: "High", p2: "Medium" };

/** Badge text for a task, or null for normal priority (no badge). */
export const priorityLabel = (task) => PRIORITY_LABELS[task?.priority] ?? null;
