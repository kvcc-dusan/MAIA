// Maps the shared Graph controls onto 3d-force-graph forces. The 2D renderer
// uses pixels; these scale factors give the same feel in world units.

import { folderChain } from "./folderGroups.js";

const DISTANCE_SCALE = 0.1;
const MIN_DISTANCE = 8;
const CHARGE_SCALE = 0.3;
const GRAVITY_SCALE = 0.08;

/** "Entanglement": a higher value pulls linked nodes closer, as in 2D. */
export const linkDistanceFor = (linkDistance) => Math.max(MIN_DISTANCE, (500 - linkDistance) * DISTANCE_SCALE);

// 3D only. The shared slider (10 to 500) barely moved the 3D layout with the 2D mapping: repulsion keeps
// links near 42 world units however short the target is. Stretching the target distance on a log scale gives
// about 12x between the slider ends (measured: mean link 488 at 10, 62 at 100, 42 at 500). The default
// (100) keeps its old 40 so the layout people have now does not move.
const LINK_VALUE_MIN = 10;
const LINK_VALUE_DEFAULT = 100;
const LINK_VALUE_MAX = 500;
const LINK_DISTANCE_3D = { loosest: 500, atDefault: 40, tightest: 1 };

/** "Entanglement" in 3D: same direction as 2D (higher pulls closer) on a much wider, log-shaped scale. */
export const linkDistanceFor3d = (linkDistance) => {
  const value = Math.min(LINK_VALUE_MAX, Math.max(LINK_VALUE_MIN, linkDistance));
  const { loosest, atDefault, tightest } = LINK_DISTANCE_3D;
  const [from, to, t] = value <= LINK_VALUE_DEFAULT
    ? [loosest, atDefault, (value - LINK_VALUE_MIN) / (LINK_VALUE_DEFAULT - LINK_VALUE_MIN)]
    : [atDefault, tightest, (value - LINK_VALUE_DEFAULT) / (LINK_VALUE_MAX - LINK_VALUE_DEFAULT)];
  return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * t);
};

/** "Entropy": how hard nodes push each other away. */
export const chargeFor = (repelForce) => -repelForce * CHARGE_SCALE;

/** Centre pull, inverse to Entropy exactly like the 2D gravity. */
export const gravityFor = (repelForce) => {
  const normalized = Math.min(1, Math.max(0, repelForce / 800));
  return (0.05 + (1 - normalized) * 0.95) * GRAVITY_SCALE;
};

/** d3 force that pulls every node toward the origin; also used as the 'center' force. */
export const createGravityForce = (strength = 0) => {
  let nodes = [];
  let k = strength;
  const force = (alpha) => {
    for (const n of nodes) {
      n.vx -= (n.x || 0) * k * alpha;
      n.vy -= (n.y || 0) * k * alpha;
      if (n.vz !== undefined) n.vz -= (n.z || 0) * k * alpha;
    }
  };
  force.initialize = (list) => { nodes = list; };
  force.strength = (value) => {
    if (value === undefined) return k;
    k = value;
    return force;
  };
  return force;
};

// Up to this slider value a cylinder is under a pixel wide at normal viewing distance anyway, so plain
// lines look the same and cost less (no tube geometry, no lighting, cheaper raycasts).
const LINE_MAX_THICKNESS = 1.5;

/** Link width in world units from the Link thickness control (px); 0 means a plain line. */
export const linkWidthFor = (thickness, thin) => (thin || thickness <= LINE_MAX_THICKNESS ? 0 : thickness * 0.14);

// Each level up the folder tree pulls half as hard, so sub-folders clump inside their parent.
const FOLDER_LEVEL_FALLOFF = 0.5;
// "Group pull" slider (0 to 100) -> pull toward the own folder's centroid. Linear, 0 is exactly no pull.
// Measured on a 270-note sample with a 64-note folder (group diameter / graph radius): 0 gives 1.44,
// 20 (0.12) gives 0.95, 100 (0.6) gives 0.64, tighter than the old fixed 0.4 (0.72).
export const GROUP_PULL_MIN = 0;
export const GROUP_PULL_MAX = 100;
export const GROUP_PULL_DEFAULT = 20;
const FOLDER_STRENGTH_MAX = 0.6;

export const folderStrengthFor = (pull) => {
  const clamped = Math.min(GROUP_PULL_MAX, Math.max(GROUP_PULL_MIN, Number.isFinite(pull) ? pull : GROUP_PULL_DEFAULT));
  return (clamped / GROUP_PULL_MAX) * FOLDER_STRENGTH_MAX;
};

/**
 * d3 force pulling each note toward the live centroid of its folder, then (weaker) of each ancestor folder.
 * Centroids are rebuilt once per tick: O(n * depth). Root notes and groups of one are left alone.
 */
export const createFolderForce = (strength = folderStrengthFor(GROUP_PULL_DEFAULT)) => {
  let nodes = [];
  let k = strength;
  let chains = []; // per node: group indices, own folder first
  let groupCount = 0;
  let sx = new Float64Array(0);
  let sy = new Float64Array(0);
  let sz = new Float64Array(0);
  let size = new Int32Array(0);

  const rebuild = () => {
    const index = new Map();
    chains = nodes.map((n) => folderChain(n.folder).map((path) => {
      if (!index.has(path)) index.set(path, index.size);
      return index.get(path);
    }));
    groupCount = index.size;
    sx = new Float64Array(groupCount);
    sy = new Float64Array(groupCount);
    sz = new Float64Array(groupCount);
    size = new Int32Array(groupCount);
  };

  const force = (alpha) => {
    if (k === 0 || groupCount === 0) return;
    sx.fill(0);
    sy.fill(0);
    sz.fill(0);
    size.fill(0);
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const chain = chains[i];
      for (let c = 0; c < chain.length; c += 1) {
        const g = chain[c];
        sx[g] += n.x || 0;
        sy[g] += n.y || 0;
        sz[g] += n.z || 0;
        size[g] += 1;
      }
    }
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const chain = chains[i];
      let weight = k * alpha;
      for (let c = 0; c < chain.length; c += 1, weight *= FOLDER_LEVEL_FALLOFF) {
        const g = chain[c];
        if (size[g] < 2) continue;
        n.vx += (sx[g] / size[g] - (n.x || 0)) * weight;
        n.vy += (sy[g] / size[g] - (n.y || 0)) * weight;
        if (n.vz !== undefined) n.vz += (sz[g] / size[g] - (n.z || 0)) * weight;
      }
    }
  };
  force.initialize = (list) => {
    nodes = list;
    rebuild();
  };
  force.strength = (value) => {
    if (value === undefined) return k;
    k = value;
    return force;
  };
  return force;
};
