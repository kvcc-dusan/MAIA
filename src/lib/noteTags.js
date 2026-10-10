// src/lib/noteTags.js
// Every reader that wants a note's tags gets frontmatter tags AND inline #tags.
// note.tags holds only the frontmatter property (what the writer puts in the file).

import { parseContentMeta } from "./parseContentMeta.js";

function toTagList(value) {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}

function normalizeTag(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^#+/, "");
}

export function noteTags(note) {
  const content = typeof note?.content === "string" ? note.content : "";
  const candidates = [...toTagList(note?.tags), ...parseContentMeta(content).tags];

  // Frontmatter comes first, so its spelling wins the case-insensitive dedupe.
  const seen = new Set();
  const result = [];
  candidates.forEach((raw) => {
    const tag = normalizeTag(raw);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return;
    seen.add(key);
    result.push(tag);
  });
  return result;
}
