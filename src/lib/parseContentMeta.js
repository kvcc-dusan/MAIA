// src/lib/parseContentMeta.js
// Robust parser for tags and Obsidian-style wikilinks.
// Handles [[Title]], [[Title|alias]], [[Title#Section]], [[Title#Section|alias]].

/**
 * Parses content to extract tags and wikilinks.
 * @param {string} content - The raw content string.
 * @returns {{tags: string[], links: string[]}} Object containing extracted tags and links.
 */
export function parseContentMeta(content) {
  const src = (content || "").replace(/%%[\s\S]*?%%/g, ""); // strip Obsidian comments

  // ----- Tags -----
  const tags = Array.from(
    new Set(
      (src.match(/(^|\s)#([\w-]+)/g) || [])
        .map(t => t.trim().slice(1))
        .filter(Boolean)
    )
  );

  // ----- Wikilinks -----
  // Take the content before '|' (ignore aliases), before '#' (ignore headings/blocks), and trim.
  const links = Array.from(
    new Set(
      (src.match(/\[\[(.+?)\]\]/g) || [])
        .map(m => m.slice(2, -2))          // inner of [[...]]
        .map(s => s.split("|")[0])         // strip alias
        .map(s => s.split("#")[0])         // strip heading/block
        .map(s => s.trim())
        .filter(Boolean)
    )
  );

  return { tags, links };
}
