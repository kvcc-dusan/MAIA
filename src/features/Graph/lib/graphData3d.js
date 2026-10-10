// Pure data helpers for the 3D renderer. GraphPage owns the node/link
// pipeline; this module only reshapes its output for 3d-force-graph.

const BASE_RADIUS = 1.7;
const PROJECT_RADIUS = 5;
const MIN_RADIUS = 1.5;
const DEGREE_GROWTH = 0.85;
export const DIM_OPACITY = 0.12;

const endId = (end) => (end !== null && typeof end === "object" ? end.id : end);

/** Radius in world units: grows with the square root of the link count, times the Node size control. */
export const nodeRadius = (node, degree, nodeSize = 1) => {
  const base = node.type === "project" ? PROJECT_RADIUS : BASE_RADIUS + Math.sqrt(degree) * DEGREE_GROWTH;
  return Math.max(MIN_RADIUS, base * nodeSize);
};

const nodeSignature = (node, degree) =>
  [node.title, node.type, node.group ?? "", node.isHot ? 1 : 0, node.realId ?? "", degree, (node.tags || []).join("\u0001")].join("\u0000");

/**
 * Maps GraphPage nodes/links to 3d-force-graph data.
 * - Links to unknown nodes and duplicate or self links are dropped.
 * - A node whose visible data is unchanged keeps the previous object, so its
 *   position and its three.js object survive a data refresh.
 * - Links are always fresh objects: the library rewrites source/target on them.
 * @returns {{ nodes: object[], links: object[], degrees: Map<string, number> }}
 */
export const buildGraphData = (nodes, links, previous = null) => {
  const known = new Set(nodes.map((n) => n.id));
  const seen = new Set();
  const cleanLinks = [];
  const degrees = new Map();
  links.forEach((l) => {
    const source = endId(l.source);
    const target = endId(l.target);
    if (source === target || !known.has(source) || !known.has(target)) return;
    const key = source < target ? `${source}\u0000${target}` : `${target}\u0000${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    cleanLinks.push({ source, target });
    degrees.set(source, (degrees.get(source) || 0) + 1);
    degrees.set(target, (degrees.get(target) || 0) + 1);
  });

  const before = new Map((previous?.nodes || []).map((n) => [n.id, n]));
  const mapped = nodes.map((n) => {
    const degree = degrees.get(n.id) || 0;
    const sig = nodeSignature(n, degree);
    const old = before.get(n.id);
    if (old && old.__sig === sig) return old;
    return {
      id: n.id,
      title: n.title,
      type: n.type,
      realId: n.realId,
      tags: n.tags || [],
      folder: n.folder || "",
      group: n.group,
      isHot: !!n.isHot,
      degree,
      __sig: sig,
      // Seed from the old position so a rebuilt node does not jump.
      ...(old ? { x: old.x, y: old.y, z: old.z } : {}),
    };
  });
  return { nodes: mapped, links: cleanLinks, degrees };
};

/** id -> Set of neighbour ids. Link ends may be ids or (after the engine ran) node objects. */
export const buildAdjacency = (links) => {
  const adjacency = new Map();
  const add = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };
  links.forEach((l) => {
    const a = endId(l.source);
    const b = endId(l.target);
    add(a, b);
    add(b, a);
  });
  return adjacency;
};

/** Same match rule as the 2D renderer: substring of the title or of any tag. */
export const matchNodes = (nodes, query) => {
  const q = (query || "").toLowerCase().trim();
  if (!q) return null;
  const ids = new Set();
  nodes.forEach((n) => {
    if ((n.title || "").toLowerCase().includes(q) || (n.tags || []).some((t) => t.toLowerCase().includes(q))) ids.add(n.id);
  });
  return ids;
};

/**
 * What stays lit while something is emphasised. Hover wins over search, search
 * over the cluster filter. `lit` is null when nothing is emphasised.
 */
export const computeFocus = ({ hoverId, adjacency, matchIds, clusterIds }) => {
  if (hoverId) {
    const lit = new Set(adjacency.get(hoverId) || []);
    lit.add(hoverId);
    return { kind: "hover", lit, hoverId };
  }
  if (matchIds) return { kind: "search", lit: matchIds, hoverId: null };
  if (clusterIds) return { kind: "cluster", lit: clusterIds, hoverId: null };
  return { kind: "none", lit: null, hoverId: null };
};

export const isLit = (focus, id) => focus.lit === null || focus.lit.has(id);

/** Ids of the nodes in the given findClusters index, or null for no cluster filter. */
export const clusterMembers = (nodes, activeCluster) => {
  if (activeCluster === null || activeCluster === undefined) return null;
  return new Set(nodes.filter((n) => n.group === activeCluster).map((n) => n.id));
};

/** Camera position `distance` away from the node, on the side facing away from the origin. */
export const flyTarget = (node, distance) => {
  const { x = 0, y = 0, z = 0 } = node;
  const len = Math.hypot(x, y, z);
  if (len < 1e-6) return { x, y, z: z + distance };
  const k = 1 + distance / len;
  return { x: x * k, y: y * k, z: z * k };
};

const HEAVY_NODE_COUNT = 2000;

/** Cost tiers: above 2000 nodes the glow goes and everything gets cheaper. */
export const qualityTier = (nodeCount, devicePixelRatio = 1) => {
  const heavy = nodeCount > HEAVY_NODE_COUNT;
  return {
    heavy,
    glow: !heavy,
    sphereSegments: heavy ? 6 : 14,
    pixelRatio: heavy ? 1 : Math.min(2, Math.max(1, devicePixelRatio)),
    maxLabels: heavy ? 150 : 400,
    thinLinks: heavy,
  };
};

// Stable per-link angle so curved links fan out in all directions instead of
// bending the same way in one plane.
export const linkRotation = (link) => {
  const text = `${endId(link.source)}|${endId(link.target)}`;
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return (h % 628) / 100;
};

const OUTLIER_QUANTILE = 0.95;
const FIT_MARGIN = 1.2;

/** Centre and a robust radius (ignores the furthest 5%, so drifting orphans do not shrink the view). */
export const boundingSphere = (nodes) => {
  const placed = nodes.filter((n) => Number.isFinite(n.x));
  if (placed.length === 0) return { center: { x: 0, y: 0, z: 0 }, radius: 50 };
  const sum = placed.reduce((a, n) => ({ x: a.x + n.x, y: a.y + (n.y || 0), z: a.z + (n.z || 0) }), { x: 0, y: 0, z: 0 });
  const center = { x: sum.x / placed.length, y: sum.y / placed.length, z: sum.z / placed.length };
  const dists = placed.map((n) => Math.hypot(n.x - center.x, (n.y || 0) - center.y, (n.z || 0) - center.z)).sort((a, b) => a - b);
  const radius = dists[Math.min(dists.length - 1, Math.floor(dists.length * OUTLIER_QUANTILE))];
  return { center, radius: Math.max(radius, 10) };
};

/** Camera distance at which a sphere of `radius` fits the narrower field of view, with a margin. */
export const fitDistance = (radius, fovDeg = 50, aspect = 1) => {
  const vertical = (fovDeg * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return (radius * FIT_MARGIN) / Math.sin(Math.min(vertical, horizontal) / 2);
};
