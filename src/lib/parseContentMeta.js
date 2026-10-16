// src/lib/parseContentMeta.js
// Robust parser for tags and Obsidian-style wikilinks.
// Handles [[Title]], [[Title|alias]], [[Title#Section]], [[Title#Section|alias]].
// Tags are read from prose only: code, comments and URLs are blanked out before matching.

const MASK_CHAR = "\u0000"; // not whitespace and not a tag char, so a `#` right after masked text is not a tag

const FENCE_OPEN_RE = /^\s*(?:(`{3,})(?=[^`]*$)|(~{3,}))/; // backtick info strings cannot contain backticks
const FENCE_CLOSE_RE = /^\s*(`{3,}|~{3,})\s*$/;
const INDENTED_RE = /^( {4,}|\t)/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s/;
const BLANK_RE = /^\s*$/;

const INLINE_CODE_RE = /(`+)((?:(?!\n[ \t]*\n)[\s\S])*?)(?<!`)\1(?!`)/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?(?:-->|$)/g;
const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;
const URL_RE = /\b[a-z][a-z\d+.-]*:\/\/\S+|\bwww\.\S+/gi;
const TAG_RE = /(?<=^|\s)#([\p{L}\p{M}\p{N}_/-]+)/gu;

const blank = (text) => text.replace(/[^\n]/g, MASK_CHAR);

// Fenced blocks and indented code are line-based, so they are handled line by line.
// Indented code cannot interrupt a paragraph and does not apply inside list items.
const maskBlockCode = (text) => {
  let fence = null;
  let inList = false;
  let canStartIndentedCode = true;

  return text.split("\n").map((line) => {
    if (fence) {
      const close = line.match(FENCE_CLOSE_RE);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return blank(line);
    }

    const open = line.match(FENCE_OPEN_RE);
    if (open) {
      fence = open[1] || open[2];
      return blank(line);
    }

    if (BLANK_RE.test(line)) {
      canStartIndentedCode = true;
      return line;
    }

    if (INDENTED_RE.test(line) && canStartIndentedCode && !inList) return blank(line);

    if (!/^\s/.test(line)) inList = LIST_ITEM_RE.test(line);
    canStartIndentedCode = false;
    return line;
  }).join("\n");
};

const maskNonProse = (content) => maskBlockCode(content)
  .replace(INLINE_CODE_RE, (match) => blank(match))
  .replace(HTML_COMMENT_RE, (match) => blank(match))
  .replace(OBSIDIAN_COMMENT_RE, (match) => blank(match))
  .replace(URL_RE, (match) => blank(match));

const extractTags = (content) => {
  const names = Array.from(maskNonProse(content).matchAll(TAG_RE), (match) => match[1]);
  return Array.from(new Set(names.filter((name) => /\D/.test(name)))); // Obsidian needs one non-numeric char
};

/**
 * Distinct wikilink targets of a note body: alias and heading dropped, trimmed, case kept.
 * A link to a heading of the same note (`[[#Heading]]`) has no target and is left out.
 */
export const extractLinkTargets = (content) => {
  const src = (content || "").replace(/%%[\s\S]*?%%/g, ""); // strip Obsidian comments
  return Array.from(
    new Set(
      (src.match(/\[\[(.+?)\]\]/g) || [])
        .map(m => m.slice(2, -2))          // inner of [[...]]
        .map(s => s.split("|")[0])         // strip alias
        .map(s => s.split("#")[0])         // strip heading/block
        .map(s => s.trim())
        .filter(Boolean)
    )
  );
};

export function parseContentMeta(content) {
  return { tags: extractTags(content || ""), links: extractLinkTargets(content) };
}
