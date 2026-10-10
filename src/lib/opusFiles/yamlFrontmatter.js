// @maia:opusFiles - YAML frontmatter split / parse / patch (pure, no IO).
// Files are untrusted input (Obsidian, Claude over MCP, hand edits): nothing
// here throws, bad input comes back as { ok: false, error }.
import { parseDocument, stringify } from "yaml";

const STRINGIFY_OPTIONS = { lineWidth: 0 };
const FRONTMATTER = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const normalizeEol = (text) =>
  String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

/** Splits a file into its frontmatter block and body. Line endings become LF. */
export const splitFrontmatter = (text) => {
  const source = normalizeEol(text);
  const match = source.match(FRONTMATTER);
  if (!match) return { hasFrontmatter: false, yaml: "", body: source };
  return { hasFrontmatter: true, yaml: match[1] ?? "", body: source.slice(match[0].length) };
};

const errorMessage = (e) => String(e?.message ?? e).split("\n")[0];

/** Parses the frontmatter into a plain object. Never throws. */
export const parseFrontmatter = (text) => {
  try {
    const parts = splitFrontmatter(text);
    if (!parts.hasFrontmatter) return { ok: true, ...parts, data: {} };
    const doc = parseDocument(parts.yaml, { uniqueKeys: true });
    if (doc.errors.length > 0) return { ok: false, error: errorMessage(doc.errors[0]) };
    const raw = doc.toJS() ?? {};
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Frontmatter is not a block of key: value pairs" };
    }
    const data = Object.fromEntries(Object.entries(raw).filter(([key]) => !UNSAFE_KEYS.has(key)));
    return { ok: true, ...parts, data };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
};

const isEmpty = (value) =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

/** Drops empty optional values so files only carry keys that mean something. */
export const compactFields = (fields) =>
  Object.fromEntries(Object.entries(fields).filter(([key, value]) => !UNSAFE_KEYS.has(key) && !isEmpty(value)));

export const isSameValue = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((k) => isSameValue(a[k], b[k]));
};

const bodyBlock = (body) => (body ? `\n${body}\n` : "");

/** A brand new file: stable key order, one blank line before the body. */
export const stringifyFile = (fields, body = "") => {
  const compact = compactFields(fields);
  const yamlText = Object.keys(compact).length > 0 ? stringify(compact, STRINGIFY_OPTIONS) : "";
  return `---\n${yamlText}---\n${bodyBlock(body)}`;
};

/**
 * Re-emits `source` with only the keys that differ from `baseFields` (what the
 * source itself yields) touched. Comments, quoting, unknown keys and an
 * untouched body survive byte for byte; an untouched file returns unchanged.
 */
export const patchFile = (source, { fields, baseFields, body, baseBody }) => {
  const next = compactFields(fields);
  const base = compactFields(baseFields);
  const parts = splitFrontmatter(source);
  const changedKeys = [...new Set([...Object.keys(next), ...Object.keys(base)])].filter(
    (key) => !isSameValue(next[key], base[key]),
  );
  const bodyChanged = body !== baseBody;
  if (changedKeys.length === 0 && !bodyChanged) return normalizeEol(source);
  // Without a frontmatter block there is nothing to patch: write the whole thing, id included.
  if (!parts.hasFrontmatter) return stringifyFile(next, body);

  const doc = parseDocument(parts.yaml, { uniqueKeys: true });
  for (const key of changedKeys) {
    if (key in next) doc.set(key, next[key]);
    else doc.delete(key);
  }
  const yamlText = changedKeys.length > 0 ? doc.toString(STRINGIFY_OPTIONS) : parts.yaml ? `${parts.yaml}\n` : "";
  const block = yamlText && !yamlText.endsWith("\n") ? `${yamlText}\n` : yamlText;
  return `---\n${block}---\n${bodyChanged ? bodyBlock(body) : parts.body}`;
};
