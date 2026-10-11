import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions.js';

/**
 * Syntax the editor cannot keep intact yet. A note that contains one opens in source mode.
 * Data-driven on purpose: when a feature lands, delete its entry here and add the fixture to that
 * feature's tests. Tables, callouts, task statuses, reference links and entities landed in stage 2, so the
 * list is empty; anything else that would change on save is still caught by the content fingerprint below.
 */
export const DANGEROUS_PATTERNS = [];

const FENCE_LINE = /^[ \t]*(`{3,}|~{3,})/;
const INLINE_CODE = /(`+)[^`\n]*?\1/g;

// Code round-trips untouched, so a table or callout inside a fence is not a problem.
const stripCode = (markdown) => {
  let fence = null;
  const kept = markdown.split('\n').filter((line) => {
    const match = FENCE_LINE.exec(line);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
      return false;
    }
    if (match) {
      fence = match[1];
      return false;
    }
    return true;
  });
  return kept.join('\n').replace(INLINE_CODE, '');
};

/** Syntax found in the original that cannot be kept (code is skipped: it round-trips). */
export const findDangerousSyntax = (markdown) => {
  const prose = stripCode(markdown);
  return DANGEROUS_PATTERNS.filter(({ test }) => test.test(prose)).map(({ id, label }) => ({ id, label }));
};

// Text that only appears when the editor escaped something it did not understand. Harmless
// escapes like `array\[0\]` are not listed; these are, but only count if the original lacks them.
const ESCAPE_TELLS = ['\\[\\[', '\\[^', '\\[!', '&lt;', '&gt;', '&amp;', '\\\\'];

const LINK_TITLE = /\]\(([^)\s]+)\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\)/g;
// An empty item (`1.` alone on its line) is saved as `1. `, so the marker may end the line.
const BARE_URL_LINK = /\[(https?:\/\/[^\]\s]+)\]\(<?https?:\/\/[^)\s]*>?\)/g;
const ORDERED_MARKER = /^[ \t>]*\d+[.)](?:[ \t]+|$)/gm;
// Characters the editor rewrites without changing meaning: list and emphasis markers (- + * _),
// heading and quote marks (# >), code and rule marks (` ~ =), autolink brackets (<>), escapes (\),
// all whitespace. What is left is the text, links, brackets and punctuation of the note.
const SAFE_REWRITE_CHARS = /[\s\\*_\-+#>`~=<]/g;

/**
 * Both sides reduced to the characters that carry content, so only a real loss or change shows:
 * deleted images, entity-escaped HTML, mangled text. Rewrites that are harmless in Obsidian
 * (bullet marker, `__x__`, `***`, `1)`, setext headings, blank lines, link titles, `<url>`) vanish.
 */
export const contentFingerprint = (markdown) => markdown
  .replace(/\r\n/g, '\n')
  // A bare URL may be saved as `[url](url)`: the same link and the same visible text.
  .replace(BARE_URL_LINK, '$1')
  .replace(LINK_TITLE, ']($1)')
  .replace(/%20/g, '')
  .replace(ORDERED_MARKER, '')
  .replace(SAFE_REWRITE_CHARS, '');

/**
 * Markdown through the same parse and serialize path as the first keystroke, headless. Plain:
 * the original text of untouched blocks is not reused, because this measures what the editor
 * can represent, which decides what an edit to a block may do to it.
 */
export const roundTripMarkdown = (markdown) => {
  const editor = new Editor({ element: document.createElement('div'), content: markdown, extensions: createExtensions() });
  editor.storage.sourceFormat.plain = true;
  try {
    return editor.storage.markdown.getMarkdown();
  } finally {
    editor.destroy();
  }
};

const MEMO_LIMIT = 40;
const memo = new Map();

const evaluate = (markdown) => {
  const reasons = findDangerousSyntax(markdown);
  let output = null;
  try {
    output = roundTripMarkdown(markdown);
  } catch {
    return { safe: false, reasons: [...reasons, { id: 'parse-error', label: 'syntax the editor failed to read' }] };
  }
  const escapedTell = ESCAPE_TELLS.some((tell) => output.includes(tell) && !markdown.includes(tell));
  if (escapedTell || contentFingerprint(output) !== contentFingerprint(markdown)) {
    reasons.push({ id: 'content-changed', label: 'syntax that would change on save' });
  }
  return { safe: reasons.length === 0, reasons };
};

/**
 * Is it safe to let the rich editor save this note? Memoized per note id and content, so a note
 * is checked once per version. Returns `{ safe, reasons: [{ id, label }] }`.
 */
export const checkRoundTrip = (markdown, { id = '' } = {}) => {
  const source = String(markdown ?? '');
  const key = `${id}\u0000${source}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const result = evaluate(source);
  if (memo.size >= MEMO_LIMIT) memo.delete(memo.keys().next().value);
  memo.set(key, result);
  return result;
};

export const roundTripSafe = (markdown, options) => checkRoundTrip(markdown, options).safe;
