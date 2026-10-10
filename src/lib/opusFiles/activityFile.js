// @maia:opusFiles - activity.jsonl codec. One compact JSON object per line,
// oldest first. Pure: no fs, so it is testable and the web bundle can import it.
import { ACTIVITY_CAP } from "../../features/Opus/lib/activityLog.js";

const isEntry = (v) => v != null && typeof v === "object" && !Array.isArray(v)
  && typeof v.at === "string" && typeof v.kind === "string";

/**
 * @returns {{ entries: object[], badLines: {line:number,text:string}[] }}
 * A line that is not a JSON object with `at` and `kind` goes to badLines; it
 * is never fatal and serializeActivity writes it back untouched.
 */
export const parseActivity = (text) => {
  const entries = [];
  const badLines = [];
  String(text ?? "").split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === "") return;
    try {
      const value = JSON.parse(raw);
      if (isEntry(value)) entries.push(value);
      else badLines.push({ line: index + 1, text: raw });
    } catch {
      badLines.push({ line: index + 1, text: raw });
    }
  });
  return { entries, badLines };
};

export const capEntries = (entries, cap = ACTIVITY_CAP) =>
  entries.length > cap ? entries.slice(entries.length - cap) : entries;

/**
 * Unparsable lines are kept at the top, in their original order: a hand-edited
 * note or a half-written line must survive our rewrites, and their original
 * position among the entries is not worth tracking.
 */
export const serializeActivity = (entries, badLines = []) => {
  const lines = [...badLines.map((b) => b.text), ...capEntries(entries).map((e) => JSON.stringify(e))];
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
};
