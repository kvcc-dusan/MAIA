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

const parseFrontmatter = (block) => {
  const data = {};
  block.split("\n").forEach((line) => {
    const match = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (match) data[match[1]] = parseYamlValue(match[2]);
  });
  return data;
};

const asArray = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

export const markdownToNote = (text, { fallbackId, fallbackTitle } = {}) => {
  const source = String(text ?? "");
  let data = {};
  let content = source;

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    data = parseFrontmatter(match[1]);
    content = source.slice(match[0].length).replace(/^\r?\n/, "");
  }

  return {
    id: data.id || fallbackId || uid(),
    title: data.title || fallbackTitle || "Untitled",
    content,
    tags: asArray(data.tags),
    links: asArray(data.links),
    projectIds: asArray(data.projectIds),
    createdAt: data.createdAt || isoNow(),
    kind: data.kind || undefined,
    status: data.status || undefined,
    workstreamId: data.workstreamId || undefined,
    owner: data.owner || undefined,
    project: null,
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
