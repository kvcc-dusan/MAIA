import { createLinkResolver } from "../../lib/linkResolver.js";

/** Number of other notes with a wikilink that resolves to this note (by title, file name or folder path). */
export const countBacklinks = (notes, note) => {
  if (!note || !Array.isArray(notes)) return 0;
  // The open note may be an unsaved copy: resolve against it, not the stored one.
  const stored = notes.find((n) => n.id === note.id);
  const pool = stored === note ? notes : [...notes.filter((n) => n.id !== note.id), note];
  const resolve = createLinkResolver(pool);
  return notes.reduce((count, other) => {
    if (other.id === note.id || !Array.isArray(other.links)) return count;
    return other.links.some((link) => resolve(link, other)?.id === note.id) ? count + 1 : count;
  }, 0);
};
