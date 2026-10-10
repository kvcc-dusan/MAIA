// @maia:noteFile — note <-> markdown file serialization (pure, no IO)
import { uid, isoNow } from "./ids.js";

const FRONTMATTER_KEYS = ["id", "title", "tags", "projectIds", "links", "createdAt", "kind", "status", "workstreamId", "owner"];

const escapeYamlString = (value) => {
  const str = String(value ?? "");
  // Quote when the value could be misread by a YAML parser
  if (/[:#[\]{}"'\n]|^\s|\s$/.test(str) || str === "") {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return str;
};

const yamlLine = (key, value) => {
  if (Array.isArray(value)) {
    return `${key}: [${value.map(escapeYamlString).join(", ")}]`;
  }
  return `${key}: ${escapeYamlString(value)}`;
};

export const noteToMarkdown = (note) => {
  const lines = ["---"];
  FRONTMATTER_KEYS.forEach((key) => {
    const value = note[key];
    if (value === undefined || value === null) return;
    lines.push(yamlLine(key, value));
  });
  // Unknown keys (Obsidian aliases, user props, ...) go back verbatim after the known ones
  Object.entries(note.frontmatterExtra || {}).forEach(([key, raw]) => {
    // A key that became known since this note was read is written by the loop above, unless it has no value
    if (FRONTMATTER_KEYS.includes(key) && note[key] != null) return;
    if (typeof raw === "string" && raw !== "") lines.push(raw);
  });
  lines.push("---", "");
  return lines.join("\n") + (note.content || "");
};

const parseYamlScalar = (raw) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
};

const parseYamlValue = (raw) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    // Split on commas outside quotes
    const items = inner.match(/"(?:[^"\\]|\\.)*"|[^,]+/g) || [];
    return items.map((item) => parseYamlScalar(item)).filter((s) => s !== "");
  }
  return parseYamlScalar(trimmed);
};

// Indented, list-item, comment and blank lines belong to the key above them
const isContinuationLine = (line) => /^(\s|-(\s|$)|#|$)/.test(line);

// Returns parsed known keys plus the raw text of every other top-level key (continuation
// lines included). Raw text is kept instead of parsed values so lists, block scalars,
// quotes and comments survive a save byte for byte.
const parseFrontmatter = (block) => {
  const data = {};
  const extra = {};
  let currentExtraKey = null;
  let knownKey = null;
  let pending = [];

  block.split("\n").forEach((line) => {
    if (isContinuationLine(line)) {
      if (currentExtraKey !== null) extra[currentExtraKey] += `\n${line}`;
      else if (knownKey !== null) {
        // Block list under a known key (`tags:` then `- item`), the form Obsidian writes
        const item = line.match(/^\s*-\s+(.*)$/);
        if (item && (data[knownKey] === "" || Array.isArray(data[knownKey]))) {
          data[knownKey] = [...(data[knownKey] || []), parseYamlScalar(item[1])].filter((v) => v !== "");
        }
      } else pending.push(line);
      return;
    }

    const match = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (match && FRONTMATTER_KEYS.includes(match[1])) {
      data[match[1]] = parseYamlValue(match[2]);
      currentExtraKey = null;
      knownKey = match[1];
      pending = [];
      return;
    }

    const key = line.includes(":") ? line.slice(0, line.indexOf(":")).trim() : line.trim();
    const raw = [...pending, line].join("\n");
    pending = [];
    // Duplicate keys stay as separate raw lines under one entry so nothing is dropped
    extra[key] = Object.hasOwn(extra, key) ? `${extra[key]}\n${raw}` : raw;
    currentExtraKey = key;
    knownKey = null;
  });
  return { data, extra };
};

const asArray = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

export const markdownToNote = (text, { fallbackId, fallbackTitle, fallbackCreatedAt } = {}) => {
  const source = String(text ?? "");
  let data = {};
  let extra = {};
  let content = source;

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    ({ data, extra } = parseFrontmatter(match[1]));
    content = source.slice(match[0].length).replace(/^\r?\n/, "");
  }

  return {
    id: data.id || fallbackId || uid(),
    title: data.title || fallbackTitle || "Untitled",
    content,
    tags: asArray(data.tags),
    links: asArray(data.links),
    projectIds: asArray(data.projectIds),
    createdAt: data.createdAt || fallbackCreatedAt || isoNow(),
    kind: data.kind || undefined,
    status: data.status || undefined,
    workstreamId: data.workstreamId || undefined,
    owner: data.owner || undefined,
    project: null,
    ...(Object.keys(extra).length > 0 ? { frontmatterExtra: extra } : {}),
  };
};

export const slugifyTitle = (title) => {
  const slug = String(title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/\\:*?"<>|#%{}^~[\]]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug;
};

export const noteFilename = (note, takenNames = new Set()) => {
  const base = slugifyTitle(note.title) || `untitled-${String(note.id).slice(0, 5)}`;
  let name = `${base}.md`;
  let counter = 2;
  while (takenNames.has(name)) {
    name = `${base}-${counter}.md`;
    counter += 1;
  }
  return name;
};
