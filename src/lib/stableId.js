// @maia:ids — deterministic id for a file with no id in its frontmatter, so a
// reload sees the same item instead of a brand new one. Same hash as
// opusFiles/opusFs.js stableId (kept separate: opusFs imports vault.js).
export const stableId = (path) => {
  let hash = 5381;
  for (let i = 0; i < path.length; i += 1) hash = ((hash << 5) + hash + path.charCodeAt(i)) >>> 0;
  return `f${hash.toString(36)}`;
};
