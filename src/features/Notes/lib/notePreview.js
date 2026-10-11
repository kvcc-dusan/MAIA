// The card grid shows a few lines of each note. Passing the whole text to every card put megabytes of hidden
// text into the page (some real notes are 40,000 characters) and made opening the grid take seconds.
const READ_CHARS = 700; // enough for any card height, however wide the card
const MAX_CHARS = 240;
export const EMPTY_PREVIEW = "No text yet.";

/** First lines of a note as plain, single-spaced text; a note with no text gets the empty message. */
export const notePreview = (content) => {
  const head = String(content ?? "").slice(0, READ_CHARS).replace(/\s+/g, " ").trim();
  if (!head) return EMPTY_PREVIEW;
  return head.length > MAX_CHARS ? `${head.slice(0, MAX_CHARS).trimEnd()}…` : head;
};
