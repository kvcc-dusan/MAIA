// Documents and notes are the same vault notes, told apart by two frontmatter
// fields. A document has `kind` and `status`; a project note has neither.
// Optional `workstreamId` and `owner` on a document feed docMeta.

export const DOC_KINDS = [
  { value: "plan", label: "Plan" },
  { value: "spec", label: "Spec" },
  { value: "research", label: "Research" },
  { value: "brief", label: "Brief" },
  { value: "other", label: "Other" },
];

export const DOC_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "current", label: "Current" },
  { value: "notStarted", label: "Not started" },
  { value: "superseded", label: "Superseded" },
];

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? "";
export const docKindLabel = (kind) => labelOf(DOC_KINDS, kind);
export const docStatusLabel = (status) => labelOf(DOC_STATUSES, status);

export const isDocument = (note) => !!note && (!!note.kind || !!note.status);

const isLinked = (note, projectId) => Array.isArray(note.projectIds) && note.projectIds.includes(projectId);
const stamp = (note) => String(note.updatedAt ?? note.createdAt ?? "");
const newestFirst = (key) => (a, b) => key(b).localeCompare(key(a));

export const projectDocuments = (notes = [], projectId) =>
  notes.filter((n) => isLinked(n, projectId) && isDocument(n)).sort(newestFirst(stamp));

export const projectNotes = (notes = [], projectId) =>
  notes.filter((n) => isLinked(n, projectId) && !isDocument(n)).sort(newestFirst((n) => String(n.createdAt ?? "")));

/** Display facts for a document row. Names are omitted when they cannot be resolved. */
export const docMeta = (note, project) => {
  const meta = { updatedAt: note.updatedAt ?? note.createdAt ?? null };
  const workstream = (project?.workstreams ?? []).find((w) => w.id === note.workstreamId);
  if (workstream) meta.workstreamName = workstream.name;
  if (note.owner) meta.ownerName = note.owner;
  return meta;
};
