// @maia:opusFiles - shared plumbing for the four file serializers (pure, no IO).
// Each file type supplies `parse`, `toFields`, `bodyOf`; this builds
// fromFile / toFile on top so unknown keys, warnings and the byte-for-byte
// round trip behave identically everywhere.
import { uid } from "../ids.js";
import { parseFrontmatter, patchFile, stringifyFile } from "./yamlFrontmatter.js";

export const EMPTY_CONTEXT = Object.freeze({ workstreams: [], milestones: [] });

/* ---- coercion: every value from a file is untrusted ---- */

export const asString = (v) => {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

export const optString = (v) => asString(v) || null;

export const asBool = (v) => v === true || (typeof v === "string" && v.trim().toLowerCase() === "true");

export const asNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export const asRecords = (v) => (Array.isArray(v) ? v : []);

export const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** Case-insensitive pick from an allowed list; anything else warns and falls back. */
export const pickOption = (value, allowed, fallback, label, warnings) => {
  const raw = asString(value);
  if (raw === "") return fallback;
  const hit = allowed.find((option) => option.toLowerCase() === raw.toLowerCase());
  if (hit) return hit;
  warnings.push(`Unknown ${label} "${raw}", ${fallback == null ? "ignored" : `using "${fallback}"`}`);
  return fallback;
};

/* ---- name <-> id references (humans write names, the app keeps ids) ---- */

const norm = (s) => asString(s).toLowerCase();

/** Resolves a name (or, leniently, an id) to an id. Unresolved warns and returns null. */
export const resolveRef = (value, list, nameKey, label, warnings) => {
  const wanted = norm(value);
  if (wanted === "") return null;
  const hit =
    list.find((item) => norm(item[nameKey]) === wanted) ?? list.find((item) => norm(item.id) === wanted);
  if (hit) return hit.id;
  warnings.push(`${label} "${asString(value)}" does not exist in this project, reference left empty`);
  return null;
};

export const refName = (id, list, nameKey) => {
  if (id == null) return null;
  const hit = list.find((item) => item.id === id);
  return hit ? hit[nameKey] || null : null;
};

/* ---- codec factory ---- */

const cleanBody = (raw) => raw.replace(/^\n+/, "").replace(/\s+$/, "");

const extraOf = (item, known) =>
  Object.fromEntries(Object.entries(item.extra ?? {}).filter(([key]) => !known.has(key)));

/**
 * @param {object} spec
 * @param {string[]} spec.knownKeys  frontmatter keys this type owns (order = write order)
 * @param {(data, body, env) => object} spec.parse  env: { fallbackId, fallbackTitle, ctx, warnings }
 * @param {(item, ctx) => object} spec.toFields  ordered known fields from an item
 * @param {(item) => string} spec.bodyOf
 */
export const makeCodec = ({ knownKeys, parse, toFields, bodyOf }) => {
  const known = new Set(knownKeys);

  const fromFile = (text, { fallbackId, fallbackTitle, projectContext } = {}) => {
    const parsed = parseFrontmatter(text);
    if (!parsed.ok) return { ok: false, error: parsed.error, item: null, warnings: [] };
    const warnings = [];
    const ctx = projectContext ?? EMPTY_CONTEXT;
    const extra = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => !known.has(key)));
    const item = {
      ...parse(parsed.data, cleanBody(parsed.body), {
        fallbackId: fallbackId || uid(),
        fallbackTitle,
        ctx,
        warnings,
      }),
      extra,
    };
    return { ok: true, item, warnings };
  };

  const allFields = (item, ctx) => ({ ...toFields(item, ctx), ...extraOf(item, known) });
  const bodyText = (item) => cleanBody(String(bodyOf(item) ?? ""));

  /**
   * `source` is the text last read from disk. With it only changed keys are
   * rewritten, so comments and hand formatting survive. A source that does not
   * parse is ignored here; the vault adapter refuses to write over such files.
   */
  const toFile = (item, projectContext, { source } = {}) => {
    const ctx = projectContext ?? EMPTY_CONTEXT;
    const fields = allFields(item, ctx);
    const body = bodyText(item);
    if (typeof source !== "string") return stringifyFile(fields, body);
    const base = fromFile(source, { fallbackId: item.id, fallbackTitle: item.title ?? item.question, projectContext: ctx });
    if (!base.ok) return stringifyFile(fields, body);
    return patchFile(source, {
      fields,
      baseFields: allFields(base.item, ctx),
      body,
      baseBody: bodyText(base.item),
    });
  };

  return { fromFile, toFile };
};
