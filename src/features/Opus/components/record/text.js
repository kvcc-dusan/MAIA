// Small text helpers shared by the Record rows, forms and dialogs.

export const DETAIL_CLIP_CHARS = 200;
export const DETAIL_CLIP_LINES = 3;

const collapseWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** One-line version of a text for labels and confirmations, cut at `max` characters. */
export const clipText = (value, max = 60) => {
  const text = collapseWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

/**
 * Collapsed form of a long detail. Cutting the text (instead of clamping it with
 * CSS) means "Show more" is offered exactly when something is hidden, at any
 * width. Line breaks survive so a short list stays a list.
 */
export const clipDetail = (value, { maxChars = DETAIL_CLIP_CHARS, maxLines = DETAIL_CLIP_LINES } = {}) => {
  const text = String(value ?? "").trim();
  const lines = text.split(/\r?\n/);
  const byLines = lines.length > maxLines ? lines.slice(0, maxLines).join("\n") : text;
  const isCutByLines = byLines.length < text.length;
  if (byLines.length <= maxChars) {
    return { text: isCutByLines ? `${byLines.trimEnd()}…` : byLines, isClipped: isCutByLines };
  }
  return { text: `${byLines.slice(0, maxChars - 1).trimEnd()}…`, isClipped: true };
};
