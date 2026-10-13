// Small text helpers shared by the Record rows, forms and dialogs.

export const DETAIL_CLIP_CHARS = 200;

const collapseWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** One-line version of a text for labels and confirmations, cut at `max` characters. */
export const clipText = (value, max = 60) => {
  const text = collapseWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

