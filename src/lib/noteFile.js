// @maia:noteFile — note <-> markdown file serialization (pure, no IO)
import { uid, isoNow } from "./ids.js";
import { parseContentMeta } from "./parseContentMeta.js";

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

const ARRAY_KEYS = ["tags", "links", "projectIds"];
// Identity and derived keys: kept when the file already has them, never added to a file that does not.
// id is the path-derived stable id for foreign files, createdAt the file's own date, links is
// rebuilt from the body on every read.
const NEVER_ADD_KEYS = ["id", "createdAt", "links"];
// A note MAIA created (no frontmatterKeys yet) always carries its identity.
const IDENTITY_KEYS = ["id", "title", "createdAt"];

const KEY_LINE = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/;

const asArray = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

const hasValue = (value) =>
  value != null && value !== "" && !(Array.isArray(value) && value.length === 0);

const normalizeKnown = (key, value) => (ARRAY_KEYS.includes(key) ? asArray(value) : value || undefined);

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Comment lines that sat above a key in the file; they travel with the key when it is rewritten.
const leadingLines = (raw) => {
  const lines = raw.split("\n");
  const keyIndex = lines.findLastIndex((line) => !isContinuationLine(line));
  return keyIndex > 0 ? `${lines.slice(0, keyIndex).join("\n")}\n` : "";
};

// The file's own text for a known key when its value did not change, so a body edit never
// restyles `tags:` lists, quoting or comments. A changed value is re-rendered.
const renderKnown = (note, key) => {
  const value = note[key];
  const raw = note.frontmatterRaw?.[key];
  if (raw != null) {
    const fromFile = normalizeKnown(key, readEntryValue(raw.split("\n")));
    const fallback = note.frontmatterLayout?.fallback?.[key];
    const isUnchanged = sameValue(fromFile, normalizeKnown(key, value))
      // `title:` left empty in the file reads back as the file name; that is not an edit
      || (fromFile === undefined && fallback !== undefined && value === fallback);
    if (isUnchanged) return raw;
  }
  if (value == null || value === "") return null;
  const text = yamlLine(key, value);
  return raw != null ? `${leadingLines(raw)}${text}` : text;
};

const extraRaw = (note, key) => {
  const raw = note.frontmatterExtra?.[key];
  return typeof raw === "string" ? raw : null;
};

// Minimal footprint. A note read from a file keeps exactly the keys it had, in its order. A key
// the file did not have is added only when it now carries a real value. A note MAIA created
// (no frontmatterKeys) gets id, title and createdAt plus whatever is set.
const frontmatterLines = (note) => {
  const lines = [];
  const done = new Set();
  const push = (text) => {
    if (typeof text === "string" && text !== "") lines.push(text);
  };

  if (note.frontmatterKeys) {
    note.frontmatterKeys.forEach((key) => {
      done.add(key);
      push(Object.hasOwn(note.frontmatterRaw || {}, key) ? renderKnown(note, key) : extraRaw(note, key));
    });
    FRONTMATTER_KEYS.forEach((key) => {
      if (done.has(key) || NEVER_ADD_KEYS.includes(key)) return;
      const fallbackTitle = note.frontmatterLayout?.fallback?.title;
      // A title that still equals the file name is the file name, not data
      if (key === "title" ? note.title !== fallbackTitle : hasValue(note[key])) push(renderKnown(note, key));
    });
  } else {
    FRONTMATTER_KEYS.forEach((key) => {
      if (key === "links") return;
      if (IDENTITY_KEYS.includes(key) || hasValue(note[key])) push(renderKnown(note, key));
    });
  }

  // Unknown keys (Obsidian aliases, user props, ...) not yet placed go back verbatim
  Object.keys(note.frontmatterExtra || {}).forEach((key) => {
    if (done.has(key)) return;
    // A key that became known since this note was read is written above, unless it has no value
    if (FRONTMATTER_KEYS.includes(key) && note[key] != null) return;
    push(extraRaw(note, key));
  });
  return lines;
};

export const noteToMarkdown = (note) => {
  const content = note.content || "";
  const lines = frontmatterLines(note);
  // Never an empty block: a note with nothing to say in frontmatter is just its body
  if (lines.length === 0) return content;
  const layout = note.frontmatterLayout || {};
  const eol = layout.eol || "\n";
  const close = layout.close ?? "\n";
  const block = lines.join("\n").replace(/\n/g, eol);
  // A file that ended right at the closing fence needs a line break once a body follows it
  const afterFence = close === "" && content ? eol : close;
  return `${layout.prefix || ""}---${eol}${block}${eol}---${afterFence}${layout.gap || ""}${content}`;
};

const parseYamlScalar = (raw) => {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

const parseYamlValue = (raw) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    // Split on commas outside quotes
    const items = inner.match(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^,]+/g) || [];
    return items.map((item) => parseYamlScalar(item)).filter((s) => s !== "");
  }
  return parseYamlScalar(trimmed);
};

// Indented, list-item, comment and blank lines belong to the key above them
const isContinuationLine = (line) => /^(\s|-(\s|$)|#|$)/.test(line);

// Value of one top-level entry: the scalar or flow list on the key line, plus Obsidian's block
// list (`tags:` then `- item`). Duplicate keys: the last one wins.
const readEntryValue = (lines) => {
  const start = lines.findLastIndex((line) => !isContinuationLine(line));
  let value = parseYamlValue(lines[start].match(KEY_LINE)?.[2] ?? "");
  lines.slice(start + 1).forEach((line) => {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && (value === "" || Array.isArray(value))) {
      value = [...(value || []), parseYamlScalar(item[1])].filter((v) => v !== "");
    }
  });
  return value;
};

const rawKey = (line) => (line.includes(":") ? line.slice(0, line.indexOf(":")).trim() : line.trim());

// Returns parsed known keys, the raw text of every key (continuation lines included) and the key
// order. Raw text is kept instead of parsed values so lists, block scalars, quotes and comments
// survive a save byte for byte.
const parseFrontmatter = (block) => {
  const entries = [];
  let pending = [];

  block.split(/\r?\n/).forEach((line) => {
    if (isContinuationLine(line)) {
      if (entries.length > 0) entries[entries.length - 1].lines.push(line);
      else pending.push(line);
      return;
    }
    const match = line.match(KEY_LINE);
    const isKnown = Boolean(match) && FRONTMATTER_KEYS.includes(match[1]);
    entries.push({ key: match ? match[1] : rawKey(line), isKnown, lines: [...pending, line] });
    pending = [];
  });

  const data = {};
  const raw = {};
  const extra = {};
  const keys = [];
  entries.forEach(({ key, isKnown, lines }) => {
    if (!keys.includes(key)) keys.push(key);
    const bucket = isKnown ? raw : extra;
    const text = lines.join("\n");
    // Duplicate keys stay as separate raw lines under one entry so nothing is dropped
    bucket[key] = Object.hasOwn(bucket, key) ? `${bucket[key]}\n${text}` : text;
    if (isKnown) data[key] = readEntryValue(lines);
  });
  return { data, raw, extra, keys };
};

const FRONTMATTER_RE = /^(\uFEFF?(?:[ \t]*\r?\n)*)---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export const markdownToNote = (text, { fallbackId, fallbackTitle, fallbackCreatedAt } = {}) => {
  const source = String(text ?? "");
  let parsed = { data: {}, raw: {}, extra: {}, keys: [] };
  let layout = { prefix: "", eol: "\n", close: "\n", gap: "" };
  let content = source;

  // A BOM or blank lines before the opening `---` must not push the frontmatter into the body
  const match = source.match(FRONTMATTER_RE);
  if (match) {
    parsed = parseFrontmatter(match[2]);
    const rest = source.slice(match[0].length);
    const gap = rest.match(/^\r?\n/)?.[0] ?? "";
    layout = { prefix: match[1], eol: match[0].includes("\r\n") ? "\r\n" : "\n", close: match[3], gap };
    content = rest.slice(gap.length);
  }
  const { data, raw, extra, keys } = parsed;

  const id = data.id || fallbackId || uid();
  const title = data.title || fallbackTitle || "Untitled";
  const createdAt = data.createdAt || fallbackCreatedAt || isoNow();
  // What a missing or empty key reads back as, so the writer can tell data from a fallback
  const fallback = {
    ...(data.id ? {} : { id }),
    ...(data.title ? {} : { title }),
    ...(data.createdAt ? {} : { createdAt }),
  };

  return {
    id,
    title,
    content,
    tags: asArray(data.tags),
    // Wikilinks are derived from the body, so backlinks work without MAIA ever writing `links:`
    links: data.links !== undefined ? asArray(data.links) : parseContentMeta(content).links,
    projectIds: asArray(data.projectIds),
    createdAt,
    kind: data.kind || undefined,
    status: data.status || undefined,
    workstreamId: data.workstreamId || undefined,
    owner: data.owner || undefined,
    project: null,
    // Read-time facts the writer needs to leave the file as it was. Never written as keys.
    frontmatterKeys: keys,
    frontmatterRaw: raw,
    frontmatterLayout: { ...layout, fallback },
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
