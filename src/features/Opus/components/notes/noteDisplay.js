// Pure helpers for the Notes page cards.
import { humanDate } from "../../kit/format";

const PREVIEW_CHARS = 280;
const PREVIEW_LINES = 4;

/** Markdown reduced to plain lines: headings, list markers, emphasis, links and code marks removed. */
export const stripMarkdown = (text) =>
  String(text ?? "")
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => alias || target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/gm, "")
    .replace(/[*_~`=]{1,3}/g, "")
    .replace(/<[^>]+>/g, "");

/** First few non-empty lines of a note body, clipped, for a card. */
export const notePreview = (content, title = "") => {
  const all = stripMarkdown(content).split("\n").map((l) => l.trim()).filter(Boolean);
  // A body that opens with the note's own title would just repeat the card heading.
  const body = all[0]?.toLowerCase() === title.trim().toLowerCase() ? all.slice(1) : all;
  const lines = body.slice(0, PREVIEW_LINES);
  const joined = lines.join("\n");
  return joined.length > PREVIEW_CHARS ? `${joined.slice(0, PREVIEW_CHARS - 1).trimEnd()}…` : joined;
};

export const noteCardTitle = (note) => note.title?.trim() || "Untitled";

export const noteDateLabel = (note) => {
  const label = humanDate(note.createdAt ?? note.updatedAt);
  return label || "No date";
};
