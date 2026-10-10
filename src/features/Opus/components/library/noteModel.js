// Notes linked to a project: selection, ordering and the link/unlink edits.
// Pure, no React. A note belongs to a project through its `projectIds` array.

export const PICKER_LIMIT = 50;
export const EXCERPT_LENGTH = 80;

const timeOf = (note) => new Date(note.updatedAt || note.createdAt).getTime() || 0;

export const noteTitle = (note) => note.title || "Untitled";

const isLinked = (note, projectId) => Boolean(note.projectIds?.includes(projectId));

/** Linked notes, most recently touched first. */
export const linkedNotesFor = (notes, projectId) =>
  notes.filter((n) => isLinked(n, projectId)).sort((a, b) => timeOf(b) - timeOf(a));

export const unlinkedNotesFor = (notes, projectId) => notes.filter((n) => !isLinked(n, projectId));

/** Case-insensitive title filter, capped so a huge vault doesn't render thousands of rows. */
export const filterNotesByTitle = (notes, query, limit = PICKER_LIMIT) => {
  const q = query.trim().toLowerCase();
  const pool = q ? notes.filter((n) => (n.title || "").toLowerCase().includes(q)) : notes;
  return { shown: pool.slice(0, limit), total: pool.length };
};

export const withProject = (note, projectId) => ({
  ...note,
  projectIds: [...(note.projectIds || []), projectId],
});

export const withoutProject = (note, projectId) => ({
  ...note,
  projectIds: (note.projectIds || []).filter((id) => id !== projectId),
});

/** One line of plain text from a markdown note body. */
export const excerptOf = (content, max = EXCERPT_LENGTH) =>
  (content || "").replace(/[#*`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
