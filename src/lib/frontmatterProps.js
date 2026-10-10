// @maia:frontmatterProps: typed read/write of single frontmatter properties (pure, no IO).
// A change rewrites only the lines of the one key; every other line stays as the file had it.
// Works on the read-time fields markdownToNote adds (frontmatterKeys / frontmatterRaw /
// frontmatterExtra); see noteFile.js for how they reach the file.

// MAIA bookkeeping the panel never shows. `title` has its own field above the properties.
export const INTERNAL_KEYS = ["id", "title", "projectIds", "links", "workstreamId", "createdAt"];
// Known keys that live on the note object, not in frontmatterExtra.
const SCALAR_MANAGED = ["kind", "status", "owner"];
const MANAGED_KEYS = ["tags", ...SCALAR_MANAGED];
const LIST_KEYS = ["tags", "aliases", "cssclasses"];

export const LIST_TYPES = ["list", "tags", "aliases", "cssclasses"];

const NUMBER_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const KEY_LINE = /^(.*?):(?:\s+(.*))?$/;

const isContinuation = (line) => /^(\s|-(\s|$)|#|$)/.test(line);
const isBlankOrComment = (line) => /^\s*(#.*)?$/.test(line);

// Source mode shows the body only, so the honest pointer is the file itself.
export const UNSUPPORTED_HINT = "Too complex to edit here. Change it in the file itself.";

const unsupported = (hint = UNSUPPORTED_HINT) => ({ type: "text", value: "", isEditable: false, hint });

export const normalizeTag = (tag) => String(tag ?? "").trim().replace(/^#+/, "").trim();

const normalizeTags = (items) => [...new Set(items.map(normalizeTag).filter(Boolean))];

// ---- reading ----------------------------------------------------------------------------

const unquote = (text) => {
  if (text.startsWith('"')) {
    const m = text.match(/^"((?:[^"\\]|\\.)*)"\s*(#.*)?$/);
    // A trailing comment or an escape we do not model would be lost on rewrite
    if (!m || m[2] || /\\[^nrt"\\/ ]/.test(m[1])) return null;
    return m[1].replace(/\\(.)/g, (_, c) => ({ n: "\n", r: "\r", t: "\t" })[c] ?? c);
  }
  if (text.startsWith("'")) {
    const m = text.match(/^'((?:[^']|'')*)'\s*(#.*)?$/);
    return !m || m[2] ? null : m[1].replace(/''/g, "'");
  }
  return null;
};

const splitFlow = (inner) => inner.match(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^,]+/g) || [];

// One list item. null = something we cannot round-trip (nested list, map, comment).
const readItem = (text) => {
  const item = text.trim();
  if (item.startsWith('"') || item.startsWith("'")) return unquote(item);
  if (/^[[{]|[\]}]|:\s|:$|\s#/.test(item)) return null;
  return item;
};

const readItems = (texts) => {
  const items = texts.map(readItem);
  return items.includes(null) ? null : items.filter((i) => i !== "");
};

const splitRaw = (raw) => {
  const lines = raw.split("\n");
  const keyIndex = lines.findIndex((line) => !isContinuation(line));
  const keyCount = lines.filter((line) => !isContinuation(line)).length;
  let end = lines.length;
  while (end > keyIndex + 1 && isBlankOrComment(lines[end - 1])) end -= 1;
  return {
    prefix: lines.slice(0, keyIndex),
    keyLine: lines[keyIndex],
    body: lines.slice(keyIndex + 1, end),
    tail: lines.slice(end),
    isDuplicated: keyCount > 1,
  };
};

const scalarType = (text) => {
  if (text === "true" || text === "false") return { type: "checkbox", value: text === "true" };
  if (NUMBER_RE.test(text)) return { type: "number", value: Number(text) };
  if (DATE_RE.test(text)) return { type: "date", value: text };
  if (DATETIME_RE.test(text)) return { type: "datetime", value: text.replace(" ", "T") };
  return { type: "text", value: text };
};

/** Typed view of one key's raw text, like Obsidian infers it. `isEditable: false` = leave it to source mode. */
export const parseProperty = (key, raw) => {
  const { keyLine, body, isDuplicated } = splitRaw(raw);
  const listType = LIST_KEYS.includes(key) ? key : null;
  const m = keyLine.match(KEY_LINE);
  if (!m || isDuplicated) return unsupported();
  const rest = (m[2] ?? "").trim();
  const asList = (items) => (items ? { type: listType ?? "list", value: listType === "tags" ? normalizeTags(items) : items, isEditable: true } : unsupported());

  if (rest === "") {
    if (body.length === 0) return listType ? { type: listType, value: [], isEditable: true } : { type: "text", value: "", isEditable: true };
    if (!body.every((line) => /^\s*-\s+\S/.test(line))) return unsupported();
    return asList(readItems(body.map((line) => line.replace(/^\s*-\s+/, ""))));
  }
  if (body.length > 0) return unsupported();
  if (rest.startsWith("[")) {
    if (!rest.endsWith("]")) return unsupported();
    return asList(readItems(splitFlow(rest.slice(1, -1))));
  }
  if (/^[{|>&*!%@`]/.test(rest)) return unsupported();
  if (rest.startsWith('"') || rest.startsWith("'")) {
    const value = unquote(rest);
    if (value === null) return unsupported();
    return listType ? asList([value]) : { type: "text", value, isEditable: true };
  }
  if (/\s#/.test(rest)) return unsupported();
  if (listType) return asList(rest.split(listType === "tags" ? /[,\s]+/ : /\s*,\s*/).filter(Boolean));
  return { ...scalarType(rest), isEditable: true };
};

const fromField = (key, value) =>
  key === "tags" ? { type: "tags", value: normalizeTags(value || []), isEditable: true } : { type: "text", value: value || "", isEditable: true };

/** Rows for the panel: every visible key in file order, then managed keys set on a MAIA note. */
export const readProperties = (note) => {
  const rawOf = (key) => note.frontmatterRaw?.[key] ?? note.frontmatterExtra?.[key];
  const seen = new Set();
  const rows = [];
  const add = (key) => {
    if (seen.has(key) || INTERNAL_KEYS.includes(key)) return;
    seen.add(key);
    const raw = rawOf(key);
    const typed = raw != null ? parseProperty(key, raw) : fromField(key, note[key]);
    rows.push({ key, isManaged: MANAGED_KEYS.includes(key), ...typed });
  };
  (note.frontmatterKeys || []).forEach(add);
  MANAGED_KEYS.forEach((key) => {
    const value = note[key];
    if (Array.isArray(value) ? value.length > 0 : value) add(key);
  });
  Object.keys(note.frontmatterExtra || {}).forEach(add);
  return rows;
};

/** False when a frontmatter line is not `key: value` at all; the panel then refuses to touch the block. */
export const isFrontmatterReadable = (note) =>
  (note.frontmatterKeys || []).every((key) => {
    const raw = note.frontmatterRaw?.[key] ?? note.frontmatterExtra?.[key];
    return typeof raw === "string" && KEY_LINE.test(splitRaw(raw).keyLine ?? "");
  });

/** null when the name can be used as a new property key, otherwise a message for the field. */
export const validatePropertyKey = (note, rawKey, { ignore } = {}) => {
  const key = String(rawKey ?? "").trim();
  if (!key) return "Enter a name";
  if (/[:\n\r#]/.test(key)) return "Names cannot contain colons, # or line breaks";
  if (/^[-?[\]{}&*!|>'"%@`]/.test(key)) return "Names cannot start with a symbol";
  if (INTERNAL_KEYS.includes(key)) return "That name is used by MAIA";
  const clash = readProperties(note).some((row) => row.key.toLowerCase() === key.toLowerCase() && row.key !== ignore);
  return clash ? "A property with that name already exists" : null;
};

// ---- writing ----------------------------------------------------------------------------

const quote = (text) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;

const RESERVED_RE = /^(true|false|null|yes|no|on|off|~)$/i;

/** Plain when YAML would read it back as the same string, double quoted otherwise. */
export const formatScalar = (value, { isFlow = false } = {}) => {
  const text = String(value);
  const needsQuote =
    text === "" ||
    /^\s|\s$|[\n\r\t]/.test(text) ||
    /^([-?:](\s|$)|[,[\]{}#&*!|>'"%@`])/.test(text) ||
    /:(\s|$)|\s#/.test(text) ||
    (isFlow && /[,[\]{}]/.test(text)) ||
    RESERVED_RE.test(text) ||
    NUMBER_RE.test(text) ||
    /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(text) ||
    /^0[xob]/i.test(text) ||
    /^\d{4}-\d{2}-\d{2}/.test(text);
  return needsQuote ? quote(text) : text;
};

// Keep how an existing list was written; new lists use Obsidian's block style.
const listStyle = (prevRaw) => {
  if (!prevRaw) return { isFlow: false, indent: "  " };
  const { keyLine, body } = splitRaw(prevRaw);
  const rest = (keyLine.match(KEY_LINE)?.[2] ?? "").trim();
  if (rest.startsWith("[")) return { isFlow: true, indent: "  " };
  const indent = body[0]?.match(/^(\s*)-/)?.[1] ?? "  ";
  return { isFlow: false, indent };
};

const render = (key, { type, value }, prevRaw) => {
  if (LIST_TYPES.includes(type)) {
    const items = type === "tags" ? normalizeTags(value) : value.map((v) => String(v).trim()).filter(Boolean);
    const { isFlow, indent } = listStyle(prevRaw);
    if (items.length === 0) return [`${key}: []`];
    if (isFlow) return [`${key}: [${items.map((i) => formatScalar(i, { isFlow: true })).join(", ")}]`];
    return [`${key}:`, ...items.map((i) => `${indent}- ${formatScalar(i)}`)];
  }
  if (type === "checkbox") return [`${key}: ${value ? "true" : "false"}`];
  if (type === "number") {
    if (!Number.isFinite(value)) throw new Error("A number property needs a number");
    return [`${key}: ${value}`];
  }
  if (type === "date" || type === "datetime") {
    const re = type === "date" ? DATE_RE : DATETIME_RE;
    if (!re.test(String(value))) throw new Error(`Not a valid ${type === "date" ? "date" : "date and time"}`);
    return [`${key}: ${value}`];
  }
  if (type !== "text") throw new Error(`Unknown property type: ${type}`);
  const text = String(value ?? "");
  if (/[\n\r]/.test(text)) throw new Error("Text properties are a single line");
  return [`${key}: ${formatScalar(text)}`];
};

// Comment lines above and below the key stay with it.
const buildRaw = (key, typed, prevRaw) => {
  const kept = prevRaw ? splitRaw(prevRaw) : { prefix: [], tail: [] };
  return [...kept.prefix, ...render(key, typed, prevRaw), ...kept.tail].join("\n");
};

const withKeys = (note, key) =>
  note.frontmatterKeys && !note.frontmatterKeys.includes(key) ? { frontmatterKeys: [...note.frontmatterKeys, key] } : {};

const assertEditable = (note, key) => {
  if (INTERNAL_KEYS.includes(key)) throw new Error(`"${key}" is managed by MAIA`);
  const row = readProperties(note).find((r) => r.key === key);
  if (row && !row.isEditable) throw new Error(`"${key}" can only be edited in the file itself`);
};

/** New note with `key` set. typedValue = { type, value }. Throws on an internal key or an unsupported value. */
export const setFrontmatterProperty = (note, key, typedValue) => {
  assertEditable(note, key);
  const isManaged = MANAGED_KEYS.includes(key);
  if (key === "tags" && !LIST_TYPES.includes(typedValue.type)) throw new Error("tags is a list");
  if (SCALAR_MANAGED.includes(key) && typedValue.type !== "text") throw new Error(`${key} is text`);

  const prevRaw = note.frontmatterRaw?.[key] ?? note.frontmatterExtra?.[key];
  const raw = buildRaw(key, typedValue.type === "tags" || key === "tags" ? { ...typedValue, type: "tags" } : typedValue, prevRaw);
  if (!isManaged) {
    return { ...note, frontmatterExtra: { ...note.frontmatterExtra, [key]: raw }, ...withKeys(note, key) };
  }
  const field = key === "tags" ? normalizeTags(typedValue.value) : String(typedValue.value ?? "") || undefined;
  return { ...note, [key]: field, frontmatterRaw: { ...note.frontmatterRaw, [key]: raw }, ...withKeys(note, key) };
};

const omit = (object, key) => Object.fromEntries(Object.entries(object || {}).filter(([k]) => k !== key));

/** New note without `key`. */
export const removeFrontmatterProperty = (note, key) => {
  if (INTERNAL_KEYS.includes(key)) throw new Error(`"${key}" is managed by MAIA`);
  const extra = omit(note.frontmatterExtra, key);
  // Empty objects stay (never deleted): updateNote merges patches over the stored note, and a
  // missing field would let the old value come back.
  const next = {
    ...note,
    frontmatterRaw: omit(note.frontmatterRaw, key),
    ...(note.frontmatterExtra ? { frontmatterExtra: extra } : {}),
    ...(note.frontmatterKeys ? { frontmatterKeys: note.frontmatterKeys.filter((k) => k !== key) } : {}),
    ...(MANAGED_KEYS.includes(key) ? { [key]: key === "tags" ? [] : undefined } : {}),
  };
  return next;
};

/** Rename keeps the value, its type and its place in the file. Managed keys (tags, kind, status, owner) stay put. */
export const renameFrontmatterProperty = (note, from, to) => {
  const row = readProperties(note).find((r) => r.key === from);
  if (!row || !row.isEditable || row.isManaged) throw new Error(`"${from}" cannot be renamed`);
  const message = validatePropertyKey(note, to, { ignore: from });
  if (message) throw new Error(message);
  const target = to.trim();
  if (MANAGED_KEYS.includes(target)) throw new Error(`"${target}" is reserved`);
  const raw = buildRaw(target, row, note.frontmatterExtra?.[from]);
  return {
    ...note,
    frontmatterExtra: { ...omit(note.frontmatterExtra, from), [target]: raw },
    ...(note.frontmatterKeys ? { frontmatterKeys: note.frontmatterKeys.map((k) => (k === from ? target : k)) } : {}),
  };
};
