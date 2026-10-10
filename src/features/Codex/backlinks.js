const normalize = (value) => String(value ?? "").trim().toLowerCase();

/** Number of other notes whose wikilink targets include this note's title. */
export const countBacklinks = (notes, note) => {
  const title = normalize(note?.title);
  if (!title || !Array.isArray(notes)) return 0;
  return notes.reduce((count, other) => {
    if (other.id === note.id || !Array.isArray(other.links)) return count;
    return other.links.some((link) => normalize(link) === title) ? count + 1 : count;
  }, 0);
};
