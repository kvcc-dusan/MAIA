// Maps the shared Graph controls onto 3d-force-graph forces. The 2D renderer
// uses pixels; these scale factors give the same feel in world units.

const DISTANCE_SCALE = 0.1;
const MIN_DISTANCE = 8;
const CHARGE_SCALE = 0.3;
const GRAVITY_SCALE = 0.08;

/** "Entanglement": a higher value pulls linked nodes closer, as in 2D. */
export const linkDistanceFor = (linkDistance) => Math.max(MIN_DISTANCE, (500 - linkDistance) * DISTANCE_SCALE);

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

/** Link width in world units from the Link thickness control (px). */
export const linkWidthFor = (thickness, thin) => (thin ? 0 : thickness * 0.14);
