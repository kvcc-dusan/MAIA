// Colour grouping for the 3D graph. Groups are plain string keys; the palette
// maps a group's rank (biggest first) to a colour, so the largest folders get
// the most distinct hues.
import { shiftHue } from "./colorConvert.js";

export const ROOT_GROUP = "__root";
export const NO_TAG_GROUP = "__untagged";
export const OTHER_GROUP = "__other";
export const PROJECT_GROUP = "__project";
export const GHOST_GROUP = "__ghost";

const NEUTRAL_GROUPS = new Set([ROOT_GROUP, NO_TAG_GROUP, OTHER_GROUP, GHOST_GROUP]);
export const isNeutralGroup = (key) => NEUTRAL_GROUPS.has(key);
// Past this many tag groups the tail shares one colour, so the legend stays readable.
export const MAX_TAG_GROUPS = 12;

/** First path segment of a vault folder; notes in the vault root have none. */
export const topLevelFolder = (folder) => {
  if (typeof folder !== "string") return "";
  return folder.split("/").filter(Boolean)[0] || "";
};

const folderKey = (node) => {
  if (node.type === "project") return PROJECT_GROUP;
  if (node.type === "ghost") return GHOST_GROUP;
  return topLevelFolder(node.folder) || ROOT_GROUP;
};

/** Counts of each tag (case-insensitive, first spelling wins) over the note nodes. */
const tagCounts = (nodes) => {
  const counts = new Map();
  nodes.forEach((n) => {
    if (n.type !== "note") return;
    new Set((n.tags || []).map((t) => t.toLowerCase())).forEach((lower) => {
      const original = n.tags.find((t) => t.toLowerCase() === lower);
      const prev = counts.get(lower);
      counts.set(lower, { label: prev ? prev.label : original, count: (prev ? prev.count : 0) + 1 });
    });
  });
  return counts;
};

const labelFor = (key) => {
  if (key === ROOT_GROUP) return "Vault root";
  if (key === NO_TAG_GROUP) return "No tag";
  if (key === OTHER_GROUP) return "Other tags";
  if (key === PROJECT_GROUP) return "Projects";
  if (key === GHOST_GROUP) return "Missing notes";
  return key;
};

/**
 * @param {Array} nodes graph nodes ({id, type, folder, tags})
 * @param {"folder"|"tag"} colorBy
 * @returns {{ groupOf: Map<string,string>, groups: Array<{key,label,count,rank}> }}
 *   `rank` is the palette slot for coloured groups, -1 for neutral ones.
 */
export const assignGroups = (nodes, colorBy) => {
  const groupOf = new Map();
  let tagLabels = null;
  let topTags = null;

  if (colorBy === "tag") {
    const counts = tagCounts(nodes);
    const ordered = [...counts.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
    topTags = new Map(ordered.slice(0, MAX_TAG_GROUPS).map(([lower, v]) => [lower, v.label]));
    tagLabels = counts;
  }

  nodes.forEach((n) => {
    if (n.type === "project") return groupOf.set(n.id, PROJECT_GROUP);
    if (n.type === "ghost") return groupOf.set(n.id, GHOST_GROUP);
    if (colorBy !== "tag") return groupOf.set(n.id, folderKey(n));
    // A note takes its most common tag, so a tag's notes end up in one colour.
    const own = (n.tags || [])
      .map((t) => t.toLowerCase())
      .filter((lower) => tagLabels.has(lower))
      .sort((a, b) => tagLabels.get(b).count - tagLabels.get(a).count || a.localeCompare(b));
    if (own.length === 0) return groupOf.set(n.id, NO_TAG_GROUP);
    const top = own.find((lower) => topTags.has(lower));
    return groupOf.set(n.id, top ? topTags.get(top) : OTHER_GROUP);
  });

  const sizes = new Map();
  groupOf.forEach((key) => sizes.set(key, (sizes.get(key) || 0) + 1));
  const ordered = [...sizes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  let rank = 0;
  const groups = ordered.map(([key, count]) => ({
    key,
    label: labelFor(key),
    count,
    rank: isNeutralGroup(key) || key === PROJECT_GROUP ? -1 : rank++,
  }));
  return { groupOf, groups };
};

/**
 * `count` distinct colours from the theme's hues. The first colours are the
 * tokens as they are; further ones turn the hue and vary lightness so a vault
 * with many folders does not repeat a colour until it really runs out.
 */
export const buildPalette = (baseInts, count) => {
  if (baseInts.length === 0) return [];
  const steps = [0, 48, -48, 96, -96, 24];
  return Array.from({ length: count }, (_, i) => {
    const base = baseInts[i % baseInts.length];
    const round = Math.floor(i / baseInts.length);
    if (round === 0) return base;
    return shiftHue(base, steps[round % steps.length], round % 2 === 0 ? 0.06 : -0.06);
  });
};

/** group key to colour int, given the group list, palette and the neutral colours. */
export const colorsByGroup = (groups, palette, neutral, project) => {
  const map = new Map();
  groups.forEach((g) => {
    if (g.key === PROJECT_GROUP) map.set(g.key, project);
    else map.set(g.key, g.rank < 0 ? neutral : palette[g.rank] ?? neutral);
  });
  return map;
};
