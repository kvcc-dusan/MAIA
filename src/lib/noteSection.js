// Cuts the part of a note an embed points at: `![[Note#Heading]]` or `![[Note#^block-id]]`.
// Display only; the note itself is never changed.

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const sectionByHeading = (lines, wanted) => {
  // `Note#Parent#Child` points at the last part
  const name = wanted.split('#').pop();
  let inFence = false;
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (FENCE.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const match = HEADING.exec(lines[i]);
    if (!match) continue;
    if (start === -1) {
      if (sameText(match[2], name)) {
        start = i;
        level = match[1].length;
      }
    } else if (match[1].length <= level) {
      return lines.slice(start, i).join('\n').trimEnd();
    }
  }
  return start === -1 ? null : lines.slice(start).join('\n').trimEnd();
};

const sectionByBlockId = (lines, id) => {
  const marker = new RegExp(`\\s\\^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  const at = lines.findIndex((line) => marker.test(line));
  if (at === -1) return null;
  const isListItem = /^\s*(?:[-*+]|\d+[.)])\s/.test(lines[at]);
  let from = at;
  let to = at;
  if (!isListItem) {
    while (from > 0 && lines[from - 1].trim() !== '') from -= 1;
    while (to < lines.length - 1 && lines[to + 1].trim() !== '') to += 1;
  }
  return lines.slice(from, to + 1).join('\n').replace(marker, '');
};

/** The whole body for an empty subpath, else the matching part, else null (not found). */
export const extractSection = (content, subpath = '') => {
  const path = subpath.trim();
  if (!path) return content;
  const lines = content.split('\n');
  return path.startsWith('^') ? sectionByBlockId(lines, path.slice(1)) : sectionByHeading(lines, path);
};
